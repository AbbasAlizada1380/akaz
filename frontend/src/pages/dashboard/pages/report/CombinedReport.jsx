import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const CombinedReport = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper: fetch data from multiple endpoints
  const fetchAllData = async (fromDate, toDate) => {
    const params = { from: fromDate, to: toDate };

    const endpoints = [
      { name: "benefits", url: `${BASE_URL}/department/report`, params: { ...params, limit: 10000 } },
      { name: "receipts", url: `${BASE_URL}/receive/date_range`, params },
      { name: "payments", url: `${BASE_URL}/pay/date-range`, params },
      { name: "expenses", url: `${BASE_URL}/expense/date_range`, params },
      { name: "salaries", url: `${BASE_URL}/attendance/date-range`, params },
    ];

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          const res = await axios.get(ep.url, { params: ep.params });
          return { name: ep.name, data: res.data, success: true };
        } catch (err) {
          console.error(`Error fetching ${ep.name}:`, err);
          return { name: ep.name, data: null, success: false };
        }
      })
    );

    // Parse each response into a standard format
    let benefitsList = [];
    let receiptsList = [];
    let paymentsList = [];
    let expensesList = [];
    let salariesList = [];

    for (const result of results) {
      if (!result.success) continue;

      switch (result.name) {
        case "benefits":
          benefitsList = result.data.data || [];
          break;
        case "receipts":
          receiptsList = result.data.data?.receives || [];
          break;
        case "payments":
          paymentsList = result.data.data?.pays || [];
          break;
        case "expenses":
          expensesList = result.data.data?.expenses || [];
          break;
        case "salaries":
          salariesList = result.data.data || [];
          break;
        default:
          break;
      }
    }

    return { benefitsList, receiptsList, paymentsList, expensesList, salariesList };
  };

  const handleDownload = async () => {
    if (!from || !to) {
      alert("Please select a date range.");
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      alert("Start date cannot be later than end date.");
      return;
    }

    setLoading(true);
    try {
      const { benefitsList, receiptsList, paymentsList, expensesList, salariesList } =
        await fetchAllData(from, to);

      if (
        benefitsList.length === 0 &&
        receiptsList.length === 0 &&
        paymentsList.length === 0 &&
        expensesList.length === 0 &&
        salariesList.length === 0
      ) {
        alert("No data found in the selected date range.");
        return;
      }

      // Create PDF document
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false);
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const formattedFrom = moment(from).format("YYYY/MM/DD");
      const formattedTo = moment(to).format("YYYY/MM/DD");
      const today = moment().format("YYYY/MM/DD");

      // ========== TITLE ==========
      doc.setFontSize(16);
      doc.text("Combined Financial Report", margin, 50, { align: "left" });
      doc.setFontSize(12);
      doc.text(`Period: ${formattedFrom} to ${formattedTo}`, margin, 75, { align: "left" });
      doc.text(`Generated: ${today}`, margin, 95, { align: "left" });

      // ========== SUMMARY TABLE ==========
      const summaryHeaders = [["Category", "Count", "Total Amount (AFN)"]];
      const summaryBody = [];

      const calcTotal = (list, amountField = "amount") => {
        const total = list.reduce((sum, item) => sum + parseFloat(item[amountField] || 0), 0);
        return total;
      };

      const benefitsTotal = calcTotal(benefitsList);
      const receiptsTotal = calcTotal(receiptsList);
      const paymentsTotal = calcTotal(paymentsList);
      const expensesTotal = calcTotal(expensesList);
      // Salaries use "total" field (amount to pay)
      const salariesTotal = salariesList.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

      if (benefitsList.length) summaryBody.push(["Benefits", benefitsList.length, benefitsTotal.toLocaleString()]);
      if (receiptsList.length) summaryBody.push(["Receipts (Customer Payments)", receiptsList.length, receiptsTotal.toLocaleString()]);
      if (paymentsList.length) summaryBody.push(["Payments (Supplier/Seller)", paymentsList.length, paymentsTotal.toLocaleString()]);
      if (expensesList.length) summaryBody.push(["Expenses", expensesList.length, expensesTotal.toLocaleString()]);
      if (salariesList.length) summaryBody.push(["Salaries", salariesList.length, salariesTotal.toLocaleString()]);

      autoTable(doc, {
        startY: 120,
        margin: { left: margin, right: margin },
        head: summaryHeaders,
        body: summaryBody,
        theme: "striped",
        styles: { font: "Vazirmatn", fontSize: 11, halign: "center", cellPadding: 8 },
        headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: "bold" },
      });

      // ========== DETAILED SECTIONS (each on new page) ==========
      const addDetailSection = (title, list, renderTable) => {
        if (list.length === 0) return;
        doc.addPage();
        doc.setFontSize(14);
        doc.text(title, margin, 40, { align: "left" });
        renderTable(doc, list, margin);
      };

      // Benefits detail
      addDetailSection("Benefits Details", benefitsList, (doc, list, margin) => {
        const headers = [["ID", "Amount (AFN)", "Sell ID", "Department", "Created At"]];
        const body = list.map(b => [
          b.id,
          parseFloat(b.amount).toLocaleString("eng-en"),
          b.sellId,
          b.department?.name || "—",
          moment(b.createdAt).format("YYYY/MM/DD HH:mm"),
        ]);
        autoTable(doc, {
          startY: 60,
          margin: { left: margin, right: margin },
          head: headers,
          body,
          theme: "grid",
          styles: { font: "Vazirmatn", fontSize: 10, halign: "center", cellPadding: 6 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
        });
        const total = list.reduce((s, b) => s + parseFloat(b.amount), 0);
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.text(`Total Benefits: ${total.toLocaleString("eng-en")} AFN`, margin, finalY, { align: "left" });
      });

      // Receipts detail
      addDetailSection("Receipts Details", receiptsList, (doc, list, margin) => {
        const headers = [["Amount (AFN)", "Customer", "Date", "Receipt ID"]];
        const body = list.map(r => [
          parseFloat(r.amount).toLocaleString(),
          r.customerInfo?.fullname || "Unknown",
          moment(r.createdAt).format("YYYY/MM/DD"),
          r.id.toString().slice(-8),
        ]);
        autoTable(doc, {
          startY: 60,
          margin: { left: margin, right: margin },
          head: headers,
          body,
          theme: "grid",
          styles: { font: "Vazirmatn", fontSize: 9, halign: "center", cellPadding: 5 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
        });
        const total = list.reduce((s, r) => s + parseFloat(r.amount), 0);
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.text(`Total Receipts: ${total.toLocaleString()} AFN`, margin, finalY, { align: "left" });
      });

      // Payments detail
      addDetailSection("Payments Details", paymentsList, (doc, list, margin) => {
        const headers = [["Amount (AFN)", "Seller", "Date", "Payment ID"]];
        const body = list.map(p => [
          parseFloat(p.amount).toLocaleString(),
          p.sellerInfo?.fullname || "Unknown",
          moment(p.createdAt).format("YYYY/MM/DD"),
          p.id.toString().slice(-8),
        ]);
        autoTable(doc, {
          startY: 60,
          margin: { left: margin, right: margin },
          head: headers,
          body,
          theme: "grid",
          styles: { font: "Vazirmatn", fontSize: 9, halign: "center", cellPadding: 5 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
        });
        const total = list.reduce((s, p) => s + parseFloat(p.amount), 0);
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text(`Total Payments: ${total.toLocaleString()} AFN`, margin, finalY, { align: "left" });
      });

      // Expenses detail
      addDetailSection("Expenses Details", expensesList, (doc, list, margin) => {
        const headers = [["Amount (AFN)", "Purpose", "By", "Date", "ID"]];
        const body = list.map(e => [
          parseFloat(e.amount).toLocaleString(),
          e.purpose || "—",
          e.by || "Unknown",
          moment(e.createdAt).format("YYYY/MM/DD"),
          e.id,
        ]);
        autoTable(doc, {
          startY: 60,
          margin: { left: margin, right: margin },
          head: headers,
          body,
          theme: "grid",
          styles: { font: "Vazirmatn", fontSize: 10, halign: "center", cellPadding: 6 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
        });
        const total = list.reduce((s, e) => s + parseFloat(e.amount), 0);
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text(`Total Expenses: ${total.toLocaleString()} AFN`, margin, finalY, { align: "left" });
      });

      // Salaries detail
      addDetailSection("Salaries Details", salariesList, (doc, list, margin) => {
        const headers = [["Payment Date", "Paid Amount (AFN)", "Total Payable (AFN)", "Employee"]];
        const body = list.map(s => [
          moment(s.createdAt).format("YYYY/MM/DD"),
          parseFloat(s.receipt || 0).toLocaleString(),
          parseFloat(s.total || 0).toLocaleString(),
          s.Staff?.name || "Unknown",
        ]);
        autoTable(doc, {
          startY: 60,
          margin: { left: margin, right: margin },
          head: headers,
          body,
          theme: "grid",
          styles: { font: "Vazirmatn", fontSize: 10, halign: "center", cellPadding: 6 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255 },
        });
        const totalPayable = list.reduce((s, sals) => s + parseFloat(sals.total || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text(`Total Salaries Payable: ${totalPayable.toLocaleString()} AFN`, margin, finalY, { align: "left" });
      });

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(
          `${i} / ${pageCount}`,
          pageWidth - margin,
          pageHeight - 30,
          { align: "right" }
        );
      }

      doc.save(`Combined_Report_${formattedFrom}_to_${formattedTo}.pdf`);
    } catch (err) {
      console.error("Error generating combined report:", err);
      alert("Failed to generate report. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        Combined Financial Report
      </h2>
      <p className="text-sm text-gray-600">
        Generate a single PDF with summary and detailed data for Benefits, Receipts, Payments, Expenses, and Salaries.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading || !from || !to}
        className="bg-primary text-white px-6 py-2 rounded disabled:bg-gray-400 w-full sm:w-auto"
      >
        {loading ? "Generating PDF..." : "Download Combined Report"}
      </button>
    </div>
  );
};

export default CombinedReport;