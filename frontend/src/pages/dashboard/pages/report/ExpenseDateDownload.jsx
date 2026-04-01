import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ExpenseDateDownload = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!from || !to) {
      alert("Please select a date range.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.get(`${BASE_URL}/expense/date_range`, {
        params: { from, to },
      });

      if (!data?.expenses || data.expenses.length === 0) {
        alert("No expenses found in this period.");
        return;
      }

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      // Set RTL to false for English layout
      doc.setR2L(false);

      // Add Font
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const formattedFrom = moment(from).format("YYYY/MM/DD");
      const formattedTo = moment(to).format("YYYY/MM/DD");
      const today = moment().format("YYYY/MM/DD");

      // Title
      doc.setFontSize(14);
      doc.text(
        `Expense Report from ${formattedFrom} to ${formattedTo}`,
        40, // left margin
        120,
        { align: "left" }
      );

      // Table Headers
      const headers = [["Amount", "Purpose", "By", "Date", "ID"]];

      // Table Body
      const body = data.expenses.map((expense) => [
        Number(expense.amount).toLocaleString(),
        expense.purpose || "—",
        expense.by || "Unknown",
        moment(expense.createdAt).format("YYYY/MM/DD"),
        expense.id.toString(),
      ]);

      autoTable(doc, {
        startY: 140,
        head: headers,
        body: body,
        theme: "grid",
        styles: {
          font: "Vazirmatn",
          fontSize: 10,
          halign: "center",
          valign: "middle",
          cellPadding: 8,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal",
          fillColor: [70, 130, 180],
          textColor: [255, 255, 255],
          fontSize: 10,
          halign: "center",
        },
        didDrawCell: (data) => {
          if (data.cell) data.cell.styles.font = "Vazirmatn";
        },
      });

      const y = doc.lastAutoTable.finalY + 30;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Summary
      const totalAmount = data.expenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0
      );

      doc.setFontSize(11);
      doc.text(`Number of expenses: ${data.expenses.length}`, 40, y, { align: "left" });
      doc.text(`Total sum: ${totalAmount.toLocaleString()}`, 40, y + 20, { align: "left" });
      doc.text(`Issue date: ${today}`, 40, y + 40, { align: "left" });

      // Save PDF
      doc.save(`Expenses_${formattedFrom}_to_${formattedTo}_${today}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error retrieving expense data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        Expense Report by Date Range
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            From Date
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            To Date
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full border p-2 rounded"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-primary text-black px-6 py-2 rounded disabled:bg-gray-400 w-full sm:w-auto"
        >
          {loading ? "Generating PDF..." : "Download Expense Report"}
        </button>
      </div>
    </div>
  );
};

export default ExpenseDateDownload;