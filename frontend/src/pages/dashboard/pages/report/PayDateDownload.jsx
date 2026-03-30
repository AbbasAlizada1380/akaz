import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const PayDateDownload = () => {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingSellers, setLoadingSellers] = useState(false);

    // Fetch sellers on component mount
    useEffect(() => {
        fetchSellers();
    }, []);

    const fetchSellers = async () => {
        setLoadingSellers(true);
        try {
            const res = await axios.get(`${BASE_URL}/seller?limit=200`);
            setSellers(res.data.data || []);
        } catch (err) {
            console.error("Error fetching sellers:", err);
        } finally {
            setLoadingSellers(false);
        }
    };

    const handleDownload = async () => {
        if (!from || !to) {
            alert("Please select a date range");
            return;
        }

        // Validate date range
        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (fromDate > toDate) {
            alert("Start date cannot be later than end date");
            return;
        }

        try {
            setLoading(true);

            // Build params with optional seller filter
            const params = { from, to };
            if (selectedSeller) {
                params.sellerId = selectedSeller;
            }

            const response = await axios.get(`${BASE_URL}/pay/date-range`, {
                params,
            });

            // Extract data from the response structure
            const data = response.data.data;

            if (!data?.pays || data.pays.length === 0) {
                alert("No payments found in this period");
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

            // Format dates in Gregorian
            const formattedFrom = moment(from).format("YYYY/M/D");
            const formattedTo = moment(to).format("YYYY/M/D");
            const today = moment().format("YYYY/M/D");

            // Get selected seller name for display
            const selectedSellerName = selectedSeller
                ? sellers.find(s => s.id === parseInt(selectedSeller))?.fullname
                : "All Sellers";

            // Title with date range
            let titleText = `Payments Report from ${formattedFrom} to ${formattedTo}`;
            if (selectedSellerName !== "All Sellers") {
                titleText += ` - ${selectedSellerName}`;
            }

            doc.setFontSize(14);
            doc.text(titleText, doc.internal.pageSize.width - 40, 120, { align: "right" });

            // Table headers
            const headers = [
                ["Amount (AFN)", "Seller", "Date", "Payment ID"]
            ];

            // Table body - Using Gregorian format for dates
            const body = data.pays.map((pay) => [
                parseFloat(pay.amount).toLocaleString(),
                pay.sellerInfo?.fullname || "Unknown",
                moment(pay.createdAt).format("YYYY/M/D"),
                pay.id.toString().slice(-8) || "-", // Last 8 digits of ID
            ]);

            // Calculate available width
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const tableWidth = pageWidth - (margin * 2);

            // Calculate column widths
            const columnWidths = {
                0: tableWidth * 0.30, // Amount - 30%
                1: tableWidth * 0.30, // Seller - 30%
                2: tableWidth * 0.20, // Date - 20%
                3: tableWidth * 0.20, // Payment ID - 20%
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

            doc.text(`Total Payments: ${data.totalCount || 0}`, summaryX, y, { align: "right" });
            doc.text(`Total Amount: ${(data.totalAmount || 0).toLocaleString()} AFN`, summaryX, y + 18, { align: "right" });

            // Date range and export info
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

            // Generate filename
            const sellerPart = selectedSellerName !== "All Sellers" ? `_${selectedSellerName}` : "";
            const filename = `payments_${formattedFrom}_to_${formattedTo}${sellerPart}_${today}.pdf`;

            doc.save(filename);

        } catch (err) {
            console.error("Error downloading payments:", err);
            alert(err.response?.data?.message || "Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Download Payments Report</h2>

            <div className="space-y-4">
                {/* Seller Selection */}
                <div className="grid grid-cols-1 gap-2">
                    <label className="text-sm font-medium text-gray-700">Select Seller</label>
                    <select
                        value={selectedSeller}
                        onChange={(e) => setSelectedSeller(e.target.value)}
                        className="w-full border p-2.5 rounded bg-white text-black"
                        disabled={loadingSellers}
                    >
                        <option value="" className="text-black bg-white">
                            All Sellers
                        </option>
                        {sellers.map((seller) => (
                            <option key={seller.id} value={seller.id} className="text-black bg-white">
                                {seller.fullname} {seller.phoneNumber ? `- ${seller.phoneNumber}` : ''}
                            </option>
                        ))}
                    </select>
                    {loadingSellers && (
                        <span className="text-sm text-gray-500">Loading...</span>
                    )}
                </div>

                {/* Date Range Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">From Date</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full border p-2.5 rounded bg-white text-black"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">To Date</label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full border p-2.5 rounded bg-white text-black"
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
                    ) : "Download Payments Report"}
                </button>
            </div>
        </div>
    );
};

export default PayDateDownload;