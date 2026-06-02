import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DepartmentDetailsDownload from "./report/DepartmentDetailsDownload";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000/api";

const Stakeholderpage = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch all departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/department`);
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch stats when department or dates change
  useEffect(() => {
    if (!selectedDept) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await axios.get(`${BASE_URL}/department/${selectedDept}/counts`, { params });
        if (res.status === 200) {
          setStats(res.data.data);
        } else {
          setError("Unexpected response from server.");
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to fetch department statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedDept, startDate, endDate]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (!stats) {
      alert("No data to export. Please select a department.");
      return;
    }

    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      const deptName = stats.departmentName;
      let dateRangeText = "All time";
      if (stats.dateRange !== "all") {
        const from = stats.dateRange.startDate || "Any";
        const to = stats.dateRange.endDate || "Any";
        dateRangeText = `${from} → ${to}`;
      }
      const title = `Department Financial Summary - ${deptName}`;
      doc.setFontSize(16);
      doc.text(title, doc.internal.pageSize.width / 2, 50, { align: "center" });

      doc.setFontSize(11);
      doc.text(`Date Range: ${dateRangeText}`, doc.internal.pageSize.width / 2, 75, { align: "center" });
      doc.text(`Generated on: ${moment().format("YYYY-MM-DD HH:mm:ss")}`, doc.internal.pageSize.width / 2, 95, { align: "center" });

      const tableData = [
        ["Category", "Total Amount", "Number of Records"],
        ["Withdrawals", formatCurrency(stats.amounts.withdraw), stats.counts.withdraw],
        ["Deposits", formatCurrency(stats.amounts.deposit), stats.counts.deposit],
        ["Realized Benefits", formatCurrency(stats.amounts.realizedBenefit), stats.counts.realizedBenefit],
        ["Inventory Value (Exist)", formatCurrency(stats.amounts.exist), stats.counts.exist],
        ["Pays", formatCurrency(stats.amounts.pays), stats.counts.pays],
        ["Grand Total", formatCurrency(stats.amounts.grandTotal), "-"],
      ];

      autoTable(doc, {
        startY: 120,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5, halign: "center" },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });

      const pageCount = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 30, { align: "right" });
      }

      const fileName = `department_${stats.departmentId}_${moment().format("YYYY-MM-DD")}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Excel Download
  const handleDownloadExcel = () => {
    if (!stats) {
      alert("No data to export. Please select a department.");
      return;
    }

    setDownloading(true);
    try {
      const summaryData = [
        ["Department Financial Summary"],
        ["Department Name", stats.departmentName],
        ["Department ID", stats.departmentId],
        ["Date Range", stats.dateRange === "all" ? "All time" : `${stats.dateRange.startDate || "Any"} → ${stats.dateRange.endDate || "Any"}`],
        ["Generated On", moment().format("YYYY-MM-DD HH:mm:ss")],
        [],
        ["Category", "Total Amount (USD)", "Number of Records"],
        ["Withdrawals", stats.amounts.withdraw, stats.counts.withdraw],
        ["Deposits", stats.amounts.deposit, stats.counts.deposit],
        ["Realized Benefits", stats.amounts.realizedBenefit, stats.counts.realizedBenefit],
        ["Inventory Value (Exist)", stats.amounts.exist, stats.counts.exist],
        ["Pays", stats.amounts.pays, stats.counts.pays],
        ["Grand Total", stats.amounts.grandTotal, "-"],
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
      worksheet["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Department Summary");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, `department_summary_${stats.departmentId}_${moment().format("YYYY-MM-DD")}.xlsx`);
    } catch (err) {
      console.error("Excel generation error:", err);
      alert("Failed to generate Excel");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Department Financial Summary</h2>

      {/* Department Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Department
        </label>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
        >
          <option value="">-- Choose a department --</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Picker - Native HTML inputs */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-40"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="self-end px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Clear Dates
          </button>
        )}
      </div>

      {stats && !loading && !error && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-cyan-800 text-white px-5 py-2 rounded hover:bg-cyan-700 disabled:bg-gray-400 transition"
          >
            {downloading ? "Generating..." : "Download Summary PDF"}
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 transition"
          >
            {downloading ? "Generating..." : "Download Summary Excel"}
          </button>
          <DepartmentDetailsDownload
            departmentId={selectedDept}
            departmentName={stats.departmentName}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      )}

      {/* Loading / Error / Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading statistics...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {stats && !loading && !error && (
        <div className="mt-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Department:</span> {stats.departmentName} (ID: {stats.departmentId})
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Date Range:</span>{" "}
              {stats.dateRange === "all"
                ? "All time"
                : `${stats.dateRange.startDate || "Any"} → ${stats.dateRange.endDate || "Any"}`}
            </p>
          </div>

          {/* Withdraw Card */}
          <div className="bg-blue-50 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-blue-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-800">Withdrawals</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-800">{formatCurrency(stats.amounts.withdraw)}</div>
                <div className="text-sm text-blue-600">{stats.counts.withdraw} transactions</div>
              </div>
            </div>
          </div>

          {/* Deposit Card */}
          <div className="bg-green-50 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-green-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800">Deposits</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-800">{formatCurrency(stats.amounts.deposit)}</div>
                <div className="text-sm text-green-600">{stats.counts.deposit} transactions</div>
              </div>
            </div>
          </div>

          {/* Realized Benefit Card */}
          <div className="bg-purple-50 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-purple-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-purple-800">Realized Benefits</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-800">{formatCurrency(stats.amounts.realizedBenefit)}</div>
                <div className="text-sm text-purple-600">{stats.counts.realizedBenefit} records</div>
              </div>
            </div>
          </div>

          {/* Inventory Value (Exist) Card */}
          <div className="bg-yellow-50 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-yellow-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-yellow-800">Inventory Value</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-800">{formatCurrency(stats.amounts.exist)}</div>
                <div className="text-sm text-yellow-600">{stats.counts.exist} stock items</div>
              </div>
            </div>
          </div>

          {/* Pays Card */}
          <div className="bg-indigo-50 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-indigo-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-indigo-800">Pays (Incoming)</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-800">{formatCurrency(stats.amounts.pays)}</div>
                <div className="text-sm text-indigo-600">{stats.counts.pays} payments</div>
              </div>
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-5 shadow-lg mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-white">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Grand Total</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.amounts.grandTotal)}</div>
                <div className="text-sm text-white/80">Combined total</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stakeholderpage;