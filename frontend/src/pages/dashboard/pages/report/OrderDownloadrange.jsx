import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";
moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const OrderDownloadrange = ({ customerId }) => {
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
                items.forEach(item => {
                    const bId = item.billId || 'unknown';
                    if (!groupedBills[bId]) {
                        groupedBills[bId] = {
                            billNumber: item.billNumber || "-",
                            billDate: item.billDate,
                            items: [],
                            subtotal: 0
                        };
                    }
                    groupedBills[bId].items.push(item);
                    groupedBills[bId].subtotal += (item.benefitAmount || 0);
                });

                // 2. Build the flat table body
                const tableBody = [];
                
                Object.values(groupedBills).forEach((group) => {
                    // Push individual items for this bill
                    group.items.forEach(item => {
                        tableBody.push([
                            item.billNumber,
                            item.departmentName || "-",
                            item.sellDetails ? `${item.sellDetails.amount}x Unit(${item.sellDetails.unit_price})` : "-",
                            item.billDate ? moment(item.billDate).format("YYYY/M/D") : "-",
                            item.benefitAmount?.toLocaleString() || "0"
                        ]);
                    });

                    // Push the subtotal row for this bill
                    tableBody.push([
                        {
                            content: `Subtotal for Bill ${group.billNumber}`,
                            colSpan: 4,
                            styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] }
                        },
                        {
                            content: group.subtotal.toLocaleString(),
                            styles: { fontStyle: "bold", fillColor: [245, 245, 245] }
                        }
                    ]);
                });
                // --- GROUPING AND SUBTOTAL LOGIC END ---

                const headers = [
                    ["Bill #", "Department", "Product Details", "Date", "Benefit Amount"]
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

                doc.text(`Total Bills: ${Object.keys(groupedBills).length}`, summaryX, currentY, { align: "right" });
                doc.text(`Total Benefit Amount: ${data.summary?.totalBenefitAmount?.toLocaleString() || 0} AFN`, summaryX, currentY + 18, { align: "right" });
                doc.text(`Issued: ${moment().format("YYYY/M/D")}`, summaryX, currentY + 36, { align: "right" });

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
                const customerName = data?.customerName || data?.customer?.fullname || "Customer";
                const totalCount = data?.totalCount || data?.summary?.totalItems || items.length;
                const totalMoney = data?.totalMoney || data?.summary?.totalMoney || 0;
                const totalReceipt = data?.totalReceipt || data?.summary?.totalReceipt || 0;
                const totalRemaining = data?.totalRemaining || data?.summary?.totalRemaining || 0;
                const totalOwes = data?.totalOwes || data?.summary?.totalOwes || 0;
                const totalOwed = data?.totalOwed || data?.summary?.totalOwed || 0;

                if (items.length === 0) {
                    alert("No data found");
                    setLoading(false);
                    return;
                }

                let titleText = `${getTypeTitle(type)} Report - ${customerName}`;
                if (type === "dateRange" && dateRange.from && dateRange.to) {
                    const fromFormatted = moment(dateRange.from).format("YYYY/M/D");
                    const toFormatted = moment(dateRange.to).format("YYYY/M/D");
                    titleText = `Sells Report from ${fromFormatted} to ${toFormatted} - ${customerName}`;
                }

                doc.text(titleText, pageWidth - 40, 120, { align: "right" });

                const headers = [
                    ["Remaining", "Received", "Total", "Quantity", "Product Name", "Date", "ID"]
                ];

                const body = items.map((item) => [
                    item.remaining?.toLocaleString() || "0",
                    item.receipt?.toLocaleString() || "0",
                    item.money?.toLocaleString() || "0",
                    item.qnty?.toLocaleString() || "0",
                    item.fileName || "-",
                    moment(item.createdAt).format("YYYY/M/D"),
                    item.id?.toString().slice(-8) || "-",
                ]);

                const tableWidth = pageWidth - (margin * 2);
                const columnWidths = {
                    0: tableWidth * 0.12, 1: tableWidth * 0.12, 2: tableWidth * 0.12,
                    3: tableWidth * 0.10, 4: tableWidth * 0.24, 5: tableWidth * 0.16, 6: tableWidth * 0.14,
                };

                autoTable(doc, {
                    startY: currentY,
                    margin: { left: margin, right: margin },
                    head: headers,
                    body: body,
                    styles: {
                        font: "Vazirmatn", fontSize: 8, halign: "center",
                        valign: "middle", cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.5,
                    },
                    headStyles: {
                        font: "Vazirmatn", fontStyle: "normal", fillColor: [220, 220, 220],
                        textColor: 20, halign: "center", fontSize: 9,
                    },
                    columnStyles: {
                        0: { cellWidth: columnWidths[0] }, 1: { cellWidth: columnWidths[1] },
                        2: { cellWidth: columnWidths[2] }, 3: { cellWidth: columnWidths[3] },
                        4: { cellWidth: columnWidths[4] }, 5: { cellWidth: columnWidths[5] },
                        6: { cellWidth: columnWidths[6] },
                    },
                });

                currentY = doc.lastAutoTable.finalY + 30;
                doc.setFontSize(11);
                const summaryX = pageWidth - margin;

                doc.text(`Total sells: ${totalCount}`, summaryX, currentY, { align: "right" });
                doc.text(`Total Amount: ${totalMoney?.toLocaleString()} AFN`, summaryX, currentY + 18, { align: "right" });
                doc.text(`Received: ${totalReceipt?.toLocaleString()} AFN`, summaryX, currentY + 36, { align: "right" });
                doc.text(`Remaining: ${totalRemaining?.toLocaleString()} AFN`, summaryX, currentY + 54, { align: "right" });
                doc.text(`Total Owes: ${totalOwes?.toLocaleString()} AFN`, summaryX, currentY + 72, { align: "right" });
                doc.text(`Total Owed: ${totalOwed?.toLocaleString()} AFN`, summaryX, currentY + 90, { align: "right" });

                let bottomY = currentY + 108;

                if (type === "dateRange") {
                    const fromFormatted = moment(dateRange.from).format("YYYY/M/D");
                    const toFormatted = moment(dateRange.to).format("YYYY/M/D");
                    doc.text(`Date Range: ${fromFormatted} - ${toFormatted}`, summaryX, bottomY, { align: "right" });
                    bottomY += 18;
                }
                
                doc.text(`Issued: ${moment().format("YYYY/M/D")}`, summaryX, bottomY, { align: "right" });
            }

            // ==========================================
            // PAGE NUMBERS & SAVE (COMMON FOR BOTH)
            // ==========================================
            const pageCount = doc.internal.getNumberOfPages();
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(10);
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 40, { align: "right" });
            }

            // Filename generation
            let filename = `${type}_${moment().format("YYYY-M-D")}.pdf`;
            if (type === "dateRange") {
                const fromFormatted = moment(dateRange.from).format("YYYY-M-D");
                const toFormatted = moment(dateRange.to).format("YYYY-M-D");
                filename = `sells_${fromFormatted}_to_${toFormatted}.pdf`;
            } else {
                filename = `${type}_report_${moment().format("YYYY-M-D")}.pdf`;
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

            {/* Date Range Inputs */}
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