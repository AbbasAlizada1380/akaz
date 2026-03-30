import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockIncomeDateDownload = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departments, setDepartments] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Fetch departments and sellers for filter dropdowns
  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const [deptRes, sellerRes] = await Promise.all([
          axios.get(`${BASE_URL}/department?limit=200`),
          axios.get(`${BASE_URL}/seller?limit=200`),
        ]);
        setDepartments(deptRes.data.departments || []);
        setSellers(sellerRes.data.sellers || []);
      } catch (err) {
        console.error("Error fetching filters:", err);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

  const handleDownloadPDF = async () => {
    if (!fromDate || !toDate) {
      alert("Please select a date range");
      return;
    }

    try {
      setLoading(true);
      const params = { from: fromDate, to: toDate };
      if (selectedDepartment) params.departmentId = selectedDepartment;
      if (selectedSeller) params.sellerId = selectedSeller;

      const response = await axios.get(`${BASE_URL}/stockIncome/date_range`, { params });
      const { data } = response.data;

      if (!data?.stockIncomes || data.stockIncomes.length === 0) {
        alert("No stock income records found in this period");
        return;
      }

      const items = data.stockIncomes;
      const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const totalAmount = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const totalReceived = items.reduce((sum, i) => sum + (Number(i.received) || 0), 0);
      const totalRemaining = totalAmount - totalReceived;

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" }); // landscape for more columns
      doc.setR2L(false);

      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const formattedFrom = moment(fromDate).format("YYYY/MM/DD");
      const formattedTo = moment(toDate).format("YYYY/MM/DD");
      const title = `Stock Income Report (${formattedFrom} - ${formattedTo})`;
      doc.setFontSize(14);
      doc.text(title, doc.internal.pageSize.width - 40, 60, { align: "right" });

      const headers = [["Name", "Seller", "Date", "Quantity", "Total (AFN)", "Received (AFN)", "Remaining (AFN)"]];
      const body = items.map((item) => [
        item.name || "-",
        item.seller?.fullname || "Unknown",
        moment(item.createdAt).format("YYYY/MM/DD"),
        item.quantity || 0,
        Number(item.total).toLocaleString(),
        Number(item.received).toLocaleString(),
        Number(item.remaining).toLocaleString(),
      ]);

      autoTable(doc, {
        startY: 80,
        head: headers,
        body: body,
        theme: "grid",
        styles: { font: "Vazirmatn", fontSize: 9, halign: "center", valign: "middle" },
        headStyles: { fillColor: [220, 220, 220], textColor: 20, fontSize: 10 },
        margin: { top: 80, bottom: 60, left: 20, right: 20 },
      });

      const finalY = doc.lastAutoTable.finalY + 30;
      const summaryX = doc.internal.pageSize.width - 40;
      doc.setFontSize(11);
      doc.text(`Total Records: ${items.length}`, summaryX, finalY, { align: "right" });
      doc.text(`Total Quantity: ${totalQuantity}`, summaryX, finalY + 18, { align: "right" });
      doc.text(`Total Amount: ${totalAmount.toLocaleString()} AFN`, summaryX, finalY + 36, { align: "right" });
      doc.text(`Total Received: ${totalReceived.toLocaleString()} AFN`, summaryX, finalY + 54, { align: "right" });
      doc.text(`Total Remaining: ${totalRemaining.toLocaleString()} AFN`, summaryX, finalY + 72, { align: "right" });
      doc.text(`Generated on: ${moment().format("YYYY/MM/DD")}`, summaryX, finalY + 90, { align: "right" });

      // Page numbers
      const pageCount = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, { align: "right" });
      }

      doc.save(`stock_income_${formattedFrom}_to_${formattedTo}.pdf`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!fromDate || !toDate) {
      alert("Please select a date range");
      return;
    }

    try {
      setLoading(true);
      const params = { from: fromDate, to: toDate };
      if (selectedDepartment) params.departmentId = selectedDepartment;
      if (selectedSeller) params.sellerId = selectedSeller;

      const response = await axios.get(`${BASE_URL}/stockIncome/date-range`, { params });
      const { data } = response.data;

      if (!data?.stockIncomes || data.stockIncomes.length === 0) {
        alert("No stock income records found in this period");
        return;
      }

      const items = data.stockIncomes;
      const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const totalAmount = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const totalReceived = items.reduce((sum, i) => sum + (Number(i.received) || 0), 0);
      const totalRemaining = totalAmount - totalReceived;

      // Prepare data for Excel
      const excelData = items.map((item) => ({
        Name: item.name || "-",
        Seller: item.seller?.fullname || "Unknown",
        Department: item.department?.name || "-",
        Date: moment(item.createdAt).format("YYYY/MM/DD"),
        Quantity: item.quantity || 0,
        "Unit Price": Number(item.unitPrice).toLocaleString(),
        "Total (AFN)": Number(item.total).toLocaleString(),
        "Received (AFN)": Number(item.received).toLocaleString(),
        "Remaining (AFN)": Number(item.remaining).toLocaleString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Income");

      // Add summary sheet
      const summaryData = [
        ["Summary Report"],
        ["Date Range", `${moment(fromDate).format("YYYY/MM/DD")} - ${moment(toDate).format("YYYY/MM/DD")}`],
        ["Total Records", items.length],
        ["Total Quantity", totalQuantity],
        ["Total Amount (AFN)", totalAmount],
        ["Total Received (AFN)", totalReceived],
        ["Total Remaining (AFN)", totalRemaining],
        ["Generated On", moment().format("YYYY/MM/DD HH:mm:ss")],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, `stock_income_${moment().format("YYYY-MM-DD")}.xlsx`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Stock Income Report by Date Range</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Department Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="mt-1 w-full border p-2 rounded bg-white"
            disabled={loadingFilters}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Seller Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Seller</label>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="mt-1 w-full border p-2 rounded bg-white"
            disabled={loadingFilters}
          >
            <option value="">All Sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.fullname}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleDownloadPDF}
          disabled={loading || !fromDate || !toDate}
          className="bg-cyan-800 text-white px-5 py-2 rounded hover:bg-cyan-700 disabled:bg-gray-400 transition"
        >
          {loading ? "Generating PDF..." : "Download PDF"}
        </button>
        <button
          onClick={handleDownloadExcel}
          disabled={loading || !fromDate || !toDate}
          className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 transition"
        >
          {loading ? "Generating Excel..." : "Download Excel"}
        </button>
      </div>
    </div>
  );
};

export default StockIncomeDateDownload;