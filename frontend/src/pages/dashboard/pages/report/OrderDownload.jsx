import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import moment from "moment-jalaali";
const BASE_URL = import.meta.env.VITE_BASE_URL;
import VazirmatnTTF from "../../../../../public/ttf/Vazirmatn.js";
const OrderDownload = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert("لطفاً تاریخ شروع و پایان را انتخاب کنید");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${BASE_URL}/orders/download?startDate=${startDate}&endDate=${endDate}`
      );

      const orders = response.data.orders;
      if (!orders || orders.length === 0) {
        alert("هیچ سفارشی در این بازه زمانی یافت نشد");
        return;
      }

      // ✅ Create PDF (A4 portrait)
      const doc = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      });

      // ✅ Add Persian font (Vazirmatn)
      doc.addFileToVFS("Vazirmatn.ttf", VazirmatnTTF); // Base64 TTF
      doc.addFont("Vazirmatn.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");

      doc.setFontSize(14);
      doc.text(
        `گزارش سفارشات مطبعه اکبر از ${moment(startDate).format(
          "jYYYY/jMM/jDD"
        )} تا ${moment(endDate).format("jYYYY/jMM/jDD")}`,
        550,
        40,
        {
          align: "right",
        }
      );

      // Table headers in Persian
      const headers = [
        [
          "تحویلی",
          "تاریخ",
          "باقیمانده",
          "دریافتی",
          "مجموع",
          "شماره تماس",
          "نام مشتری",
          "شماره بیل",
        ],
      ];

      // Table body
      const data = orders.map((order) => [
        order.isDelivered ? "بله" : "نخیر",
        moment(order.createdAt).format("jYYYY/jMM/jDD"),
        order.remained?.toLocaleString("fa-AF") || 0,
        order.recip?.toLocaleString("fa-AF") || 0,
        order.total?.toLocaleString("fa-AF") || 0,
        order.customer?.phone_number || "-",
        order.customer?.name || "-",
        order.id,
      ]);

      // ✅ Generate table with proper Persian headers
      autoTable(doc, {
        head: headers,
        body: data,
        startY: 60,
        styles: {
          font: "Vazirmatn",
          halign: "center",
          fontSize: 10,
        },
        headStyles: {
          font: "Vazirmatn",
          fontStyle: "normal", // Use normal for Persian headers
          halign: "center",
          fillColor: [200, 200, 200],
          textColor: 20,
        },
        theme: "grid",
        didParseCell: function (data) {
          // Force headers and body to use Persian font
          data.cell.styles.font = "Vazirmatn";
          if (data.section === "head") {
            data.cell.styles.fontStyle = "normal";
            data.cell.styles.halign = "center";
          }
        },
      });

      // Signature line
      const finalY = doc.lastAutoTable.finalY + 40;
      doc.text("امضاء و مهر:", 550, finalY, { align: "right" });
      doc.line(400, finalY + 2, 550, finalY + 2);

      doc.save(`Orders_${startDate}_to_${endDate}.pdf`);
    } catch (error) {
      console.error("Error downloading orders:", error);
      alert("خطا در دریافت اطلاعات!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex gap-4">
        <label className="" htmlFor="startDate">تاریخ شروع</label>
        <input
          name="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        <label htmlFor="endDate">تاریخ ختم</label>
        <input
          name="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-cyan-800 text-white px-4 py-2 rounded"
        >
          {loading ? "در حال دانلود..." : "دانلود PDF"}
        </button>
      </div>
    </div>
  );
};

export default OrderDownload;
