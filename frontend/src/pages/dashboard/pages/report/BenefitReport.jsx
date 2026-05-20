// BenefitReport.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";

import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

moment.locale("en");
const BASE_URL = import.meta.env.VITE_BASE_URL;

const BenefitReport = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      alert("Failed to load departments.");
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDeptId) {
      alert("Please select a department.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/department/${selectedDeptId}/benefits`);
      const benefits = res.data.benefits || [];

      if (benefits.length === 0) {
        alert("No benefits found for this department.");
        return;
      }

      const dept = departments.find(d => d.id === parseInt(selectedDeptId));
      const deptName = dept ? dept.name : "Department";
      const today = moment().format("YYYY/MM/DD");

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.setR2L(false); // English (left‑to‑right) layout

      // Add Persian font (for numbers / Persian text if needed)
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      // Title
      doc.setFontSize(14);
      doc.text(
        `Benefit Report - Department: ${deptName}`,
        40,
        120,
        { align: "left" }
      );

      // Table headers (English)
      const headers = [["ID", "Amount (AFN)", "Sell ID", "Department ID", "Created At", "Updated At"]];

      // Table body (show Persian numbers via toLocaleString)
      const body = benefits.map((b) => [
        b.id,
        parseFloat(b.amount).toLocaleString("fa-AF"), // Persian numbers
        b.sellId,
        b.departmentId,
        moment(b.createdAt).format("YYYY/MM/DD HH:mm"),
        moment(b.updatedAt).format("YYYY/MM/DD HH:mm"),
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

      const finalY = doc.lastAutoTable.finalY + 30;
      const totalAmount = benefits.reduce((sum, b) => sum + parseFloat(b.amount), 0);

      doc.setFontSize(11);
      doc.text(`Total Benefits: ${benefits.length}`, 40, finalY, { align: "left" });
      doc.text(`Total Amount: ${totalAmount.toLocaleString("fa-AF")} AFN`, 40, finalY + 20, { align: "left" });
      doc.text(`Issue Date: ${today}`, 40, finalY + 40, { align: "left" });

      doc.save(`Benefit_Report_${deptName}_${today}.pdf`);
    } catch (err) {
      console.error("Error downloading benefits:", err);
      alert("Failed to retrieve benefit data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-white rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        Department Benefit Report
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Department
          </label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            disabled={loadingDepts}
            className="mt-1 w-full border p-2 rounded"
          >
            <option value="">-- Choose a department --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} (ID: {dept.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleDownload}
          disabled={loading || !selectedDeptId}
          className="bg-primary text-black px-6 py-2 rounded disabled:bg-gray-400 w-full sm:w-auto"
        >
          {loading ? "Generating PDF..." : "Download Benefit Report"}
        </button>
      </div>
    </div>
  );
};

export default BenefitReport;