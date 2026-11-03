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

const BenefitReportDownload = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  
  // Keep Gregorian strings for the backend
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // DateObjects for the UI
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deptLoading, setDeptLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/department/`);
        setDepartments(response.data.data || []);
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDepartments();
  }, []);

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

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      let benefits = [];
      let deptName = "All Departments";
      let response;

      if (selectedDeptId === "all") {
        response = await axios.get(`${BASE_URL}/benifit`, {
          params: {
            startDate,
            endDate,
            page: 1,
            limit: 10000,
          },
        });
        benefits = response.data.data;
      } else {
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        deptName = dept?.name || "";
        response = await axios.get(`${BASE_URL}/department/${selectedDeptId}/benefits`, {
          params: {
            startDate,
            endDate,
            page: 1,
            limit: 10000,
          },
        });
        benefits = response.data.data;
      }

      if (!benefits || benefits.length === 0) {
        alert("No benefits found in this date range");
        return;
      }

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      doc.setFontSize(14);
      /* ✅ Shamsi dates in title */
      const title = `Benefit Report - ${deptName} (${formatShamsi(startDate)} to ${formatShamsi(endDate)})`;
      doc.text(title, 550, 40, { align: "right" });

      const headers = [["ID", "Amount (AFN)", "Sell ID", "Department", "Created At"]];
      const data = benefits.map((benefit) => [
        benefit.id,
        benefit.amount.toLocaleString("en-US"),
        benefit.sellId,
        benefit.department?.name || "-",
        /* ✅ Shamsi dates in rows */
        formatShamsiLong(benefit.createdAt),
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 60,
        styles: { font: "Vazirmatn", halign: "center", fontSize: 10 },
        headStyles: { font: "Vazirmatn", fontStyle: "normal", halign: "center", fillColor: [200, 200, 200], textColor: 20 },
        theme: "grid",
        didParseCell: (data) => {
          data.cell.styles.font = "Vazirmatn";
          if (data.section === "head") {
            data.cell.styles.fontStyle = "normal";
            data.cell.styles.halign = "center";
          }
        },
      });

      const totalAmount = benefits.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(12);
      doc.text(`Total Amount: ${totalAmount.toLocaleString("en-US")} AFN`, 550, finalY, { align: "right" });
      doc.text("Signature & Stamp:", 550, finalY + 30, { align: "right" });
      doc.line(400, finalY + 32, 550, finalY + 32);

      /* ✅ Shamsi filename */
      doc.save(`Benefit_Report_${deptName}_${formatShamsiFilename(startDate)}_to_${formatShamsiFilename(endDate)}.pdf`);
    } catch (err) {
      console.error("Error downloading benefit report:", err);
      alert("Failed to fetch data!");
    } finally {
      setLoading(false);
    }
  };

  if (deptLoading) return <div className="p-6 text-center">Loading departments...</div>;

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-lg font-bold mb-4">Download Benefit Report</h3>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Department</label>
          <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <DatePicker
            value={fromDate}
            onChange={handleFromChange}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border rounded px-3 py-2 bg-white cursor-pointer"
            placeholder="Select Start Date"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <DatePicker
            value={toDate}
            onChange={handleToChange}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border rounded px-3 py-2 bg-white cursor-pointer"
            placeholder="Select End Date"
          />
        </div>
        <button onClick={handleDownload} disabled={loading} className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90 transition">
          {loading ? "Generating..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
};

export default BenefitReportDownload;