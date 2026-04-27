import React, { useEffect, useRef } from "react";
import moment from "moment-jalaali";
import { FaPrint, FaTimes } from "react-icons/fa";

const PrintMultipleOrders = ({ isOpen, onClose, orders, autoPrint }) => {
  const hasAutoPrintedRef = useRef(false);
  const printTimeoutRef = useRef(null);

  const formatCurrency = (num) => {
    const number = Number(num || 0);
    return number + " افغانی";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'بعدازظهر' : 'قبل‌ازظهر';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const hourStr = String(hours).padStart(2, '0');
    return `${year}/${month}/${day}, ${hourStr}:${minutes} ${ampm}`;
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (autoPrint && isOpen && orders?.length && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      printTimeoutRef.current = setTimeout(() => {
        window.print();
      }, 800);
    }
    return () => {
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    };
  }, [autoPrint, isOpen, orders]);

  useEffect(() => {
    if (!isOpen) hasAutoPrintedRef.current = false;
  }, [isOpen]);

  if (!isOpen || !orders?.length) return null;

  // Calculate grand totals
  let grandTotalMoney = 0;
  let grandTotalReceived = 0;
  let grandTotalRemained = 0;

  orders.forEach(order => {
    const total = Number(order.total) || 0;
    const received = Number(order.received) || 0;
    grandTotalMoney += total;
    grandTotalReceived += received;
    grandTotalRemained += (total - received);
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 print:bg-transparent print:p-0">
      <div className="px-5">
        <div
          id="printable-area-multiple"
          className="bg-white shadow-2xl rounded-lg py-6 overflow-auto flex flex-col print:shadow-none print:rounded-none"
          style={{ width: "210mm", minHeight: "297mm", direction: "rtl" }}
        >
          <div className="text-center border-b pb-4 mb-4 px-4">
            <h2 className="text-xl font-bold">گزارش فروش‌های انتخاب شده</h2>
            <p className="text-sm text-gray-500">تعداد سفارشات: {orders.length}</p>
          </div>

          <div className="overflow-x-auto px-4">
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">شماره بل</th>
                  <th className="p-2 border">مشتری</th>
                  <th className="p-2 border">محصول</th>
                  <th className="p-2 border">تعداد</th>
                  <th className="p-2 border">قیمت واحد</th>
                  <th className="p-2 border">مبلغ کل</th>
                  <th className="p-2 border">دریافتی</th>
                  <th className="p-2 border">باقیمانده</th>
                  <th className="p-2 border">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  // Extract product name from stock object or fallback
                  const productName = order.stock?.name || "—";
                  const amount = order.amount || 0;
                  const unitPrice = Number(order.unitPrice) || 0;
                  const total = Number(order.total) || 0;
                  const received = Number(order.received) || 0;
                  const remained = Number(order.remained) || (total - received);

                  let customerName = "—";
                  if (order.customer && typeof order.customer === "object") {
                    customerName = order.customer.name || order.customer.fullname || "—";
                  } else if (order.name) {
                    customerName = order.name;
                  } else if (order.customer) {
                    customerName = String(order.customer);
                  }

                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 border text-center">{order.id}</td>
                      <td className="p-2 border text-right">{customerName}</td>
                      <td className="p-2 border text-right">{productName}</td>
                      <td className="p-2 border text-center">{amount}</td>
                      <td className="p-2 border text-center">{unitPrice.toLocaleString()}</td>
                      <td className="p-2 border text-center font-semibold">{total.toLocaleString()}</td>
                      <td className="p-2 border text-center">{received.toLocaleString()}</td>
                      <td className="p-2 border text-center">
                        <span className={remained > 0 ? "text-yellow-600" : "text-green-600"}>
                          {remained.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-2 border text-center">{formatDate(order.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Grand Totals */}
          <div className="mt-6 pt-4 border-t-2 border-gray-300 px-4">
            <div className="flex justify-end gap-6 font-bold text-md">
              <div className="flex gap-2">
                <span>مجموع کل فروش:</span>
                <span>{formatCurrency(grandTotalMoney)}</span>
              </div>
              <div className="flex gap-2">
                <span>مجموع دریافتی:</span>
                <span>{formatCurrency(grandTotalReceived)}</span>
              </div>
              <div className="flex gap-2">
                <span>مجموع باقیمانده:</span>
                <span>{formatCurrency(grandTotalRemained)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute bottom-6 left-6 flex gap-3 print:hidden">
        <button onClick={onClose} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2">
          <FaTimes size={14} /> بستن
        </button>
        <button onClick={handlePrint} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2">
          <FaPrint size={14} /> چاپ همه
        </button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-area-multiple,
          #printable-area-multiple * {
            visibility: visible;
          }
          #printable-area-multiple {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 5mm;
            box-shadow: none;
            border-radius: 0;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintMultipleOrders;