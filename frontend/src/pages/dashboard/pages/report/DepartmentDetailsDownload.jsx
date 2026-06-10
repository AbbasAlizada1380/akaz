import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000/api";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
};

const DepartmentDetailsDownload = ({ departmentId, departmentName, startDate, endDate }) => {
  const [loading, setLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!departmentId) {
      alert("Please select a department");
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(`${BASE_URL}/department/${departmentId}/details`, { params });
      const data = response.data.data;

      // Check for expenses as well
      const hasExpenses = data.expenses && data.expenses.length > 0;
      
      if (!data || (data.withdraws.length === 0 && data.deposits.length === 0 && 
          data.realizedBenefits.length === 0 && data.existingStocks.length === 0 && 
          data.pays.length === 0 && !hasExpenses)) {
        alert("No data found for the selected department and date range");
        return;
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 50;

      const deptName = departmentName || data.departmentName;
      let dateRangeText = "All time";
      if (data.dateRange !== "all") {
        dateRangeText = `${data.dateRange.startDate || "Any"} → ${data.dateRange.endDate || "Any"}`;
      }
      doc.setFontSize(16);
      doc.text(`Department Details: ${deptName}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 20;
      doc.setFontSize(11);
      doc.text(`Date Range: ${dateRangeText}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 20;
      doc.text(`Generated on: ${moment().format("YYYY-MM-DD HH:mm:ss")}`, pageWidth / 2, currentY, { align: "center" });
      currentY += 30;

      // Calculate totals for summary
      const totalWithdraws = data.withdraws.reduce((sum, w) => sum + (w.amount || 0), 0);
      const totalDeposits = data.deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalBenefits = data.realizedBenefits.reduce((sum, b) => sum + (b.amount || 0), 0);
      const totalPays = data.pays.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
      const totalStockValue = data.existingStocks.reduce((sum, s) => sum + (s.total_value || 0), 0);

      // Summary Section
      doc.setFontSize(14);
      doc.text("Summary", 40, currentY);
      currentY += 20;
      
      const summaryRows = [
        ["Category", "Count", "Total Amount"],
        ["Withdrawals", data.withdraws.length, formatCurrency(totalWithdraws)],
        ["Deposits", data.deposits.length, formatCurrency(totalDeposits)],
        ["Realized Benefits", data.realizedBenefits.length, formatCurrency(totalBenefits)],
        ["Expenses", data.expenses?.length || 0, formatCurrency(totalExpenses)],
        ["Pays (Incoming)", data.pays.length, formatCurrency(totalPays)],
        ["Existing Stock Value", data.existingStocks.length, formatCurrency(totalStockValue)],
      ];
      
      autoTable(doc, {
        startY: currentY,
        head: [summaryRows[0]],
        body: summaryRows.slice(1),
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        margin: { left: 40, right: 40 },
      });
      currentY = doc.lastAutoTable.finalY + 20;

      const addCategoryTable = (title, headers, rows) => {
        if (!rows || rows.length === 0) return currentY;
        
        // Check if we need a new page
        if (currentY > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.setFontSize(12);
        doc.text(title, 40, currentY + 10);
        currentY += 20;
        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: rows,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
          margin: { left: 40, right: 40 },
        });
        return doc.lastAutoTable.finalY + 15;
      };

      let withdrawRows = data.withdraws.map((w) => [w.id, formatCurrency(w.amount), w.userName || "Unknown", formatDate(w.createdAt)]);
      currentY = addCategoryTable("Withdrawals", ["ID", "Amount", "User Name", "Date"], withdrawRows);

      let depositRows = data.deposits.map((d) => [d.id, formatCurrency(d.amount), d.userName || "Unknown", formatDate(d.createdAt)]);
      currentY = addCategoryTable("Deposits", ["ID", "Amount", "User Name", "Date"], depositRows);

      let benefitRows = data.realizedBenefits.map((b) => [b.id, formatCurrency(b.amount), b.sellId, formatDate(b.createdAt)]);
      currentY = addCategoryTable("Realized Benefits", ["ID", "Amount", "Sell ID", "Date"], benefitRows);

      // Expenses Section
      if (data.expenses && data.expenses.length > 0) {
        let expenseRows = data.expenses.map((e) => [
          e.id, 
          formatCurrency(e.amount), 
          e.purpose || "-", 
          e.by || "Unknown", 
          e.description?.substring(0, 50) || "-",
          formatDate(e.createdAt)
        ]);
        currentY = addCategoryTable("Expenses", ["ID", "Amount", "Purpose", "Created By", "Description", "Date"], expenseRows);
      }

      let stockRows = data.existingStocks.map((s) => [s.id, s.name, s.amount, formatCurrency(s.unit_price), formatCurrency(s.total_value)]);
      currentY = addCategoryTable("Existing Stock", ["ID", "Name", "Quantity", "Unit Price", "Total Value"], stockRows);

      let paysRows = data.pays.map((p) => [p.id, formatCurrency(p.amount), p.sellerName || "Unknown", p.description || "-", formatDate(p.createdAt)]);
      currentY = addCategoryTable("Pays (Incoming Payments)", ["ID", "Amount", "Seller Name", "Description", "Date"], paysRows);

      // Financial Summary Section
      doc.addPage();
      currentY = 40;
      doc.setFontSize(14);
      doc.text("Financial Summary", 40, currentY);
      currentY += 20;
      
      const netFlow = totalDeposits + totalBenefits + totalPays - totalWithdraws - totalExpenses;
      const totalIncoming = totalDeposits + totalBenefits + totalPays;
      const totalOutgoing = totalWithdraws + totalExpenses;
      
      const financialRows = [
        ["Total Incoming", formatCurrency(totalIncoming)],
        ["Total Outgoing", formatCurrency(totalOutgoing)],
        ["Net Cash Flow", formatCurrency(netFlow), netFlow >= 0 ? "Positive" : "Negative"],
        ["Stock Value", formatCurrency(totalStockValue)],
      ];
      
      autoTable(doc, {
        startY: currentY,
        body: financialRows,
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 100 }, 2: { cellWidth: 80 } },
        margin: { left: 40, right: 40 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 30, { align: "right" });
      }

      doc.save(`department_${departmentId}_details_${moment().format("YYYY-MM-DD")}.pdf`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!departmentId) {
      alert("Please select a department");
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(`${BASE_URL}/department/${departmentId}/details`, { params });
      const data = response.data.data;

      if (!data || (data.withdraws.length === 0 && data.deposits.length === 0 && 
          data.realizedBenefits.length === 0 && data.existingStocks.length === 0 && 
          data.pays.length === 0 && (!data.expenses || data.expenses.length === 0))) {
        alert("No data found for the selected department and date range");
        return;
      }

      const workbook = XLSX.utils.book_new();

      const addSheet = (sheetName, headers, rows) => {
        const sheetData = [headers, ...rows];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      };

      addSheet("Withdrawals", ["ID", "Amount", "User Name", "Date"], 
        data.withdraws.map((w) => [w.id, w.amount, w.userName || "Unknown", formatDate(w.createdAt)]));
      
      addSheet("Deposits", ["ID", "Amount", "User Name", "Date"], 
        data.deposits.map((d) => [d.id, d.amount, d.userName || "Unknown", formatDate(d.createdAt)]));
      
      addSheet("Realized Benefits", ["ID", "Amount", "Sell ID", "Date"], 
        data.realizedBenefits.map((b) => [b.id, b.amount, b.sellId, formatDate(b.createdAt)]));
      
      // Expenses Sheet
      if (data.expenses && data.expenses.length > 0) {
        addSheet("Expenses", ["ID", "Amount", "Purpose", "Created By", "Description", "Date"], 
          data.expenses.map((e) => [e.id, e.amount, e.purpose || "-", e.by || "Unknown", e.description || "-", formatDate(e.createdAt)]));
      } else {
        addSheet("Expenses", ["ID", "Amount", "Purpose", "Created By", "Description", "Date"], [["No expenses found"]]);
      }
      
      addSheet("Existing Stock", ["ID", "Name", "Quantity", "Unit Price", "Total Value"], 
        data.existingStocks.map((s) => [s.id, s.name, s.amount, s.unit_price, s.total_value]));
      
      addSheet("Pays", ["ID", "Amount", "Seller Name", "Description", "Date"], 
        data.pays.map((p) => [p.id, p.amount, p.sellerName || "Unknown", p.description || "-", formatDate(p.createdAt)]));

      // Calculate totals for summary
      const totalWithdraws = data.withdraws.reduce((sum, w) => sum + (w.amount || 0), 0);
      const totalDeposits = data.deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalBenefits = data.realizedBenefits.reduce((sum, b) => sum + (b.amount || 0), 0);
      const totalPays = data.pays.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalExpenses = data.expenses ? data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
      const totalStockValue = data.existingStocks.reduce((sum, s) => sum + (s.total_value || 0), 0);
      const netFlow = totalDeposits + totalBenefits + totalPays - totalWithdraws - totalExpenses;

      const summaryRows = [
        ["Department", data.departmentName],
        ["Department ID", data.departmentId],
        ["Date Range", data.dateRange === "all" ? "All time" : `${data.dateRange.startDate || "Any"} → ${data.dateRange.endDate || "Any"}`],
        ["Generated On", moment().format("YYYY-MM-DD HH:mm:ss")],
        [],
        ["Category", "Number of Records", "Total Amount"],
        ["Withdrawals", data.withdraws.length, totalWithdraws],
        ["Deposits", data.deposits.length, totalDeposits],
        ["Realized Benefits", data.realizedBenefits.length, totalBenefits],
        ["Expenses", data.expenses?.length || 0, totalExpenses],
        ["Pays", data.pays.length, totalPays],
        ["Existing Stock Value", data.existingStocks.length, totalStockValue],
        [],
        ["Financial Summary", "", ""],
        ["Total Incoming", "", totalDeposits + totalBenefits + totalPays],
        ["Total Outgoing", "", totalWithdraws + totalExpenses],
        ["Net Cash Flow", "", netFlow],
        ["Net Flow Status", netFlow >= 0 ? "Positive" : "Negative", ""],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      
      // Adjust column widths
      summarySheet['!cols'] = [{wch:25}, {wch:15}, {wch:20}];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, `department_${departmentId}_details_${moment().format("YYYY-MM-DD")}.xlsx`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to generate Excel");
    } finally {
      setLoading(false);
    }
  };

  if (!departmentId) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDownloadPDF}
        disabled={loading}
        className="bg-cyan-800 text-white px-5 py-2 rounded hover:bg-cyan-700 disabled:bg-gray-400 transition"
      >
        {loading ? "Generating..." : "Download Details PDF"}
      </button>
      <button
        onClick={handleDownloadExcel}
        disabled={loading}
        className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 transition"
      >
        {loading ? "Generating..." : "Download Details Excel"}
      </button>
    </div>
  );
};

export default DepartmentDetailsDownload;