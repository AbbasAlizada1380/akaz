import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

// ── Shamsi DatePicker ──
import DatePickerRaw from "react-multi-date-picker";
import persianRaw from "react-date-object/calendars/persian";
import persian_faRaw from "react-date-object/locales/persian_fa";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Vite CJS/ESM interop */
const unwrap = (mod) => (mod && mod.default ? mod.default : mod);
const DatePicker = unwrap(DatePickerRaw);
const persian = unwrap(persianRaw);
const persian_fa = unwrap(persian_faRaw);

/* ✅ Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatters — display only */
const formatShamsi = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY/jMM/jDD");
  } catch {
    return "";
  }
};

const formatShamsiLong = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY/jMM/jDD HH:mm");
  } catch {
    return "";
  }
};

const formatShamsiFilename = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY-jMM-jDD");
  } catch {
    return "";
  }
};

/* ✅ Gregorian formatter — for backend storage */
const formatGregorian = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("YYYY-MM-DD");
  } catch {
    return "";
  }
};

const BenefitReport = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(""); // "" means all departments
  
  // Keep Gregorian strings for the backend
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // DateObjects for the UI
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      alert("Failed to load departments.");
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleFromChange = (date) => {
    setFromDate(date);
    const jsDate = date?.toDate ? date.toDate() : date;
    setStartDate(formatGregorian(jsDate));
  };

  const handleToChange = (date) => {
    setToDate(date);
    const jsDate = date?.toDate ? date.toDate() : date;
    setEndDate(formatGregorian(jsDate));
  };

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
    setFromDate(null);
    setToDate(null);
  };

  const handleDownload = async () => {
    // Validate date range (optional)
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", 10000); // fetch all records for PDF

      let url;
      let deptName = "All Departments";
      let response;

      if (selectedDeptId && selectedDeptId !== "") {
        // Specific department: use /department/:id/benefits
        url = `${BASE_URL}/department/${selectedDeptId}/benefits?${params.toString()}`;
        response = await axios.get(url);
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        if (dept) deptName = dept.name;
      } else {
        // All departments: use /department/report (getBenefitsWithFilters)
        url = `${BASE_URL}/department/report?${params.toString()}`;
        response = await axios.get(url);
        deptName = "All Departments";
      }

      // Extract benefits (both endpoints return { data: [...] })
      let benefits = [];
      if (response.data.data && Array.isArray(response.data.data)) {
        benefits = response.data.data;
      } else if (response.data.benefits && Array.isArray(response.data.benefits)) {
        benefits = response.data.benefits;
      } else {
        benefits = [];
      }

      if (benefits.length === 0) {
        alert("No benefits found for the selected criteria.");
        return;
      }

      const today = formatShamsi(new Date());

      // Prepare date range text for PDF
      let dateRangeText = "";
      if (startDate && endDate) {
        dateRangeText = ` (from ${formatShamsi(startDate)} to ${formatShamsi(endDate)})`;
      } else if (startDate) {
        dateRangeText = ` (from ${formatShamsi(startDate)})`;
      } else if (endDate) {
        dateRangeText = ` (until ${formatShamsi(endDate)})`;
      }

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false); // English (left‑to‑right) layout

      // Add Persian font
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      // Title
      doc.setFontSize(14);
      doc.text(
        `Benefit Report - ${deptName}${dateRangeText}`,
        40,
        40,
        { align: "left" }
      );

      // Table headers
      const headers = [["ID", "Amount (AFN)", "Sell ID", "Department", "Created At"]];

      // Table body
      const body = benefits.map((b) => [
        b.id,
        parseFloat(b.amount).toLocaleString("en-US"),
        b.sellId,
        b.department?.name || b.departmentName || "—",
        /* ✅ Shamsi row date */
        formatShamsiLong(b.createdAt),
      ]);

      autoTable(doc, {
        startY: 60,
        head: headers,
        body: body,
        theme: "grid",
        styles: {
          font: "Vazirmatn",
          fontSize: 10,
          halign: "center",
          valign: "middle",
          cellPadding: 8,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          fillColor: [70, 130, 180],
          textColor: [255, 255, 255],
          fontSize: 10,
          halign: "center",
        },
      });

      const finalY = doc.lastAutoTable.finalY + 30;
      const totalAmount = benefits.reduce((sum, b) => sum + parseFloat(b.amount), 0);

      doc.setFontSize(11);
      doc.text(`Total Benefits: ${benefits.length}`, 40, finalY, { align: "left" });
      doc.text(`Total Amount: ${totalAmount.toLocaleString("en-US")} AFN`, 40, finalY + 20, { align: "left" });
      /* ✅ Shamsi issued date */
      doc.text(`Report Generated: ${today}`, 40, finalY + 40, { align: "left" });

      // Create filename with date range and department info
      let fileNameSuffix = "";
      if (startDate && endDate) {
        fileNameSuffix = `${formatShamsiFilename(startDate)}_to_${formatShamsiFilename(endDate)}`;
      } else if (startDate) {
        fileNameSuffix = `from_${formatShamsiFilename(startDate)}`;
      } else if (endDate) {
        fileNameSuffix = `until_${formatShamsiFilename(endDate)}`;
      } else {
        fileNameSuffix = "all";
      }
      const safeDeptName = deptName.replace(/\s+/g, "_");
      doc.save(`Benefit_Report_${safeDeptName}_${fileNameSuffix}.pdf`);
    } catch (err) {
      console.error("Error downloading benefits:", err);
      alert("Failed to retrieve benefit data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        Department Benefit Report
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Department
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            disabled={loadingDepts}
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- All Departments --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} (ID: {dept.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date (optional)
          </label>
          <DatePicker
            value={fromDate}
            onChange={handleFromChange}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            format="YYYY/MM/DD"
            editable={false}
            inputClass="mt-1 w-full border p-2 rounded bg-white cursor-pointer"
            placeholder="Select Start Date"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date (optional)
          </label>
          <DatePicker
            value={toDate}
            onChange={handleToChange}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            format="YYYY/MM/DD"
            editable={false}
            inputClass="mt-1 w-full border p-2 rounded bg-white cursor-pointer"
            placeholder="Select End Date"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={clearDateRange}
          className="bg-gray-500 text-white px-6 py-2 rounded w-full sm:w-auto"
        >
          Clear Dates
        </button>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-primary text-black px-6 py-2 rounded disabled:bg-gray-400 w-full sm:w-auto"
        >
          {loading ? "Generating PDF..." : "Download Benefit Report"}
        </button>
      </div>
    </div>
  );
};

export default BenefitReport;