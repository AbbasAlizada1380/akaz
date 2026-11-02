import React, { useState } from "react";
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

const SellerIncomeDownload = ({ sellerId }) => {
  const [type, setType] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFromChange = (date) => {
    setFromDate(date);
    const jsDate = date?.toDate ? date.toDate() : date;
    setDateRange((prev) => ({ ...prev, from: formatGregorian(jsDate) }));
  };

  const handleToChange = (date) => {
    setToDate(date);
    const jsDate = date?.toDate ? date.toDate() : date;
    setDateRange((prev) => ({ ...prev, to: formatGregorian(jsDate) }));
  };

  const handleDownload = async () => {
    if (!type) {
      alert("Please select a report type");
      return;
    }

    if (type === "dateRange") {
      if (!dateRange.from || !dateRange.to) {
        alert("Please specify the date range");
        return;
      }
      const fromD = new Date(dateRange.from);
      const toD = new Date(dateRange.to);
      if (fromD > toD) {
        alert("Start date cannot be later than end date");
        return;
      }
    }

    try {
      setLoading(true);

      let data;

      if (type === "dateRange") {
        const response = await axios.get(
          `${BASE_URL}/sellerAccount/seller/${sellerId}/date_range`,
          {
            params: { from: dateRange.from, to: dateRange.to },
          }
        );
        data = response.data.data;
      } else {
        const response = await axios.get(
          `${BASE_URL}/sellerAccount/${sellerId}/${type}`
        );
        data = response.data.data;
      }

      const items = data.items || [];
      const sellerName =
        type === "dateRange"
          ? data.seller?.fullname
          : data.sellerName || "Seller";
      
      // ✅ Extract total values from summary
      const totalCount =
        type === "dateRange"
          ? data.summary?.totalItems || items.length
          : data.totalCount || items.length;
      const totalMoney =
        type === "dateRange"
          ? data.summary?.totalMoney || 0
          : data.totalMoney || 0;

      if (!items || items.length === 0) {
        alert("No data found");
        return;
      }

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false);
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      let titleText = `${getTypeTitle(type)} Report - ${sellerName}`;
      if (type === "dateRange" && dateRange.from && dateRange.to) {
        const fromFormatted = formatShamsi(dateRange.from);
        const toFormatted = formatShamsi(dateRange.to);
        titleText = `Sells Report from ${fromFormatted} to ${toFormatted} - ${sellerName}`;
      }

      doc.setFontSize(14);
      doc.text(titleText, doc.internal.pageSize.width - 40, 120, {
        align: "right",
      });

      // ✅ Corrected 6 headers
      const headers = [
        [
          "Unit Price", 
          "Quantity",
          "Product Name",
          "Code",
          "Date",
          "ID",
        ],
      ];

      // ✅ Corrected 6 body columns
      const body = items.map((item) => [
        Number(item.unit_price || 0).toLocaleString(), 
        Number(item.amount || item.qnty || 0).toLocaleString(), 
        item.name || "-",
        item.code_number || "-", 
        formatShamsi(item.createdAt),
        item.id?.toString().slice(-6) || "-",
      ]);

      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const tableWidth = pageWidth - margin * 2;

      // ✅ Adjusted column widths for exactly 6 columns
      const columnWidths = {
        0: tableWidth * 0.16, // Unit Price
        1: tableWidth * 0.12, // Quantity
        2: tableWidth * 0.28, // Product Name
        3: tableWidth * 0.16, // Code
        4: tableWidth * 0.16, // Date
        5: tableWidth * 0.12, // ID
      };

      autoTable(doc, {
        startY: 140,
        margin: { left: margin, right: margin, top: 140, bottom: 80 },
        head: headers,
        body: body,
        styles: {
          font: "Vazirmatn",
          fontSize: 9,
          halign: "center",
          valign: "middle",
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          fillColor: [220, 220, 220],
          textColor: 20,
          halign: "center",
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: columnWidths[0] },
          1: { cellWidth: columnWidths[1] },
          2: { cellWidth: columnWidths[2] },
          3: { cellWidth: columnWidths[3] },
          4: { cellWidth: columnWidths[4] },
          5: { cellWidth: columnWidths[5] },
        },
      });

      const today = formatShamsi(new Date());
      const y = doc.lastAutoTable.finalY + 30;
      const summaryX = pageWidth - margin;

      doc.setFontSize(11);
      doc.text(`Total sells: ${totalCount}`, summaryX, y, { align: "right" });
      
      doc.text(
        `Total Amount: ${Number(totalMoney || 0).toLocaleString()} AFN`,
        summaryX,
        y + 20,
        { align: "right" }
      );

      if (type === "dateRange") {
        const fromFormatted = formatShamsi(dateRange.from);
        const toFormatted = formatShamsi(dateRange.to);
        doc.text(
          `Date Range: ${fromFormatted} - ${toFormatted}`,
          summaryX,
          y + 40,
          { align: "right" }
        );
        doc.text(`Issued: ${today}`, summaryX, y + 60, { align: "right" });
      } else {
        doc.text(`Issued: ${today}`, summaryX, y + 40, { align: "right" });
      }

      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, {
          align: "right",
        });
      }

      let filename = `${type}_${sellerName}_${formatShamsiFilename(new Date())}`;
      if (type === "dateRange") {
        const fromFormatted = formatShamsiFilename(dateRange.from);
        const toFormatted = formatShamsiFilename(dateRange.to);
        filename = `sells_${fromFormatted}_to_${toFormatted}_${sellerName}.pdf`;
      } else {
        filename = `${type}_${sellerName}_${formatShamsiFilename(
          new Date()
        )}.pdf`;
      }

      doc.save(filename);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-2 rounded bg-white text-black"
        >
          <option value="">Select report type</option>
          <option value="orderId">All sells</option>
          <option value="receiptOrders">Paid sells</option>
          <option value="remainOrders">Unpaid orders</option>
          <option value="dateRange">Date range</option>
        </select>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-cyan-800 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {type === "dateRange" && (
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <DatePicker
              value={fromDate}
              onChange={handleFromChange}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border p-2 rounded bg-white text-black cursor-pointer min-w-[120px]"
              placeholder="Start Date"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <DatePicker
              value={toDate}
              onChange={handleToChange}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border p-2 rounded bg-white text-black cursor-pointer min-w-[120px]"
              placeholder="End Date"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerIncomeDownload;

function getTypeTitle(type) {
  switch (type) {
    case "orderId":
      return "All Orders";
    case "receiptOrders":
      return "Paid Orders";
    case "remainOrders":
      return "Unpaid Orders";
    case "dateRange":
      return "Date Range";
    default:
      return "";
  }
}