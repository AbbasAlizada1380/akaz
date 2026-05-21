import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const BenefitReportDownload = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [deptLoading, setDeptLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/department/`);
        setDepartments(response.data.data || []);
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert("لطفاً تاریخ شروع و پایان را انتخاب کنید");
      return;
    }

    setLoading(true);
    try {
      let benefits = [];
      let deptName = "همه دپارتمان‌ها";
      let response;

      if (selectedDeptId === "all") {
        response = await axios.get(`${BASE_URL}/benifit`, {
          params: {
            startDate,
            endDate,
            page: 1,
            limit: 10000,
          },
        });
        benefits = response.data.data;
      } else {
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        deptName = dept?.name || "";
        response = await axios.get(`${BASE_URL}/department/${selectedDeptId}/benefits`, {
          params: {
            startDate,
            endDate,
            page: 1,
            limit: 10000,
          },
        });
        benefits = response.data.data;
      }

      if (!benefits || benefits.length === 0) {
        alert("هیچ سودی در این بازه زمانی یافت نشد");
        return;
      }

      // Format dates in Gregorian (YYYY/MM/DD)
      const formatGregorian = (dateStr) => moment(dateStr).format("YYYY/MM/DD");
      const formatGregorianDateTime = (dateStr) => moment(dateStr).format("YYYY/MM/DD HH:mm");

      const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      doc.setFontSize(14);
      const title = `گزارش سود ${deptName} از تاریخ ${formatGregorian(startDate)} تا ${formatGregorian(endDate)}`;
      doc.text(title, 550, 40, { align: "right" });

      const headers = [["شناسه", "مبلغ (افغانی)", "شناسه فروش", "دپارتمان", "تاریخ ایجاد"]];
      const data = benefits.map((benefit) => [
        benefit.id,
        benefit.amount.toLocaleString("fa-AF"),
        benefit.sellId,
        benefit.department?.name || "-",
        formatGregorianDateTime(benefit.createdAt),
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: 60,
        styles: { font: "Vazirmatn", halign: "center", fontSize: 10 },
        headStyles: { font: "Vazirmatn", fontStyle: "normal", halign: "center", fillColor: [200, 200, 200], textColor: 20 },
        theme: "grid",
        didParseCell: (data) => {
          data.cell.styles.font = "Vazirmatn";
          if (data.section === "head") {
            data.cell.styles.fontStyle = "normal";
            data.cell.styles.halign = "center";
          }
        },
      });

      const totalAmount = benefits.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(12);
      doc.text(`مجموع کل سود: ${totalAmount.toLocaleString("fa-AF")} افغانی`, 550, finalY, { align: "right" });
      doc.text("امضاء و مهر:", 550, finalY + 30, { align: "right" });
      doc.line(400, finalY + 32, 550, finalY + 32);

      doc.save(`Benefit_Report_${deptName}_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error("Error downloading benefit report:", err);
      alert("خطا در دریافت اطلاعات!");
    } finally {
      setLoading(false);
    }
  };

  if (deptLoading) return <div className="p-6 text-center">در حال بارگذاری دپارتمان‌ها...</div>;

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-lg font-bold mb-4">دانلود گزارش سود</h3>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">دپارتمان</label>
          <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">همه دپارتمان‌ها</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">تاریخ شروع</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">تاریخ پایان</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <button onClick={handleDownload} disabled={loading} className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90 transition">
          {loading ? "در حال دانلود..." : "دانلود PDF"}
        </button>
      </div>
    </div>
  );
};

export default BenefitReportDownload;