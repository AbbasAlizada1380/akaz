import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000/api";

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper to format date
const formatDate = (date) => {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
};

const BillExport = ({ billId }) => {
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch bill details when billId changes
  useEffect(() => {
    if (!billId) return;

    const fetchBill = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${BASE_URL}/Bill/bills/${billId}`);
        if (response.data.success) {
          setBillData(response.data);
        } else {
          setError("Bill not found");
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to fetch bill");
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId]);

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!billData) {
      alert("No bill data to export");
      return;
    }

    const { bill, sells } = billData;
    const customer = bill.customer || {};
    const items = sells || [];

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    let currentY = 50;

    // Title
    doc.setFontSize(16);
    doc.text(`Bill #${bill.billNumber}`, doc.internal.pageSize.width / 2, currentY, { align: "center" });
    currentY += 20;
    doc.setFontSize(11);
    doc.text(`Date: ${moment(bill.date).format("YYYY-MM-DD")}`, doc.internal.pageSize.width / 2, currentY, { align: "center" });
    currentY += 20;

    // Customer Info
    doc.setFontSize(12);
    doc.text("Customer Information", 40, currentY);
    currentY += 15;
    doc.setFontSize(10);
    doc.text(`Name: ${customer.fullname || "N/A"}`, 40, currentY);
    doc.text(`Phone: ${customer.phoneNumber || "N/A"}`, 250, currentY);
    currentY += 15;
    doc.text(`Address: ${customer.address || "N/A"}`, 40, currentY);
    currentY += 25;

    // Items Table
    const tableHeaders = [["Product", "Quantity", "Unit Price", "Discount", "Total"]];
    const tableRows = items.map((item) => [
      item.product?.name || "Unknown",
      item.amount,
      formatCurrency(item.unit_price),
      `${item.discount_percent}%`,
      formatCurrency(item.total),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4, halign: "center" },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      margin: { left: 40, right: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // Totals
    doc.setFontSize(11);
    doc.text(`Subtotal: ${formatCurrency(bill.totalAmount)}`, doc.internal.pageSize.width - 40, currentY, { align: "right" });
    currentY += 18;
    doc.text(`Discount (${bill.discount_percent}%): ${formatCurrency(bill.discounted_amount)}`, doc.internal.pageSize.width - 40, currentY, { align: "right" });
    currentY += 18;
    doc.text(`Paid Amount: ${formatCurrency(bill.paidAmount)}`, doc.internal.pageSize.width - 40, currentY, { align: "right" });
    currentY += 18;
    doc.text(`Remaining: ${formatCurrency(bill.remainingAmount)}`, doc.internal.pageSize.width - 40, currentY, { align: "right" });
    currentY += 18;
    doc.text(`Status: ${bill.status.toUpperCase()}`, doc.internal.pageSize.width - 40, currentY, { align: "right" });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Generated on: ${moment().format("YYYY-MM-DD HH:mm:ss")}`, pageWidth - 40, pageHeight - 30, { align: "right" });
      doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 15, { align: "right" });
    }

    doc.save(`Bill_${bill.billNumber}.pdf`);
  };

const handleDownloadExcel = () => {
  if (!billData) {
    alert("No bill data to export");
    return;
  }

  const { bill, sells } = billData;
  const customer = bill.customer || {};
  const items = sells || [];

  const workbook = XLSX.utils.book_new();
  const invoiceData = [];

  // ========== HEADER ==========
  invoiceData.push(["YOUR COMPANY NAME"]);
  invoiceData.push(["Address: Your Address, City, Country"]);
  invoiceData.push(["Phone: +123456789 | Email: info@company.com"]);
  invoiceData.push([]);
  invoiceData.push(["INVOICE"]);
  invoiceData.push([]);

  // ========== BILL INFORMATION ==========
  invoiceData.push(["Bill Number:", bill.billNumber]);
  invoiceData.push(["Date:", moment(bill.date).format("YYYY-MM-DD")]);
  invoiceData.push([]);

  // ========== CUSTOMER INFORMATION ==========
  invoiceData.push(["Customer Information"]);
  invoiceData.push(["Name:", customer.fullname || "N/A"]);
  if (customer.phoneNumber) invoiceData.push(["Phone:", customer.phoneNumber]);
  if (customer.address) invoiceData.push(["Address:", customer.address]);
  invoiceData.push([]);

  // ========== ITEMS TABLE ==========
  invoiceData.push(["Items Purchased"]);
  invoiceData.push(["#", "Product", "Quantity", "Unit Price", "Discount %", "Total"]);

  items.forEach((item, idx) => {
    invoiceData.push([
      idx + 1,
      item.product?.name || "Unknown",
      item.amount,
      parseFloat(item.unit_price).toFixed(2),
      `${item.discount_percent}%`,
      parseFloat(item.total).toFixed(2),
    ]);
  });
  invoiceData.push([]); // empty row after table

  // ========== PAYMENT SUMMARY ==========
  invoiceData.push(["Payment Summary"]);
  invoiceData.push(["Subtotal:", "", "", "", "", parseFloat(bill.totalAmount).toFixed(2)]);
  if (bill.discount_percent && parseFloat(bill.discount_percent) > 0) {
    invoiceData.push(["Discount:", `${bill.discount_percent}%`, "", "", "", parseFloat(bill.discounted_amount).toFixed(2)]);
  }
  invoiceData.push(["Paid:", "", "", "", "", parseFloat(bill.paidAmount).toFixed(2)]);
  invoiceData.push(["Remaining:", "", "", "", "", parseFloat(bill.remainingAmount).toFixed(2)]);
  invoiceData.push([]);
  invoiceData.push(["Status:", bill.status.toUpperCase()]);
  invoiceData.push([]);
  invoiceData.push(["Thank you for your business!"]);
  invoiceData.push([`Generated on: ${moment().format("YYYY-MM-DD HH:mm:ss")}`]);

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(invoiceData);

  // Set column widths (align with table columns)
  ws['!cols'] = [
    { wch: 12 },  // Label column (Bill Number:, Name:, etc.)
    { wch: 25 },  // Value column / Product name
    { wch: 10 },  // Quantity / extra
    { wch: 12 },  // Unit Price
    { wch: 12 },  // Discount %
    { wch: 15 },  // Total amounts
  ];

  // Merge cells for header and title rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Company name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Address
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Contact
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // INVOICE title
    { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } }, // "Customer Information" heading
    { s: { r: 13, c: 0 }, e: { r: 13, c: 5 } }, // "Items Purchased" heading
    { s: { r: 16 + items.length, c: 0 }, e: { r: 16 + items.length, c: 5 } }, // "Payment Summary" heading (dynamic)
  ];

  // Optional: bold style for headings (requires cell objects, but for simplicity we leave as is)
  // Users can easily format the generated Excel.

  XLSX.utils.book_append_sheet(workbook, ws, "Invoice");

  // Add a raw data sheet for reference (optional)
  const itemsData = items.map((item) => ({
    Product: item.product?.name || "Unknown",
    Quantity: item.amount,
    "Unit Price": item.unit_price,
    "Discount %": item.discount_percent,
    "Discount Amount": item.discounted_amount,
    Total: item.total,
  }));
  const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Raw Data");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `Invoice_${bill.billNumber}.xlsx`);
};

  // If no billId provided, show a prompt (optional)
  if (!billId) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
        Please provide a Bill ID to export.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>;
  }

  if (!billData) return null;

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDownloadPDF}
        className="bg-cyan-800 text-white px-5 py-2 rounded hover:bg-cyan-700 transition"
      >
        Download PDF
      </button>
      <button
        onClick={handleDownloadExcel}
        className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 transition"
      >
        Download Excel
      </button>
    </div>
  );
};

export default BillExport;