import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js"; // adjust path as needed

const BASE_URL = import.meta.env.VITE_BASE_URL;

const PaymentReport = () => {
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

  const formatJalaliDate = (dateStr) => {
    if (!dateStr) return "";
    return moment(dateStr).format("jYYYY/jMM/jDD");
  };

  const getDebtorName = (payment) => {
    const debt = payment.paymentDebt;
    if (!debt) return "-";
    if (debt.debtStaff?.name) return debt.debtStaff.name;
    if (debt.debtNonStaff?.name) return debt.debtNonStaff.name;
    return "-";
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert("لطفاً تاریخ شروع و پایان را انتخاب کنید");
      return;
    }

    setLoading(true);
    try {
      let payments = [];
      let deptName = "همه دپارتمنت";
      let response;

      const params = {
        startDate,
        endDate,
        page: 1,
        limit: 10000,
      };
      if (selectedDeptId !== "all") {
        params.departmentId = parseInt(selectedDeptId);
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        deptName = dept?.name || "";
      }

      response = await axios.get(`${BASE_URL}/payment/date-range`, { params });
      payments = response.data.data || [];

      if (!payments || payments.length === 0) {
        alert("هیچ پرداختی در این بازه زمانی یافت نشد");
        return;
      }

      // Calculate totals
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Create PDF
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF);
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 40;

      // Title
      doc.setFontSize(14);
      const title = `گزارش پرداخت‌های قروض – ${deptName} از تاریخ ${startDate} تا ${endDate}`;
      doc.text(title, pageWidth - 40, currentY, { align: "right" });
      currentY += 20;

      // Summary row
      doc.setFontSize(12);
      doc.text(`تعداد کل پرداخت‌های قروض: ${payments.length}`, pageWidth - 40, currentY, { align: "right" });
      currentY += 20;
      doc.text(`مجموع مبلغ: ${totalAmount.toLocaleString("en-US")} افغانی`, pageWidth - 40, currentY, { align: "right" });
      currentY += 30;

      // Table headers (Persian) – replaced "شناسه بدهی" with "بدهکار"
      const headers = [["شناسه", "بدهکار", "هدف", "مبلغ (افغانی)", "تاریخ پرداخت", "توضیحات", "دپارتمنت"]];
      const rows = payments.map((p) => [
        p.id,
        getDebtorName(p),
        p.paymentDebt?.purpose || "-",
        p.amount.toLocaleString("en-US"),
        p.paymentDate,
        p.description || "-",
        p.paymentDepartment?.name || "-",
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: currentY,
        styles: { font: "Vazirmatn", halign: "center", fontSize: 9 },
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

      // Footer: signature line
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(12);
      doc.text("امضاء و مهر:", pageWidth - 40, finalY, { align: "right" });
      doc.line(pageWidth - 200, finalY + 2, pageWidth - 40, finalY + 2);

      // Page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`${i} / ${pageCount}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
      }

      // Save file
      const fileName = `Payment_Report_${deptName}_${startDate}_to_${endDate}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error downloading payment report:", err);
      alert(err.response?.data?.error || "خطا در دریافت اطلاعات!");
    } finally {
      setLoading(false);
    }
  };

  if (deptLoading) {
    return <div className="p-6 text-center">در حال بارگذاری دپارتمنت...</div>;
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-lg font-bold mb-4">دانلود گزارش پرداخت‌های قروض</h3>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">دپارتمان</label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">همه دپارتمنت</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">تاریخ شروع</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">تاریخ پایان</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90 transition"
        >
          {loading ? "در حال دانلود..." : "دانلود PDF"}
        </button>
      </div>
    </div>
  );
};

export default PaymentReport;