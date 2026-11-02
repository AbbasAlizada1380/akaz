import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

// ── Shamsi DatePicker (same convention as AddSalaryList.jsx) ──
import DatePickerRaw from "react-multi-date-picker";
import persianRaw from "react-date-object/calendars/persian";
import persian_faRaw from "react-date-object/locales/persian_fa";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js"; // adjust path

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Vite CJS/ESM interop */
const unwrap = (mod) => (mod && mod.default ? mod.default : mod);
const DatePicker = unwrap(DatePickerRaw);
const persian = unwrap(persianRaw);
const persian_fa = unwrap(persian_faRaw);

/* ✅ Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatters — display only */
const formatShamsiDots = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY.jMM.jDD");
  } catch {
    return "";
  }
};

const formatShamsiLong = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jDD jMMMM jYYYY");
  } catch {
    return "";
  }
};

/* ✅ Gregorian formatter — for backend storage */
const formatGregorianDots = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("YYYY.MM.DD");
  } catch {
    return "";
  }
};

const DebtReport = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  /* Kept as Gregorian "YYYY.MM.DD" for the backend — Shamsi for display */
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  /* DateObject range for the picker UI */
  const [dateRange, setDateRange] = useState([null, null]);
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

  const handleRangeChange = (range) => {
    setDateRange(range || [null, null]);
    const [start, end] = range || [null, null];
    const startJs = toJSDate(start);
    const endJs = toJSDate(end);
    setStartDate(startJs ? formatGregorianDots(startJs) : "");
    setEndDate(endJs ? formatGregorianDots(endJs) : "");
  };

  const toJSDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === "function") return d.toDate();
    if (d instanceof Date) return d;
    return null;
  };

  const startShamsi = startDate
    ? moment(startDate, "YYYY.MM.DD", true).isValid()
      ? moment(startDate, "YYYY.MM.DD", true).format("jYYYY/jMM/jDD")
      : ""
    : "";

  const endShamsi = endDate
    ? moment(endDate, "YYYY.MM.DD", true).isValid()
      ? moment(endDate, "YYYY.MM.DD", true).format("jYYYY/jMM/jDD")
      : ""
    : "";

  const getDebtorName = (debt) => {
    if (debt.debtStaff?.name) return debt.debtStaff.name;
    if (debt.debtNonStaff?.name) return debt.debtNonStaff.name;
    return "-";
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setLoading(true);
    try {
      let debts = [];
      let deptName = "All Departments";
      let response;

      const params = {
        startDate, // Gregorian "YYYY.MM.DD"
        endDate,
        page: 1,
        limit: 10000,
      };
      if (selectedDeptId !== "all") {
        params.departmentId = parseInt(selectedDeptId);
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        deptName = dept?.name || "";
      }

      response = await axios.get(`${BASE_URL}/debts/report`, { params });
      debts = response.data.data || [];
      const summary = response.data.summary || {};

      if (!debts || debts.length === 0) {
        alert("No debts found in this date range");
        return;
      }

      /* ---------------- PDF — PORTRAIT A4 ---------------- */
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      /* Title */
      doc.setFontSize(14);
      const title = `Debt Report – ${deptName} | ${startShamsi} to ${endShamsi}`;
      doc.text(title, pageWidth - 40, currentY, { align: "right" });
      currentY += 20;

      /* Summary rows */
      doc.setFontSize(11);
      doc.text(
        `Total debts: ${summary.totalDebts || debts.length}`,
        pageWidth - 40,
        currentY,
        { align: "right" }
      );
      currentY += 18;
      doc.text(
        `Total debt amount: ${(summary.totalDebtAmount || 0).toLocaleString(
          "en-US"
        )} AFN`,
        pageWidth - 40,
        currentY,
        { align: "right" }
      );
      currentY += 18;
      doc.text(
        `Total paid: ${(summary.totalPaid || 0).toLocaleString(
          "en-US"
        )} AFN`,
        pageWidth - 40,
        currentY,
        { align: "right" }
      );
      currentY += 18;
      doc.text(
        `Total remaining: ${(summary.totalRemaining || 0).toLocaleString(
          "en-US"
        )} AFN`,
        pageWidth - 40,
        currentY,
        { align: "right" }
      );
      currentY += 28;

      /* Table headers — English */
      const headers = [
        [
          "ID",
          "Debtor",
          "Purpose",
          "Total",
          "Paid",
          "Remaining",
          "Created",
          "Status",
        ],
      ];

      const rows = debts.map((d) => {
        const totalAmount = parseFloat(d.amount || 0);
        const paid =
          d.paidAmount || totalAmount - parseFloat(d.remainingAmount || 0);
        const remaining = parseFloat(d.remainingAmount || 0);
        return [
          d.id,
          getDebtorName(d),
          d.purpose || "-",
          totalAmount.toLocaleString("en-US"),
          paid.toLocaleString("en-US"),
          remaining.toLocaleString("en-US"),
          d.createdAt
            ? moment(d.createdAt).format("jYYYY/jMM/jDD")
            : "-",
          d.isActive ? "Active (Unpaid)" : "Settled",
        ];
      });

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: currentY,
        styles: { font: "Vazirmatn", halign: "center", fontSize: 8 },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          halign: "center",
          fillColor: [200, 200, 200],
          textColor: 20,
        },
        theme: "grid",
        didParseCell: (data) => {
          data.cell.styles.font = "Vazirmatn";
          if (data.section === "head") {
            data.cell.styles.fontStyle = "normal";
            data.cell.styles.halign = "center";
          }
        },
      });

      /* Signature line */
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(11);
      doc.text("Signature & Stamp:", pageWidth - 40, finalY, {
        align: "right",
      });
      doc.line(pageWidth - 160, finalY + 2, pageWidth - 40, finalY + 2);

      /* Page numbers */
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `${i} / ${pageCount}`,
          pageWidth - 40,
          doc.internal.pageSize.getHeight() - 20,
          { align: "right" }
        );
      }

      /* File name */
      const fileName = `Debt_Report_${deptName}_${startShamsi.replace(
        /\//g,
        "-"
      )}_to_${endShamsi.replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error downloading debt report:", err);
      alert(err.response?.data?.error || "Failed to fetch data!");
    } finally {
      setLoading(false);
    }
  };

  if (deptLoading) {
    return <div className="p-6 text-center">Loading departments...</div>;
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-lg font-bold mb-4">Download Debt Report</h3>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Department */}
        <div>
          <label className="block text-sm mb-1">Department</label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Shamsi Date Range Picker */}
        <div>
          <label className="block text-sm mb-1">Date Range (Shamsi)</label>
          <DatePicker
            range
            value={dateRange}
            onChange={handleRangeChange}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            format="YYYY/MM/DD"
            editable={false}
            inputClass="border rounded px-3 py-2 bg-white cursor-pointer outline-none min-w-[240px]"
            placeholder="Select a date range"
          />
          {(startShamsi || endShamsi) && (
            <p className="mt-1 text-xs text-gray-500">
              {startShamsi && endShamsi
                ? `${startShamsi} to ${endShamsi}`
                : startShamsi || endShamsi}
            </p>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? "Downloading..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
};

export default DebtReport;