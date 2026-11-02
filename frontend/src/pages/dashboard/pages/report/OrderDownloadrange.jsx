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

const OrderDownloadrange = ({ customerId }) => {
  const [type, setType] = useState("");
  
  // Keep the Gregorian string for the backend
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // DateObjects for the UI
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
      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false);

      // Setup Font
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");
      doc.setFontSize(14);

      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;

      let currentY = 140;

      // ==========================================
      // 1. BENEFITS REPORT (DETAILS + SUBTOTAL PER BILL)
      // ==========================================
      if (type === "benefits") {
        const response = await axios.get(
          `${BASE_URL}/customerAccount/customer/${customerId}/benefits`
        );
        const data = response.data.data;
        const items = data?.benefits || [];
        const customerName = data?.customer?.fullname || "Customer";

        if (items.length === 0) {
          alert("No benefits found for this customer");
          setLoading(false);
          return;
        }

        const titleText = `Customer Benefits Report - ${customerName}`;
        doc.text(titleText, pageWidth - 40, 120, { align: "right" });

        // --- GROUPING AND SUBTOTAL LOGIC START ---
        const groupedBills = {};

        // 1. Group items by Bill
        items.forEach((item) => {
          const bId = item.billId || "unknown";
          if (!groupedBills[bId]) {
            groupedBills[bId] = {
              billNumber: item.billNumber || "-",
              billDate: item.billDate,
              items: [],
              subtotal: 0,
            };
          }
          groupedBills[bId].items.push(item);
          groupedBills[bId].subtotal += item.benefitAmount || 0;
        });

        // 2. Build the flat table body
        const tableBody = [];

        Object.values(groupedBills).forEach((group) => {
          // Push individual items for this bill
          group.items.forEach((item) => {
            tableBody.push([
              item.billNumber,
              item.departmentName || "-",
              item.sellDetails
                ? `${item.sellDetails.amount}x Unit(${item.sellDetails.unit_price})`
                : "-",
              /* ✅ Shamsi bill date */
              item.billDate ? formatShamsi(item.billDate) : "-",
              item.benefitAmount?.toLocaleString() || "0",
            ]);
          });

          // Push the subtotal row for this bill
          tableBody.push([
            {
              content: `Subtotal for Bill ${group.billNumber}`,
              colSpan: 4,
              styles: {
                halign: "right",
                fontStyle: "bold",
                fillColor: [245, 245, 245],
              },
            },
            {
              content: group.subtotal.toLocaleString(),
              styles: { fontStyle: "bold", fillColor: [245, 245, 245] },
            },
          ]);
        });
        // --- GROUPING AND SUBTOTAL LOGIC END ---

        const headers = [
          [
            "Bill #",
            "Department",
            "Product Details",
            "Date",
            "Benefit Amount",
          ],
        ];

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: headers,
          body: tableBody,
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
            fillColor: [220, 220, 220],
            textColor: 20,
            halign: "center",
            fontSize: 10,
          },
        });

        currentY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(11);
        const summaryX = pageWidth - margin;

        doc.text(
          `Total Bills: ${Object.keys(groupedBills).length}`,
          summaryX,
          currentY,
          { align: "right" }
        );
        doc.text(
          `Total Benefit Amount: ${
            data.summary?.totalBenefitAmount?.toLocaleString() || 0
          } AFN`,
          summaryX,
          currentY + 18,
          { align: "right" }
        );
        /* ✅ Shamsi issued date */
        doc.text(`Issued: ${formatShamsi(new Date())}`, summaryX, currentY + 36, {
          align: "right",
        });
      }
      // ==========================================
      // 2. SELLS REPORTS (EXISTING LOGIC)
      // ==========================================
      else {
        let data;
        if (type === "dateRange") {
          const response = await axios.get(
            `${BASE_URL}/customerAccount/customer/${customerId}/date_range`,
            { params: { from: dateRange.from, to: dateRange.to } }
          );
          data = response.data.data;
        } else {
          const response = await axios.get(
            `${BASE_URL}/customerAccount/${customerId}/${type}`
          );
          data = response.data.data;
        }

        const items = data?.items || [];
        const customerName =
          data?.customerName || data?.customer?.fullname || "Customer";
        const totalCount =
          data?.totalCount || data?.summary?.totalItems || items.length;
        const totalMoney =
          data?.totalMoney || data?.summary?.totalMoney || 0;
        const totalOwes = data?.totalOwes || data?.summary?.totalOwes || 0;
        const totalOwed = data?.totalOwed || data?.summary?.totalOwed || 0;

        if (items.length === 0) {
          alert("No data found");
          setLoading(false);
          return;
        }

        let titleText = `${getTypeTitle(type)} Report - ${customerName}`;
        if (type === "dateRange" && dateRange.from && dateRange.to) {
          /* ✅ Shamsi title dates */
          const fromFormatted = formatShamsi(dateRange.from);
          const toFormatted = formatShamsi(dateRange.to);
          titleText = `Sells Report from ${fromFormatted} to ${toFormatted} - ${customerName}`;
        }

        doc.text(titleText, pageWidth - 40, 120, { align: "right" });

        // ✅ Removed "Remaining" and "Received" columns
        const headers = [
          [
            "Total",
            "Quantity",
            "Product Name",
            "Date",
            "ID",
          ],
        ];

        // ✅ Updated body to match new headers
        const body = items.map((item) => [
          item.money?.toLocaleString() || "0",
          item.qnty?.toLocaleString() || "0",
          item.fileName || "-",
          /* ✅ Shamsi row date */
          formatShamsi(item.createdAt),
          item.id?.toString().slice(-8) || "-",
        ]);

        const tableWidth = pageWidth - margin * 2;
        // Adjusted column widths for 5 columns
        const columnWidths = {
          0: tableWidth * 0.15, // Total
          1: tableWidth * 0.12, // Quantity
          2: tableWidth * 0.33, // Product Name
          3: tableWidth * 0.20, // Date
          4: tableWidth * 0.20, // ID
        };

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
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
          },
        });

        currentY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(11);
        const summaryX = pageWidth - margin;

        doc.text(`Total sells: ${totalCount}`, summaryX, currentY, {
          align: "right",
        });
        doc.text(
          `Total Amount: ${totalMoney?.toLocaleString()} AFN`,
          summaryX,
          currentY + 18,
          { align: "right" }
        );

        let bottomY = currentY + 35;

        if (type === "dateRange") {
          /* ✅ Shamsi footer dates */
          const fromFormatted = formatShamsi(dateRange.from);
          const toFormatted = formatShamsi(dateRange.to);
          doc.text(
            `Date Range: ${fromFormatted} - ${toFormatted}`,
            summaryX,
            bottomY,
            { align: "right" }
          );
          bottomY += 18;
        }

        /* ✅ Shamsi issued date */
        doc.text(`Issued: ${formatShamsi(new Date())}`, summaryX, bottomY, {
          align: "right",
        });
      }

      // ==========================================
      // PAGE NUMBERS & SAVE (COMMON FOR BOTH)
      // ==========================================
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, {
          align: "right",
        });
      }

      // ✅ Shamsi filename generation
      let filename = `${type}_${formatShamsiFilename(new Date())}`;
      if (type === "dateRange") {
        const fromFormatted = formatShamsiFilename(dateRange.from);
        const toFormatted = formatShamsiFilename(dateRange.to);
        filename = `sells_${fromFormatted}_to_${toFormatted}.pdf`;
      } else {
        filename = `${type}_report_${formatShamsiFilename(new Date())}.pdf`;
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
          <option value="" className="text-black bg-white">
            Select report type
          </option>
          <option value="orderId" className="text-black bg-white">
            All sells
          </option>
          <option value="receiptOrders" className="text-black bg-white">
            Paid sells
          </option>
          <option value="remainOrders" className="text-black bg-white">
            Unpaid orders
          </option>
          <option value="dateRange" className="text-black bg-white">
            Date range
          </option>
          <option value="benefits" className="text-black bg-white font-bold">
            Customer Benefits
          </option>
        </select>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-cyan-800 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      {/* ✅ Shamsi Date Pickers */}
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

export default OrderDownloadrange;

// helpers
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
    case "benefits":
      return "Benefits";
    default:
      return "";
  }
}