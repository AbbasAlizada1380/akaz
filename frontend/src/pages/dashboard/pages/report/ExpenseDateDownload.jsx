import React, { useState, useEffect } from "react";
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
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("summary"); // summary, detailed, both

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/department`);
        const deptData = response.data.data || response.data;
        setDepartments(deptData);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  const handleDownload = async () => {
    if (!from || !to) {
      alert("Please select a date range.");
      return;
    }

    setLoading(true);
    try {
      // Build request parameters
      const params = { from, to };
      if (departmentId) {
        params.departmentId = departmentId;
      }

      const { data } = await axios.get(`${BASE_URL}/expense/date-range`, { params });

      // Extract expenses from response
      const expenses = data.expenses || data.data || [];
      
      if (!expenses || expenses.length === 0) {
        alert("No expenses found in the selected period.");
        return;
      }

      // Get department name for filename
      let departmentName = "All_Departments";
      if (departmentId) {
        const selectedDept = departments.find(d => d.id === parseInt(departmentId));
        departmentName = selectedDept?.name || `Dept_${departmentId}`;
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.setR2L(false);
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const formattedFrom = moment(from).format("YYYY/MM/DD");
      const formattedTo = moment(to).format("YYYY/MM/DD");
      const today = moment().format("YYYY/MM/DD");
      const departmentLabel = departmentName === "All_Departments" ? "All Departments" : departmentName;

      // ========== TITLE ==========
      doc.setFontSize(16);
      doc.text("Expense Report", margin, 40, { align: "left" });
      doc.setFontSize(12);
      doc.text(`Department: ${departmentLabel}`, margin, 65, { align: "left" });
      doc.text(`Period: ${formattedFrom} to ${formattedTo}`, margin, 85, { align: "left" });
      doc.text(`Generated: ${today}`, margin, 105, { align: "left" });

      // Calculate summary statistics
      const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const avgAmount = totalAmount / expenses.length;
      const maxAmount = Math.max(...expenses.map(e => Number(e.amount)));
      const minAmount = Math.min(...expenses.map(e => Number(e.amount)));

      // Group by department if all departments selected
      const byDepartment = {};
      if (!departmentId) {
        expenses.forEach(expense => {
          const deptName = expense.department?.name || "Unknown";
          if (!byDepartment[deptName]) {
            byDepartment[deptName] = {
              count: 0,
              totalAmount: 0,
              expenses: []
            };
          }
          byDepartment[deptName].count++;
          byDepartment[deptName].totalAmount += Number(expense.amount);
          byDepartment[deptName].expenses.push(expense);
        });
      }

      let currentY = 130;

      // ========== SUMMARY SECTION ==========
      if (reportType === "summary" || reportType === "both") {
        // Summary Cards
        doc.setFontSize(14);
        doc.text("Summary", margin, currentY);
        currentY += 20;

        // Summary Table
        const summaryHeaders = [["Metric", "Value"]];
        const summaryBody = [
          ["Total Number of Expenses", expenses.length.toString()],
          ["Total Amount", `${totalAmount.toLocaleString()} AFN`],
          ["Average Amount", `${avgAmount.toLocaleString()} AFN`],
          ["Maximum Amount", `${maxAmount.toLocaleString()} AFN`],
          ["Minimum Amount", `${minAmount.toLocaleString()} AFN`],
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
            0: { cellWidth: 150 },
            1: { cellWidth: 200 }
          }
        });

        currentY = doc.lastAutoTable.finalY + 20;

        // Department Breakdown (if all departments selected)
        if (!departmentId && Object.keys(byDepartment).length > 1) {
          doc.setFontSize(14);
          doc.text("Department Breakdown", margin, currentY);
          currentY += 20;

          const deptHeaders = [["Department", "Number of Expenses", "Total Amount (AFN)"]];
          const deptBody = Object.entries(byDepartment).map(([name, data]) => [
            name,
            data.count.toString(),
            data.totalAmount.toLocaleString()
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            head: deptHeaders,
            body: deptBody,
            theme: "striped",
            styles: { font: "Vazirmatn", fontSize: 10, halign: "center", cellPadding: 6 },
            headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: "bold" },
          });

          currentY = doc.lastAutoTable.finalY + 20;
        }
      }

      // ========== DETAILED TABLE ==========
      if (reportType === "detailed" || reportType === "both") {
        if (reportType === "both") {
          doc.addPage();
          currentY = 40;
        }

        doc.setFontSize(14);
        doc.text("Detailed Expenses", margin, currentY);
        currentY += 20;

        const detailedHeaders = [
          ["ID", "Date", "Amount (AFN)", "Purpose", "By", "Department", "Description"]
        ];
        
        const detailedBody = expenses.map((expense) => [
          expense.id.toString(),
          moment(expense.createdAt).format("YYYY/MM/DD"),
          Number(expense.amount).toLocaleString(),
          expense.purpose || "—",
          expense.by || "Unknown",
          expense.department?.name || "N/A",
          expense.description?.substring(0, 50) || "—",
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: detailedHeaders,
          body: detailedBody,
          theme: "grid",
          styles: {
            font: "Vazirmatn",
            fontSize: 9,
            halign: "center",
            valign: "middle",
            cellPadding: 6,
          },
          headStyles: {
            font: "Vazirmatn",
            fontStyle: "bold",
            fillColor: [70, 130, 180],
            textColor: 255,
            fontSize: 10,
            halign: "center",
          },
          foot: [["", "", `${totalAmount.toLocaleString()} AFN`, "", "", "", ""]],
          footStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
          },
        });

        currentY = doc.lastAutoTable.finalY + 20;
      }

      // Add page numbers
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text(
          `${i} / ${pageCount}`,
          pageWidth - margin,
          pageHeight - 30,
          { align: "right" }
        );
      }

      // Save PDF
      const filename = `Expense_Report_${departmentName}_${formattedFrom}_to_${formattedTo}.pdf`;
      doc.save(filename);
      
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Error retrieving expense data.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        Expense Report by Date Range
      </h2>
      <p className="text-sm text-gray-600">
        Generate expense reports filtered by date range and department.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            From Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Department Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Department (Optional)
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="summary">Summary Only</option>
            <option value="detailed">Detailed Only</option>
            <option value="both">Both Summary & Detailed</option>
          </select>
        </div>
      </div>

      {/* Info Box */}
      {departmentId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <span className="font-semibold">ℹ️ Info:</span> Showing expenses for selected department only.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleDownload}
          disabled={loading || !from || !to}
          className="bg-primary text-white px-6 py-2 rounded-lg disabled:bg-gray-400 w-full sm:w-auto hover:bg-primary-dark transition-colors"
        >
          {loading ? "Generating PDF..." : "Download Expense Report"}
        </button>
      </div>
    </div>
  );
};

export default ExpenseDateDownload;