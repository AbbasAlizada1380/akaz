import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "0 ؋";
  return num.toLocaleString() + " ؋";
};

const formatDate = (date) => {
  return moment(date).format("YYYY/MM/DD HH:mm");
};

const BillExport = ({ billId, billData: propBillData }) => {
  const [localBillData, setLocalBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If propBillData is provided, use it; otherwise fetch on demand (not on mount)
  const getBillData = async () => {
    if (propBillData) return propBillData;
    if (localBillData) return localBillData;

    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${BASE_URL}/Bill/bills/${billId}`);
      if (response.data.success) {
        setLocalBillData(response.data);
        return response.data;
      } else {
        throw new Error("Bill not found");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch bill");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const data = await getBillData();
    if (!data) return;

    const { bill, sells } = data;
    const customer = bill.customer || {};
    const items = sells || [];

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setR2L(false);
    doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
    doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
    doc.setFont("Vazirmatn");

    doc.setFontSize(16);
    doc.text(`Invoice #${bill.billNumber}`, doc.internal.pageSize.getWidth() - 40, 40, { align: "right" });
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(bill.date)}`, doc.internal.pageSize.getWidth() - 40, 65, { align: "right" });
    doc.text(`Customer: ${customer.fullname || "-"}`, doc.internal.pageSize.getWidth() - 40, 80, { align: "right" });
    if (customer.phoneNumber) doc.text(`Phone: ${customer.phoneNumber}`, doc.internal.pageSize.getWidth() - 40, 95, { align: "right" });
    if (bill.notes) doc.text(`Notes: ${bill.notes}`, doc.internal.pageSize.getWidth() - 40, 110, { align: "right" });

    let startY = 130;
    const headers = [["Product", "Quantity", "Unit Price", "Discount %", "Total"]];
    const body = items.map((item) => [
      item.product?.name || "Unknown",
      item.amount,
      formatCurrency(item.unit_price),
      `${item.discount_percent || 0}%`,
      formatCurrency(item.total),
    ]);

    autoTable(doc, {
      startY,
      head: headers,
      body,
      theme: "grid",
      styles: { font: "Vazirmatn", fontSize: 9, halign: "center", valign: "middle" },
      headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: "normal" },
      margin: { left: 30, right: 30 },
    });

    let finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.text(`Total: ${formatCurrency(bill.totalAmount)}`, doc.internal.pageSize.getWidth() - 40, finalY, { align: "right" });
    finalY += 20;
    if (bill.discount_percent && parseFloat(bill.discount_percent) > 0) {
      doc.text(`Discount (${bill.discount_percent}%): ${formatCurrency(bill.discounted_amount)}`, doc.internal.pageSize.getWidth() - 40, finalY, { align: "right" });
      finalY += 20;
    }
    doc.text(`Paid: ${formatCurrency(bill.paidAmount)}`, doc.internal.pageSize.getWidth() - 40, finalY, { align: "right" });
    finalY += 20;
    doc.text(`Remaining: ${formatCurrency(bill.remainingAmount)}`, doc.internal.pageSize.getWidth() - 40, finalY, { align: "right" });
    finalY += 20;
    const statusText = bill.status === "paid" ? "Paid" : bill.status === "partial" ? "Partial" : "Unpaid";
    doc.text(`Status: ${statusText}`, doc.internal.pageSize.getWidth() - 40, finalY, { align: "right" });

    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 30, { align: "right" });
      doc.text(`Generated: ${moment().format("YYYY/MM/DD HH:mm")}`, pageWidth - 40, pageHeight - 15, { align: "right" });
    }
    doc.save(`Invoice_${bill.billNumber}.pdf`);
  };

  const handleDownloadExcel = async () => {
    const data = await getBillData();
    if (!data) return;

    const { bill, sells } = data;
    const customer = bill.customer || {};
    const items = sells || [];

    const workbook = XLSX.utils.book_new();
    const invoiceRows = [];
    invoiceRows.push([`Invoice #${bill.billNumber}`]);
    invoiceRows.push([`Date: ${formatDate(bill.date)}`]);
    invoiceRows.push([`Customer: ${customer.fullname || "-"}`]);
    if (customer.phoneNumber) invoiceRows.push([`Phone: ${customer.phoneNumber}`]);
    if (customer.address) invoiceRows.push([`Address: ${customer.address}`]);
    if (bill.notes) invoiceRows.push([`Notes: ${bill.notes}`]);
    invoiceRows.push([]);
    invoiceRows.push(["Product", "Quantity", "Unit Price", "Discount %", "Total"]);
    items.forEach((item) => {
      invoiceRows.push([
        item.product?.name || "Unknown",
        item.amount,
        parseFloat(item.unit_price).toFixed(2),
        `${item.discount_percent || 0}%`,
        parseFloat(item.total).toFixed(2),
      ]);
    });
    invoiceRows.push([]);
    invoiceRows.push(["Total:", "", "", "", parseFloat(bill.totalAmount).toFixed(2)]);
    if (bill.discount_percent && parseFloat(bill.discount_percent) > 0) {
      invoiceRows.push(["Discount:", `${bill.discount_percent}%`, "", "", parseFloat(bill.discounted_amount).toFixed(2)]);
    }
    invoiceRows.push(["Paid:", "", "", "", parseFloat(bill.paidAmount).toFixed(2)]);
    invoiceRows.push(["Remaining:", "", "", "", parseFloat(bill.remainingAmount).toFixed(2)]);
    invoiceRows.push(["Status:", bill.status === "paid" ? "Paid" : bill.status === "partial" ? "Partial" : "Unpaid"]);
    invoiceRows.push([]);
    invoiceRows.push([`Generated: `, `${moment().format("YYYY/MM/DD HH:mm")}`]);

    const wsInvoice = XLSX.utils.aoa_to_sheet(invoiceRows);
    wsInvoice["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsInvoice, "Invoice");

    const rawData = items.map((item) => ({
      "Product ID": item.productId,
      "Product Name": item.product?.name || "Unknown",
      Quantity: item.amount,
      "Unit Price": item.unit_price,
      "Discount %": item.discount_percent,
      "Discount Amount": item.discounted_amount,
      Total: item.total,
    }));
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(workbook, wsRaw, "Raw Data");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Invoice_${bill.billNumber}.xlsx`);
  };

  if (!billId) {
    return <div className="p-4 text-yellow-700">No bill ID provided.</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDownloadPDF}
        disabled={loading}
        className="bg-cyan-800 text-white px-5 py-2 rounded hover:bg-cyan-700 disabled:bg-gray-400 transition"
      >
        {loading ? "Generating PDF..." : "PDF"}
      </button>
      <button
        onClick={handleDownloadExcel}
        disabled={loading}
        className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 transition"
      >
        {loading ? "Generating Excel..." : "Excel"}
      </button>
    </div>
  );
};

export default BillExport;