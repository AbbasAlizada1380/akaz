// components/report/SellsDateDownloads.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import { Package, Download } from "lucide-react";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellsDateDownload = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [existId, setExistId] = useState("");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("summary"); // summary, detailed, both

  // Fetch the list of products so user can select
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await axios.get(`${BASE_URL}/stockExist?limit=1000`);
        if (res.data.success) {
          setProducts(res.data.data || []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Fetch products error:", err);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === String(existId));

  const handleDownload = async () => {
    if (!from || !to) {
      alert("Please select a date range.");
      return;
    }
    if (!existId) {
      alert("Please select a product.");
      return;
    }

    setLoading(true);
    try {
      const params = { from, to, existId };

      const { data } = await axios.get(`${BASE_URL}/sells/date-range`, { params });

      const sells = data.data?.sells || [];
      if (!sells || sells.length === 0) {
        alert("No sells found for this product in the selected period.");
        return;
      }

      const productInfo = sells[0].product || selectedProduct || {};
      const productName = productInfo.name || "Unknown Product";
      const codeNumber = productInfo.code_number || "-";

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.setR2L(false);
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const formattedFrom = moment(from).format("YYYY/MM/DD");
      const formattedTo = moment(to).format("YYYY/MM/DD");
      const today = moment().format("YYYY/MM/DD");

      // ========== TITLE ==========
      doc.setFontSize(16);
      doc.text("Product Sales Report", margin, 40, { align: "left" });
      doc.setFontSize(12);
      doc.text(`Product: ${productName}`, margin, 65, { align: "left" });
      doc.text(`Code #: ${codeNumber}`, margin, 85, { align: "left" });
      doc.text(`Period: ${formattedFrom} to ${formattedTo}`, margin, 105, { align: "left" });
      doc.text(`Generated: ${today}`, margin, 125, { align: "left" });

      const totalQty = sells.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const totalRevenue = sells.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const totalPaid = sells.reduce((sum, s) => sum + Number(s.receipt || 0), 0);
      const totalRemaind = sells.reduce((sum, s) => sum + Number(s.remaind || 0), 0);
      const avgSale = totalRevenue / sells.length;

      let currentY = 150;

      // ========== SUMMARY SECTION ==========
      if (reportType === "summary" || reportType === "both") {
        doc.setFontSize(14);
        doc.text("Summary", margin, currentY);
        currentY += 20;

        const summaryHeaders = [["Metric", "Value"]];
        const summaryBody = [
          ["Total Transactions", sells.length.toString()],
          ["Total Quantity Sold", `${totalQty} unit(s)`],
          ["Total Revenue", `${totalRevenue.toLocaleString()} AFN`],
          ["Total Received", `${totalPaid.toLocaleString()} AFN`],
          ["Total Remaining", `${totalRemaind.toLocaleString()} AFN`],
          ["Average Sale", `${avgSale.toLocaleString()} AFN`],
        ];

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: summaryHeaders,
          body: summaryBody,
          theme: "striped",
          styles: { font: "Vazirmatn", fontSize: 11, halign: "left", cellPadding: 8 },
          headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 200 },
            1: { cellWidth: 200 },
          },
        });

        currentY = doc.lastAutoTable.finalY + 20;
      }

      // ========== DETAILED TABLE ==========
      if (reportType === "detailed" || reportType === "both") {
        if (reportType === "both") {
          doc.addPage();
          currentY = 40;
        }

        doc.setFontSize(14);
        doc.text("Detailed Transactions", margin, currentY);
        currentY += 20;

        const detailedHeaders = [
          ["#", "Date", "Bill #", "Customer", "Qty", "Unit Price", "Total", "Paid", "Remaining"],
        ];

        const detailedBody = sells.map((sell, idx) => [
          (idx + 1).toString(),
          moment(sell.createdAt).format("YYYY/MM/DD"),
          sell.bill?.billNumber || "-",
          sell.bill?.billCustomer?.fullname || "N/A",
          Number(sell.amount).toString(),
          Number(sell.unit_price).toLocaleString(),
          Number(sell.total).toLocaleString(),
          Number(sell.receipt || 0).toLocaleString(),
          Number(sell.remaind || 0).toLocaleString(),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: detailedHeaders,
          body: detailedBody,
          theme: "grid",
          styles: {
            font: "Vazirmatn",
            fontSize: 8,
            halign: "center",
            valign: "middle",
            cellPadding: 5,
          },
          headStyles: {
            font: "Vazirmatn",
            fontStyle: "bold",
            fillColor: [70, 130, 180],
            textColor: 255,
            fontSize: 9,
            halign: "center",
          },
          foot: [["", "", "", "", totalQty.toString(), "", totalRevenue.toLocaleString(), totalPaid.toLocaleString(), totalRemaind.toLocaleString()]],
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
          },
        });

        currentY = doc.lastAutoTable.finalY + 20;
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 30, { align: "right" });
      }

      const safeName = productName.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
      const filename = `Sells_${safeName}_${formattedFrom}_to_${formattedTo}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Error retrieving sells data.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow border border-primary/20">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Package size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Product Sales Report</h2>
          <p className="text-xs text-gray-500">
            Download sales history for a specific product
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Product selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product <span className="text-red-500">*</span>
          </label>
          <select
            value={existId}
            onChange={(e) => setExistId(e.target.value)}
            disabled={loadingProducts}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary bg-white disabled:bg-gray-100"
          >
            <option value="">
              {loadingProducts ? "Loading products..." : "Select a product..."}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} - {p.name}
                {p.code_number ? ` (Code: ${p.code_number})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            From Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary"
            required
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            To Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary"
            required
          />
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary bg-white"
          >
            <option value="summary">Summary Only</option>
            <option value="detailed">Detailed Only</option>
            <option value="both">Both Summary & Detailed</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleDownload}
          disabled={loading || !from || !to || !existId}
          className="bg-primary text-white px-6 py-2 rounded-lg disabled:bg-gray-400 w-full sm:w-auto hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          {loading ? (
            "Generating PDF..."
          ) : (
            <>
              <Download size={18} />
              Download Sales Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SellsDateDownload;