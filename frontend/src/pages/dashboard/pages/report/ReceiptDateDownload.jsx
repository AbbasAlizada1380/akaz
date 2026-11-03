import React, { useState, useEffect } from "react";
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

const ReceiptDateDownload = () => {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Fetch customers on component mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const res = await axios.get(`${BASE_URL}/customer?limit=200`);
            setCustomers(res.data.customers || []);
        } catch (err) {
            console.error("Error fetching customers:", err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleFromChange = (date) => {
        setFromDate(date);
        const jsDate = date?.toDate ? date.toDate() : date;
        setFrom(formatGregorian(jsDate));
    };

    const handleToChange = (date) => {
        setToDate(date);
        const jsDate = date?.toDate ? date.toDate() : date;
        setTo(formatGregorian(jsDate));
    };

    const handleDownload = async () => {
        if (!from || !to) {
            alert("Please select a date range");
            return;
        }

        // Validate date range
        const fromD = new Date(from);
        const toD = new Date(to);

        if (fromD > toD) {
            alert("Start date cannot be later than end date");
            return;
        }

        try {
            setLoading(true);

            // Build params with optional customer filter
            const params = { from, to };
            if (selectedCustomer) {
                params.customerId = selectedCustomer;
            }

            const response = await axios.get(`${BASE_URL}/receive/date_range`, {
                params,
            });

            // Extract data from the response structure
            const data = response.data.data;

            if (!data?.receives || data.receives.length === 0) {
                alert("No receipts found in this period");
                return;
            }

            const doc = new jsPDF({
                orientation: "p",
                unit: "pt",
                format: "a4",
            });
            doc.setR2L(false);

            // Add Font
            doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
            doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
            doc.setFont("Vazirmatn");

            /* ✅ Shamsi dates for Title */
            const formattedFrom = formatShamsi(from);
            const formattedTo = formatShamsi(to);
            const today = formatShamsi(new Date());

            // Get selected customer name for display
            const selectedCustomerName = selectedCustomer
                ? customers.find(c => c.id === parseInt(selectedCustomer))?.fullname
                : "All Customers";

            // Title with date range
            let titleText = `Receipts Report from ${formattedFrom} to ${formattedTo}`;
            if (selectedCustomerName !== "All Customers") {
                titleText += ` - ${selectedCustomerName}`;
            }

            doc.setFontSize(14);
            doc.text(titleText, doc.internal.pageSize.width - 40, 120, { align: "right" });

            // Table headers
            const headers = [
                ["Amount (AFN)", "Customer", "Date", "Receipt ID"]
            ];

            // Table body - ✅ Shamsi dates
            const body = data.receives.map((receive) => [
                parseFloat(receive.amount).toLocaleString(),
                receive.customerInfo?.fullname || "Unknown",
                formatShamsi(receive.createdAt),
                receive.id.toString().slice(-8) || "-",
            ]);

            // Calculate available width
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const tableWidth = pageWidth - (margin * 2);

            // Calculate column widths
            const columnWidths = {
                0: tableWidth * 0.30, // Amount
                1: tableWidth * 0.30, // Customer
                2: tableWidth * 0.20, // Date
                3: tableWidth * 0.20, // Receipt ID
            };

            autoTable(doc, {
                startY: 140,
                margin: {
                    left: margin,
                    right: margin,
                    top: 140,
                    bottom: 80
                },
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
                },
            });

            const y = doc.lastAutoTable.finalY + 30;
            const summaryX = pageWidth - margin;

            // Summary section
            doc.setFontSize(11);

            doc.text(`Total Receipts: ${data.totalCount || 0}`, summaryX, y, { align: "right" });
            doc.text(`Total Amount: ${(data.totalAmount || 0).toLocaleString()} AFN`, summaryX, y + 18, { align: "right" });

            // Date range and export info - ✅ Shamsi
            doc.text(`Period: ${formattedFrom} to ${formattedTo}`, summaryX, y + 36, { align: "right" });
            doc.text(`Generated on: ${today}`, summaryX, y + 54, { align: "right" });

            // Add page numbers
            const pageCount = doc.internal.getNumberOfPages();
            const pageHeight = doc.internal.pageSize.height;

            doc.setFontSize(10);

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(
                    `${i}/${pageCount}`,
                    pageWidth - 40,
                    pageHeight - 40,
                    { align: "right" }
                );
            }

            // Generate filename - ✅ Shamsi
            const customerPart = selectedCustomerName !== "All Customers" ? `_${selectedCustomerName}` : "";
            const filename = `receipts_${formatShamsiFilename(from)}_to_${formatShamsiFilename(to)}${customerPart}.pdf`;

            doc.save(filename);

        } catch (err) {
            console.error("Error downloading receipts:", err);
            alert(err.response?.data?.message || "Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Download Receipts Report</h2>

            <div className="space-y-4">
                {/* Customer Selection */}
                <div className="grid grid-cols-1 gap-2">
                    <label className="text-sm font-medium text-gray-700">Select Customer</label>
                    <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="w-full border p-2.5 rounded bg-white text-black"
                        disabled={loadingCustomers}
                    >
                        <option value="" className="text-black bg-white">
                            All Customers
                        </option>
                        {customers.map((customer) => (
                            <option key={customer.id} value={customer.id} className="text-black bg-white">
                                {customer.fullname} {customer.phoneNumber ? `- ${customer.phoneNumber}` : ''}
                            </option>
                        ))}
                    </select>
                    {loadingCustomers && (
                        <span className="text-sm text-gray-500">Loading...</span>
                    )}
                </div>

                {/* ✅ Shamsi Date Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">From Date</label>
                        <DatePicker
                            value={fromDate}
                            onChange={handleFromChange}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            format="YYYY/MM/DD"
                            editable={false}
                            inputClass="w-full border p-2.5 rounded bg-white text-black cursor-pointer"
                            placeholder="Select Start Date"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">To Date</label>
                        <DatePicker
                            value={toDate}
                            onChange={handleToChange}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            format="YYYY/MM/DD"
                            editable={false}
                            inputClass="w-full border p-2.5 rounded bg-white text-black cursor-pointer"
                            placeholder="Select End Date"
                        />
                    </div>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    disabled={loading || !from || !to}
                    className="w-full bg-primary text-white px-6 py-3 rounded disabled:bg-gray-400 transition-colors text-sm sm:text-base font-medium"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Generating PDF...</span>
                        </span>
                    ) : "Download Receipts Report"}
                </button>
            </div>
        </div>
    );
};

export default ReceiptDateDownload;