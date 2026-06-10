import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DepartmentDetailsDownload from "./report/DepartmentDetailsDownload";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000/api";

const Stakeholderpage = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showSellsDetails, setShowSellsDetails] = useState(false);
  const [showDepositsDetails, setShowDepositsDetails] = useState(false);
  const [showPaysDetails, setShowPaysDetails] = useState(false);
  const [showExpensesDetails, setShowExpensesDetails] = useState(false);
  const [showBenefitsDetails, setShowBenefitsDetails] = useState(false);
  const [showWithdrawsDetails, setShowWithdrawsDetails] = useState(false);
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);

  // Fetch departments based on user role
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!currentUser?.id) return;

      try {
        let res;
        if (currentUser.role === "admin") {
          res = await axios.get(`${BASE_URL}/department`);
          setDepartments(res.data.data || []);
        } else {
          res = await axios.get(`${BASE_URL}/department/user/${currentUser.id}/share`);
          setDepartments(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
        setError("Could not load departments. Please try again later.");
      }
    };

    fetchDepartments();
  }, [currentUser?.id, currentUser?.role]);

  // Fetch details when department or dates change
  useEffect(() => {
    if (!selectedDept) {
      setStats(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await axios.get(`${BASE_URL}/department/${selectedDept}/details`, { params });
        if (res.status === 200) {
          setStats(res.data.data);
        } else {
          setError("Unexpected response from server.");
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to fetch department details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selectedDept, startDate, endDate]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
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
      const title = `Department Financial Details - ${deptName}`;
      doc.setFontSize(16);
      doc.text(title, doc.internal.pageSize.width / 2, 50, { align: "center" });

      doc.setFontSize(11);
      doc.text(`Date Range: ${dateRangeText}`, doc.internal.pageSize.width / 2, 75, { align: "center" });
      doc.text(`Generated on: ${moment().format("YYYY-MM-DD HH:mm:ss")}`, doc.internal.pageSize.width / 2, 95, { align: "center" });

      const tableData = [
        ["Category", "Total Amount", "Number of Records"],
        ["💰 Withdrawals", formatCurrency(stats.totals.withdraws || 0), stats.withdraws?.length || 0],
        ["💵 Deposits", formatCurrency(stats.totals.deposits || 0), stats.deposits?.length || 0],
        ["📈 Realized Benefits", formatCurrency(stats.totals.realizedBenefits || 0), stats.realizedBenefits?.length || 0],
        ["📦 Inventory Value", formatCurrency(stats.totals.existingStock || 0), stats.existingStocks?.length || 0],
        ["💳 Pays (Incoming)", formatCurrency(stats.totals.pays || 0), stats.pays?.length || 0],
        ["📊 Expenses", formatCurrency(stats.totals.expenses || 0), stats.expenses?.length || 0],
        ["🛒 Sales Revenue", formatCurrency(stats.totals.totalSales || 0), stats.sells?.length || 0],
        ["💰 Sales Receipt (Collected)", formatCurrency(stats.totals.sellsReceipt || 0), "-"],
        ["💸 Sales Remaind (Pending)", formatCurrency(stats.totals.sellsRemaind || 0), "-"],
        ["👥 Staff Salaries", formatCurrency(stats.totals.attendance?.totalAmount || 0), stats.totals.attendance?.totalRecords || 0],
        ["💰 Salary Paid", formatCurrency(stats.totals.attendance?.totalReceipt || 0), "-"],
        ["💸 Salary Remaind", formatCurrency(stats.totals.attendance?.totalRemaind || 0), "-"],
        ["📥 Total Incoming", formatCurrency(stats.totals.totalIncoming || 0), "-"],
        ["📤 Total Outgoing", formatCurrency(stats.totals.totalOutgoing || 0), "-"],
        ["💹 Net Cash Flow", formatCurrency(stats.totals.netCashFlow || 0), "-"],
        ["⚖️ GRAND TOTAL (Balance)", formatCurrency(stats.totals.grandTotal || 0), "-"],
      ];

      autoTable(doc, {
        startY: 120,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5, halign: "center" },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didDrawCell: (data) => {
          if (data.row.index === tableData.length - 2) {
            data.cell.styles.fillColor = [255, 215, 0];
            data.cell.styles.textColor = [0, 0, 0];
            data.cell.styles.fontStyle = "bold";
          }
        }
      });

      // Attendance Details
      if (stats.attendances && stats.attendances.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Staff Attendance & Salary Details", 40, 50, { align: "left" });
        
        const attendanceHeaders = [["ID", "Staff Name", "Father Name", "Salary", "Overtime", "Total", "Paid", "Remaind", "Date"]];
        const attendanceBody = stats.attendances.map(a => [
          a.id,
          a.staffName || "Unknown",
          a.staffFatherName || "",
          formatCurrency(a.salary),
          formatCurrency(a.overtime),
          formatCurrency(a.total),
          formatCurrency(a.receipt),
          formatCurrency(a.remaind),
          moment(a.createdAt).format("YYYY-MM-DD")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: attendanceHeaders,
          body: attendanceBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      // Deposits Details
      if (stats.deposits && stats.deposits.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Deposits Details", 40, 50, { align: "left" });
        
        const depositsHeaders = [["ID", "Amount", "Date"]];
        const depositsBody = stats.deposits.map(d => [
          d.id,
          formatCurrency(d.amount),
          moment(d.createdAt).format("YYYY-MM-DD HH:mm")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: depositsHeaders,
          body: depositsBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      // Pays Details
      if (stats.pays && stats.pays.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Pays Details (Incoming Payments)", 40, 50, { align: "left" });
        
        const paysHeaders = [["ID", "Amount", "Seller Name", "Description", "Date"]];
        const paysBody = stats.pays.map(p => [
          p.id,
          formatCurrency(p.amount),
          p.sellerName || "Unknown",
          p.description || "-",
          moment(p.createdAt).format("YYYY-MM-DD HH:mm")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: paysHeaders,
          body: paysBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      // Sells Details
      if (stats.sells && stats.sells.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Sells Details", 40, 50, { align: "left" });
        
        const sellsHeaders = [["ID", "Product", "Quantity", "Total", "Receipt", "Remaind", "Bill Number", "Date"]];
        const sellsBody = stats.sells.map(s => [
          s.id,
          s.productName || "Unknown",
          s.amount,
          formatCurrency(parseFloat(s.total)),
          formatCurrency(parseFloat(s.receipt)),
          formatCurrency(parseFloat(s.remaind)),
          s.billNumber || "N/A",
          moment(s.createdAt).format("YYYY-MM-DD")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: sellsHeaders,
          body: sellsBody,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      // Expenses Details
      if (stats.expenses && stats.expenses.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Expenses Details", 40, 50, { align: "left" });
        
        const expensesHeaders = [["ID", "Amount", "Purpose", "Created By", "Description", "Date"]];
        const expensesBody = stats.expenses.map(e => [
          e.id,
          formatCurrency(parseFloat(e.amount)),
          e.purpose || "-",
          e.by || "Unknown",
          e.description || "-",
          moment(e.createdAt).format("YYYY-MM-DD HH:mm")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: expensesHeaders,
          body: expensesBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      // Benefits Details
      if (stats.realizedBenefits && stats.realizedBenefits.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Realized Benefits Details", 40, 50, { align: "left" });
        
        const benefitsHeaders = [["ID", "Amount", "Sell ID", "Date"]];
        const benefitsBody = stats.realizedBenefits.map(b => [
          b.id,
          formatCurrency(parseFloat(b.amount)),
          b.sellId,
          moment(b.createdAt).format("YYYY-MM-DD HH:mm")
        ]);
        
        autoTable(doc, {
          startY: 70,
          head: benefitsHeaders,
          body: benefitsBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        });
      }

      const pageCount = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 30, { align: "right" });
      }

      const fileName = `department_${stats.departmentId}_details_${moment().format("YYYY-MM-DD")}.pdf`;
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
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ["Department Financial Details"],
        ["Department Name", stats.departmentName],
        ["Department ID", stats.departmentId],
        ["Date Range", stats.dateRange === "all" ? "All time" : `${stats.dateRange.startDate || "Any"} → ${stats.dateRange.endDate || "Any"}`],
        ["Generated On", moment().format("YYYY-MM-DD HH:mm:ss")],
        [],
        ["Category", "Total Amount (USD)", "Number of Records"],
        ["Withdrawals", stats.totals.withdraws || 0, stats.withdraws?.length || 0],
        ["Deposits", stats.totals.deposits || 0, stats.deposits?.length || 0],
        ["Realized Benefits", stats.totals.realizedBenefits || 0, stats.realizedBenefits?.length || 0],
        ["Inventory Value", stats.totals.existingStock || 0, stats.existingStocks?.length || 0],
        ["Pays (Incoming)", stats.totals.pays || 0, stats.pays?.length || 0],
        ["Expenses", stats.totals.expenses || 0, stats.expenses?.length || 0],
        ["Sales Revenue", stats.totals.totalSales || 0, stats.sells?.length || 0],
        ["Sales Receipt", stats.totals.sellsReceipt || 0, "-"],
        ["Sales Remaind", stats.totals.sellsRemaind || 0, "-"],
        ["Staff Salaries", stats.totals.attendance?.totalAmount || 0, stats.totals.attendance?.totalRecords || 0],
        ["Salary Paid", stats.totals.attendance?.totalReceipt || 0, "-"],
        ["Salary Remaind", stats.totals.attendance?.totalRemaind || 0, "-"],
        ["Total Incoming", stats.totals.totalIncoming || 0, "-"],
        ["Total Outgoing", stats.totals.totalOutgoing || 0, "-"],
        ["Net Cash Flow", stats.totals.netCashFlow || 0, "-"],
        ["GRAND TOTAL (Balance)", stats.totals.grandTotal || 0, "-"],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Attendance Sheet
      if (stats.attendances && stats.attendances.length > 0) {
        const attendanceData = [
          ["ID", "Staff Name", "Father Name", "Salary", "Overtime", "Total", "Paid", "Remaind", "Date"],
          ...stats.attendances.map(a => [
            a.id,
            a.staffName || "Unknown",
            a.staffFatherName || "",
            a.salary,
            a.overtime,
            a.total,
            a.receipt,
            a.remaind,
            moment(a.createdAt).format("YYYY-MM-DD")
          ])
        ];
        const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Attendance");
      }

      // Deposits Sheet
      if (stats.deposits && stats.deposits.length > 0) {
        const depositsData = [
          ["ID", "Amount", "Date"],
          ...stats.deposits.map(d => [d.id, d.amount, moment(d.createdAt).format("YYYY-MM-DD HH:mm")])
        ];
        const depositsSheet = XLSX.utils.aoa_to_sheet(depositsData);
        XLSX.utils.book_append_sheet(workbook, depositsSheet, "Deposits");
      }

      // Pays Sheet
      if (stats.pays && stats.pays.length > 0) {
        const paysData = [
          ["ID", "Amount", "Seller Name", "Description", "Date"],
          ...stats.pays.map(p => [p.id, p.amount, p.sellerName || "Unknown", p.description || "-", moment(p.createdAt).format("YYYY-MM-DD HH:mm")])
        ];
        const paysSheet = XLSX.utils.aoa_to_sheet(paysData);
        XLSX.utils.book_append_sheet(workbook, paysSheet, "Pays");
      }

      // Sells Sheet
      if (stats.sells && stats.sells.length > 0) {
        const sellsData = [
          ["ID", "Product", "Quantity", "Total", "Receipt", "Remaind", "Bill Number", "Date"],
          ...stats.sells.map(s => [
            s.id,
            s.productName || "Unknown",
            s.amount,
            parseFloat(s.total),
            parseFloat(s.receipt),
            parseFloat(s.remaind),
            s.billNumber || "N/A",
            moment(s.createdAt).format("YYYY-MM-DD")
          ])
        ];
        const sellsSheet = XLSX.utils.aoa_to_sheet(sellsData);
        sellsSheet["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, sellsSheet, "Sells");
      }

      // Expenses Sheet
      if (stats.expenses && stats.expenses.length > 0) {
        const expensesData = [
          ["ID", "Amount", "Purpose", "Created By", "Description", "Date"],
          ...stats.expenses.map(e => [
            e.id,
            parseFloat(e.amount),
            e.purpose || "-",
            e.by || "Unknown",
            e.description || "-",
            moment(e.createdAt).format("YYYY-MM-DD HH:mm")
          ])
        ];
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");
      }

      // Benefits Sheet
      if (stats.realizedBenefits && stats.realizedBenefits.length > 0) {
        const benefitsData = [
          ["ID", "Amount", "Sell ID", "Date"],
          ...stats.realizedBenefits.map(b => [
            b.id,
            parseFloat(b.amount),
            b.sellId,
            moment(b.createdAt).format("YYYY-MM-DD HH:mm")
          ])
        ];
        const benefitsSheet = XLSX.utils.aoa_to_sheet(benefitsData);
        XLSX.utils.book_append_sheet(workbook, benefitsSheet, "Benefits");
      }

      // Stock Sheet
      if (stats.existingStocks && stats.existingStocks.length > 0) {
        const stockData = [
          ["ID", "Name", "Quantity", "Unit Price", "Total Value"],
          ...stats.existingStocks.map(s => [
            s.id,
            s.name,
            s.amount,
            s.unit_price,
            s.total_value
          ])
        ];
        const stockSheet = XLSX.utils.aoa_to_sheet(stockData);
        XLSX.utils.book_append_sheet(workbook, stockSheet, "Existing Stock");
      }

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, `department_${stats.departmentId}_details_${moment().format("YYYY-MM-DD")}.xlsx`);
    } catch (err) {
      console.error("Excel generation error:", err);
      alert("Failed to generate Excel");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6">Department Financial Details</h2>

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
              {dept.name} {currentUser?.role !== "admin" && dept.userShare !== undefined && `(${dept.userShare}%)`}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Picker */}
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
            {downloading ? "Generating..." : "Download Details PDF"}
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 transition"
          >
            {downloading ? "Generating..." : "Download Details Excel"}
          </button>
        </div>
      )}

      {/* Loading / Error / Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading department details...</p>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-green-600">Total Deposits</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totals.deposits || 0)}</p>
              <p className="text-xs text-green-500">{stats.deposits?.length || 0} transactions</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-blue-600">Total Pays Received</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totals.pays || 0)}</p>
              <p className="text-xs text-blue-500">{stats.pays?.length || 0} payments</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-emerald-600">Sales Receipts</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(stats.totals.sellsReceipt || 0)}</p>
              <p className="text-xs text-emerald-500">From customer payments</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-orange-600">Outstanding Remaind</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(stats.totals.sellsRemaind || 0)}</p>
              <p className="text-xs text-orange-500">To be collected</p>
            </div>
          </div>

          {/* Staff Salary Card */}
          <div className="bg-purple-50 rounded-xl p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-purple-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-purple-800">Staff Salaries</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-purple-600">Total Salary Amount</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(stats.totals.attendance?.totalAmount || 0)}</p>
                <p className="text-xs text-purple-500">{stats.totals.attendance?.totalRecords || 0} records</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Paid Amount</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totals.attendance?.totalReceipt || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-orange-600">Remaining (Unpaid)</p>
                <p className="text-xl font-bold text-orange-700">{formatCurrency(stats.totals.attendance?.totalRemaind || 0)}</p>
              </div>
            </div>
          </div>

          {/* Grand Total Card - Highlighted */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-white">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">GRAND TOTAL (Department Balance)</h3>
                  <p className="text-sm text-white/80">Total Assets - Total Liabilities</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{formatCurrency(stats.totals.grandTotal || 0)}</div>
                <div className="text-sm text-white/80">Net Department Value</div>
              </div>
            </div>
          </div>

          {/* Additional Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600">Total Incoming</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totals.totalIncoming || 0)}</p>
              <p className="text-xs text-gray-500">Deposits + Benefits + Pays + Receipts + Salary Paid</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600">Total Outgoing</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totals.totalOutgoing || 0)}</p>
              <p className="text-xs text-gray-500">Withdrawals + Expenses + Salaries</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-600">Net Cash Flow</p>
              <p className={`text-2xl font-bold ${(stats.totals.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totals.netCashFlow || 0)}
              </p>
              <p className="text-xs text-gray-500">Incoming - Outgoing</p>
            </div>
          </div>

          {/* Attendance Details Section */}
          {stats.attendances && stats.attendances.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowAttendanceDetails(!showAttendanceDetails)}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>👥 Staff Attendance & Salary Details ({stats.attendances.length} records, Total: {formatCurrency(stats.totals.attendance?.totalAmount || 0)})</span>
                <span>{showAttendanceDetails ? "▲" : "▼"}</span>
              </button>
              {showAttendanceDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Staff Name</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Father Name</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Salary</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Overtime</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold bg-emerald-100">Paid</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold bg-orange-100">Remaind</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.attendances.map((a) => (
                        <tr key={a.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{a.id}</td>
                          <td className="px-4 py-2 text-sm font-medium">{a.staffName || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{a.staffFatherName || ""}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(a.salary)}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(a.overtime)}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(a.total)}</td>
                          <td className="px-4 py-2 text-sm text-right bg-emerald-50">{formatCurrency(a.receipt)}</td>
                          <td className="px-4 py-2 text-sm text-right bg-orange-50">{formatCurrency(a.remaind)}</td>
                          <td className="px-4 py-2 text-sm">{moment(a.createdAt).format("YYYY-MM-DD")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-right font-semibold">Totals:</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(stats.totals.attendance?.totalAmount || 0)}</td>
                        <td className="px-4 py-2 text-right font-semibold bg-emerald-100">{formatCurrency(stats.totals.attendance?.totalReceipt || 0)}</td>
                        <td className="px-4 py-2 text-right font-semibold bg-orange-100">{formatCurrency(stats.totals.attendance?.totalRemaind || 0)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Deposits Details Section */}
          {stats.deposits && stats.deposits.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowDepositsDetails(!showDepositsDetails)}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>💰 Deposits ({stats.deposits.length} transactions, {formatCurrency(stats.totals.deposits)})</span>
                <span>{showDepositsDetails ? "▲" : "▼"}</span>
              </button>
              {showDepositsDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Amount</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.deposits.map((d) => (
                        <tr key={d.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{d.id}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(d.amount)}</td>
                          <td className="px-4 py-2 text-sm">{moment(d.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Rest of your sections remain the same... */}
          {/* Pays Details Section */}
          {stats.pays && stats.pays.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowPaysDetails(!showPaysDetails)}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>💳 Pays Received ({stats.pays.length} payments, {formatCurrency(stats.totals.pays)})</span>
                <span>{showPaysDetails ? "▲" : "▼"}</span>
              </button>
              {showPaysDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Amount</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Seller</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Description</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.pays.map((p) => (
                        <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{p.id}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-2 text-sm">{p.sellerName || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{p.description || "-"}</td>
                          <td className="px-4 py-2 text-sm">{moment(p.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sells Details Section */}
          {stats.sells && stats.sells.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowSellsDetails(!showSellsDetails)}
                className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>🛒 Sells ({stats.sells.length} sales, Receipt: {formatCurrency(stats.totals.sellsReceipt)}, Remaind: {formatCurrency(stats.totals.sellsRemaind)})</span>
                <span>{showSellsDetails ? "▲" : "▼"}</span>
              </button>
              {showSellsDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold bg-emerald-100">Receipt</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold bg-orange-100">Remaind</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Bill #</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.sells.map((s) => (
                        <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{s.id}</td>
                          <td className="px-4 py-2 text-sm">{s.productName || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatNumber(s.amount)}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(parseFloat(s.total))}</td>
                          <td className="px-4 py-2 text-sm text-right bg-emerald-50">{formatCurrency(parseFloat(s.receipt))}</td>
                          <td className="px-4 py-2 text-sm text-right bg-orange-50">{formatCurrency(parseFloat(s.remaind))}</td>
                          <td className="px-4 py-2 text-sm">{s.billNumber || "N/A"}</td>
                          <td className="px-4 py-2 text-sm">{moment(s.createdAt).format("YYYY-MM-DD")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="3" className="px-4 py-2 text-right font-semibold">Totals:</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(stats.totals.totalSales)}</td>
                        <td className="px-4 py-2 text-right font-semibold bg-emerald-100">{formatCurrency(stats.totals.sellsReceipt)}</td>
                        <td className="px-4 py-2 text-right font-semibold bg-orange-100">{formatCurrency(stats.totals.sellsRemaind)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Expenses Details Section */}
          {stats.expenses && stats.expenses.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowExpensesDetails(!showExpensesDetails)}
                className="w-full bg-red-50 hover:bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>📊 Expenses ({stats.expenses.length} records, {formatCurrency(stats.totals.expenses)})</span>
                <span>{showExpensesDetails ? "▲" : "▼"}</span>
              </button>
              {showExpensesDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Amount</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Purpose</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Created By</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Description</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.expenses.map((e) => (
                        <tr key={e.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{e.id}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(parseFloat(e.amount))}</td>
                          <td className="px-4 py-2 text-sm">{e.purpose || "-"}</td>
                          <td className="px-4 py-2 text-sm">{e.by || "Unknown"}</td>
                          <td className="px-4 py-2 text-sm">{e.description || "-"}</td>
                          <td className="px-4 py-2 text-sm">{moment(e.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Benefits Details Section */}
          {stats.realizedBenefits && stats.realizedBenefits.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowBenefitsDetails(!showBenefitsDetails)}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold py-2 px-4 rounded-lg transition flex justify-between items-center"
              >
                <span>📈 Realized Benefits ({stats.realizedBenefits.length} records, {formatCurrency(stats.totals.realizedBenefits)})</span>
                <span>{showBenefitsDetails ? "▲" : "▼"}</span>
              </button>
              {showBenefitsDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Amount</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Sell ID</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.realizedBenefits.map((b) => (
                        <tr key={b.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{b.id}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(parseFloat(b.amount))}</td>
                          <td className="px-4 py-2 text-sm text-right">{b.sellId}</td>
                          <td className="px-4 py-2 text-sm">{moment(b.createdAt).format("YYYY-MM-DD HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Stock Details Section */}
          {stats.existingStocks && stats.existingStocks.length > 0 && (
            <div className="mb-6">
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">📦 Current Stock Inventory</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Quantity</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Unit Price</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.existingStocks.map((s) => (
                        <tr key={s.id} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-sm">{s.name}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatNumber(s.amount)}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(s.unit_price)}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(s.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="3" className="px-4 py-2 text-right font-semibold">Total Stock Value:</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(stats.totals.existingStock)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stakeholderpage;