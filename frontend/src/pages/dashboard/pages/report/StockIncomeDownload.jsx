import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";
moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellerIncomeDownload = ({ sellerId }) => {
    const [type, setType] = useState("");
    const [dateRange, setDateRange] = useState({
        from: "",
        to: ""
    });
    const [loading, setLoading] = useState(false);

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
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            if (fromDate > toDate) {
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
                        params: {
                            from: dateRange.from,
                            to: dateRange.to
                        }
                    }
                );
                data = response.data.data;
            } else {
                // ✅ CORRECTED ENDPOINT – no extra '/seller' segment
                const response = await axios.get(
                    `${BASE_URL}/sellerAccount/${sellerId}/${type}`
                );
                data = response.data.data;
            }

            const items = type === "dateRange" ? data.items : data.items || [];
            const sellerName = type === "dateRange"
                ? data.seller?.fullname
                : data.sellerName || "Seller";
            const totalCount = type === "dateRange"
                ? data.summary?.totalItems
                : data.totalCount || items.length;
            const totalMoney = type === "dateRange"
                ? data.summary?.totalMoney
                : data.totalMoney || 0;
            const totalReceipt = type === "dateRange"
                ? data.summary?.totalReceipt
                : data.totalReceipt || 0;
            const totalRemaining = type === "dateRange"
                ? data.summary?.totalRemaining
                : data.totalRemaining || 0;

            if (!items || items.length === 0) {
                alert("No data found");
                return;
            }

            const doc = new jsPDF({
                orientation: "p",
                unit: "pt",
                format: "a4",
            });
            doc.setR2L(false);

            doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
            doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
            doc.setFont("Vazirmatn");

            let titleText = `${getTypeTitle(type)} Report - ${sellerName}`;
            if (type === "dateRange" && dateRange.from && dateRange.to) {
                const fromFormatted = moment(dateRange.from).format("YYYY/M/D");
                const toFormatted = moment(dateRange.to).format("YYYY/M/D");
                titleText = `Sells Report from ${fromFormatted} to ${toFormatted} - ${sellerName}`;
            }

            doc.setFontSize(14);
            doc.text(titleText, doc.internal.pageSize.width - 40, 120, { align: "right" });

            const headers = [
                ["Remaining", "Received", "Total", "Quantity", "Product Name", "Date", "ID"]
            ];

            const body = items.map((item) => [
                item.remaining?.toLocaleString() || "0",
                item.receipt?.toLocaleString() || "0",
                item.money?.toLocaleString() || "0",
                item.qnty?.toLocaleString() || "0",
                item.name || "-",
                moment(item.createdAt).format("YYYY/M/D"),
                item.id?.toString().slice(-8) || "-",
            ]);

            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const tableWidth = pageWidth - (margin * 2);

            const columnWidths = {
                0: tableWidth * 0.12,
                1: tableWidth * 0.12,
                2: tableWidth * 0.12,
                3: tableWidth * 0.10,
                4: tableWidth * 0.24,
                5: tableWidth * 0.16,
                6: tableWidth * 0.14,
            };

            autoTable(doc, {
                startY: 140,
                margin: { left: margin, right: margin, top: 140, bottom: 80 },
                head: headers,
                body: body,
                styles: {
                    font: "Vazirmatn",
                    fontSize: 8,
                    halign: "center",
                    valign: "middle",
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.5,
                },
                headStyles: {
                    font: "Vazirmatn",
                    fontStyle: "normal",
                    fillColor: [220, 220, 220],
                    textColor: 20,
                    halign: "center",
                    fontSize: 9,
                },
                columnStyles: {
                    0: { cellWidth: columnWidths[0] },
                    1: { cellWidth: columnWidths[1] },
                    2: { cellWidth: columnWidths[2] },
                    3: { cellWidth: columnWidths[3] },
                    4: { cellWidth: columnWidths[4] },
                    5: { cellWidth: columnWidths[5] },
                    6: { cellWidth: columnWidths[6] },
                },
            });

            const today = moment().format("YYYY/M/D");
            const y = doc.lastAutoTable.finalY + 30;
            const summaryX = pageWidth - margin;

            doc.setFontSize(11);
            doc.text(`Total sells: ${totalCount}`, summaryX, y, { align: "right" });
            doc.text(`Total Amount: ${totalMoney?.toLocaleString()} AFN`, summaryX, y + 18, { align: "right" });
            doc.text(`Received: ${totalReceipt?.toLocaleString()} AFN`, summaryX, y + 36, { align: "right" });
            doc.text(`Remaining: ${totalRemaining?.toLocaleString()} AFN`, summaryX, y + 54, { align: "right" });

            if (type === "dateRange") {
                const fromFormatted = moment(dateRange.from).format("YYYY/M/D");
                const toFormatted = moment(dateRange.to).format("YYYY/M/D");
                doc.text(`Date Range: ${fromFormatted} - ${toFormatted}`, summaryX, y + 72, { align: "right" });
                doc.text(`Issued: ${today}`, summaryX, y + 90, { align: "right" });
            } else {
                doc.text(`Issued: ${today}`, summaryX, y + 72, { align: "right" });
            }

            const pageCount = doc.internal.getNumberOfPages();
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(10);
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, { align: "right" });
            }

            let filename = `${type}_${sellerName}_${moment().format("YYYY-M-D")}`;
            if (type === "dateRange") {
                const fromFormatted = moment(dateRange.from).format("YYYY-M-D");
                const toFormatted = moment(dateRange.to).format("YYYY-M-D");
                filename = `sells_${fromFormatted}_to_${toFormatted}_${sellerName}.pdf`;
            } else {
                filename = `${type}_${sellerName}_${moment().format("YYYY-M-D")}.pdf`;
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
            <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">From:</label>
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="border p-2 rounded bg-white text-black"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">To:</label>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="border p-2 rounded bg-white text-black"
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
        case "orderId": return "All Orders";
        case "receiptOrders": return "Paid Orders";
        case "remainOrders": return "Unpaid Orders";
        case "dateRange": return "Date Range";
        default: return "";
    }
}