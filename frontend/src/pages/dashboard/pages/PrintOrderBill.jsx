import React, { useEffect, useRef } from "react";
import moment from "moment-jalaali";
import { FaPhone, FaPrint, FaTimes } from "react-icons/fa";
import jalaali from "jalaali-js";

const PrintBillOrder = ({ isOpen, onClose, order, autoPrint }) => {
  const hasAutoPrintedRef = useRef(false);
  const printTimeoutRef = useRef(null);
  console.log(order);

  // Helper: check if item is filled (for digital/offset)
  const isDigitalItemFilled = (item) => {
    return (
      item?.name?.trim() !== "" ||
      (item?.quantity > 0 && (item?.price_per_unit > 0 || item?.money > 0))
    );
  };

  const isOffsetItemFilled = (item) => {
    return (
      item?.name?.trim() !== "" ||
      (item?.quantity > 0 && (item?.price_per_unit > 0 || item?.money > 0))
    );
  };

  const formatCurrency = (num) => {
    const number = Number(num || 0);
    return number + " افغانی";
  };

  const handlePrint = () => {
    window.print();
  };

  // Auto print
  useEffect(() => {
    if (autoPrint && isOpen && order && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      printTimeoutRef.current = setTimeout(() => {
        window.print();
      }, 800);
    }
    return () => {
      if (printTimeoutRef.current) clearTimeout(printTimeoutRef.current);
    };
  }, [autoPrint, isOpen, order]);

  useEffect(() => {
    if (!isOpen) hasAutoPrintedRef.current = false;
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // -----------------------------------------------------------------
  // 1. Detect order type and prepare data
  // -----------------------------------------------------------------
  const isStockSale = order.stock && typeof order.stock === "object";

  let filledDigital = [];
  let filledOffset = [];
  let stockItem = null;
  let saleAmount = 0, unitPrice = 0, totalMoney = 0;

  if (isStockSale) {
    // Stock sale: one item from the stock object
    stockItem = order.stock;
    saleAmount = Number(order.amount) || 0;
    unitPrice = Number(order.unitPrice) || 0;
    totalMoney = Number(order.total) || (saleAmount * unitPrice);
  } else {
    // Original order: filter digital/offset items
    filledDigital = (order.digital || []).filter(isDigitalItemFilled);
    filledOffset = (order.offset || []).filter(isOffsetItemFilled);
  }

  // -----------------------------------------------------------------
  // 2. Calculate totals
  // -----------------------------------------------------------------
  const total_money_digital = filledDigital.reduce(
    (sum, d) => sum + Number(d.money || 0), 0
  );
  const total_money_offset = filledOffset.reduce(
    (sum, o) => sum + Number(o.money || 0), 0
  );
  // For stock sale, use totalMoney; otherwise sum digital+offset
  const total = isStockSale ? totalMoney : (total_money_digital + total_money_offset);
  const received = Number(order.received || order.recip || 0);
  const remained = Number(order.remained || (total - received));

  // -----------------------------------------------------------------
  // 3. Customer info
  // -----------------------------------------------------------------
  // Try to extract customer name and phone from either object or direct fields
  let customerName = "—", customerPhone = "—", customerId = "—";
  if (order.customer && typeof order.customer === "object") {
    customerName = order.customer.name || "—";
    customerPhone = order.customer.phone_number || "—";
    customerId = order.digitalId || order.customer.id || "—";
  } else {
    // customer is a primitive (ID string/number) or missing
    customerId = order.customer || order.digitalId || "—";
    customerName = order.name || "—";
    customerPhone = order.phone_number || "—";
  }

  // Bill number
  const billNumber = order.id ? `${order.id}` : `${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Date formatting
function formatToGregorian(dateString) {
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
}

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 print:bg-transparent print:p-0">
      {/* A5 Container */}
      <div className="px-5">
        <div
          id="printable-area"
          className="bg-white shadow-2xl rounded-lg py-10 overflow-hidden flex flex-col print:shadow-none print:rounded-none"
          style={{ width: "148mm", height: "210mm", direction: "rtl" }}
        >
          {/* Header */}
          <div id="header-area" className="py-4 px-4 grid grid-cols-2 text-center">
            <div></div>
            <div className="flex flex-col items-center mt-2 text-base">
              <span className="font-semibold">نمبر بل: {billNumber}</span>
              <span className="font-medium">تاریخ: {formatToGregorian(order.createdAt)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="px-3 border-gray-200">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-semibold text-[14px]">
                <span className="font-semibold">اسم: </span> {customerName}
              </div>
              <div className="text-center font-semibold text-[14px]">
                <span className="font-semibold">کد: </span> {customerId}
              </div>
              <div className="text-end font-semibold text-[14px]">
                <span className="font-semibold">شماره تماس: </span> {customerPhone}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3 overflow-auto">
            {/* Stock Sale Item (single row) */}
            {isStockSale && stockItem && (
              <div className="mb-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="text-md font-semibold">
                        <th className="p-1 text-center">#</th>
                        <th className="p-1 text-center">مشخصات</th>
                        <th className="p-1 text-center">مقدار</th>
                        <th className="p-1 text-center">قیمت فی</th>
                        <th className="p-1 text-center">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-1 text-center">1</td>
                        <td className="border border-gray-300 p-1 text-center">
                          {stockItem.name || "—"}
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          {saleAmount}
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          {unitPrice}
                        </td>
                        <td className="border border-gray-300 p-1 text-center font-semibold">
                          {totalMoney}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {order.is_returned && (
                  <div className="text-red-600 text-xs mt-1 font-bold">** برگشت داده شده **</div>
                )}
              </div>
            )}

            {/* Digital Printing Section (original) */}
            {!isStockSale && filledDigital.length > 0 && (
              <div className="mb-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="text-md font-semibold">
                        <th className="p-1 text-center">#</th>
                        <th className="p-1 text-center">مشخصات</th>
                        <th className="p-1 text-center">تعداد</th>
                        <th className="p-1 text-center">طول</th>
                        <th className="p-1 text-center">عرض</th>
                        <th className="p-1 text-center">فی متر</th>
                        <th className="p-1 text-center">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledDigital.map((d, i) => (
                        <tr key={i}>
                          <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1 text-center">{d.name || "—"}</td>
                          <td className="border border-gray-300 p-1 text-center">{d.quantity || 0}</td>
                          <td className="border border-gray-300 p-1 text-center">{d.height || 0}</td>
                          <td className="border border-gray-300 p-1 text-center">{d.weight || 0}</td>
                          <td className="border border-gray-300 p-1 text-center">{d.price_per_unit || 0}</td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">{d.money || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Offset Printing Section (original) */}
            {!isStockSale && filledOffset.length > 0 && (
              <div className="mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead>
                      <tr className="text-md font-semibold">
                        <th className="border-gray-300 p-1 text-center">#</th>
                        <th className="border-gray-300 p-1 text-center">مشخصات</th>
                        <th className="border-gray-300 p-1 text-center">تعداد</th>
                        <th className="border-gray-300 p-1 text-center">فی متر</th>
                        <th className="p-1 text-center">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledOffset.map((o, i) => (
                        <tr key={i}>
                          <td className="border border-gray-300 text-center">{i + 1}</td>
                          <td className="border border-gray-300 p-1 text-center">{o.name || "—"}</td>
                          <td className="border border-gray-300 p-1 text-center">{o.quantity || 0}</td>
                          <td className="border border-gray-300 p-1 text-center">{o.price_per_unit || 0}</td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">{o.money || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals line for digital/offset (if any) */}
            {!isStockSale && (filledDigital.length > 0 || filledOffset.length > 0) && (
              <div className="flex items-center py-1 justify-between">
                {filledDigital.length > 0 && (
                  <div className="flex justify-end mt-1 text-xs font-bold">
                    مجموع چاپ دیجیتال: {formatCurrency(total_money_digital)}
                  </div>
                )}
                {filledOffset.length > 0 && (
                  <div className="flex justify-end mt-1 text-xs font-bold">
                    مجموع چاپ افست: {formatCurrency(total_money_offset)}
                  </div>
                )}
              </div>
            )}

            {/* No Items Message */}
            {!isStockSale && filledDigital.length === 0 && filledOffset.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                هیچ محصولی ثبت نشده است
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="flex h-[110px] border-gray-300 bg-gray-50">
            <div className="w-1/2 p-4">
              <div className="space-y-1">
                <div className="flex justify-between font-bold border-gray-300 pt-1">
                  <span>مجموع کل:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between font-bold border-gray-300 pt-1">
                  <span>دریافتی :</span>
                  <span>{formatCurrency(received)}</span>
                </div>
                <div className="flex justify-between font-bold border-gray-300 pt-1">
                  <span>باقیمانده:</span>
                  <span>{formatCurrency(remained)}</span>
                </div>
              </div>
            </div>
            <div className="w-1/2 flex flex-col items-center justify-center p-4 text-center"></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-6 left-6 flex gap-3 print:hidden">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
        >
          <FaTimes size={14} /> بستن
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2 shadow-lg transition-colors"
        >
          <FaPrint size={14} /> چاپ فاکتور
        </button>
      </div>

      {/* Print Styles (unchanged) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 2mm;
          }
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 148mm !important;
            height: 210mm !important;
            margin: 0;
            padding-right: 20px;
            padding-left: 5px;
            padding-top: 28mm;
            padding-bottom: 28mm;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default PrintBillOrder;