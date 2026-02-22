import React, { useEffect, useRef } from "react";
import moment from "moment-jalaali";
import { FaPhone, FaPrint, FaTimes } from "react-icons/fa";
import jalaali from "jalaali-js";

const PrintBillOrder = ({ isOpen, onClose, order, autoPrint }) => {
  const hasAutoPrintedRef = useRef(false);
  const printTimeoutRef = useRef(null);
  console.log(autoPrint);

  // Helper functions to check if items are filled
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

  // Auto print functionality
  useEffect(() => {
    if (autoPrint && isOpen && order && !hasAutoPrintedRef.current) {
      // Set flag to prevent multiple auto-prints
      hasAutoPrintedRef.current = true;

      // Delay print to ensure DOM is fully rendered
      printTimeoutRef.current = setTimeout(() => {
        window.print();
      }, 800);
    }

    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, [autoPrint, isOpen, order]);

  // Reset auto-print flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoPrintedRef.current = false;
    }
  }, [isOpen]);

  // Early return if not ready to render
  if (!isOpen || !order) {
    return null;
  }

  // Filter out empty items
  const filledDigital = (order.digital || []).filter(isDigitalItemFilled);
  const filledOffset = (order.offset || []).filter(isOffsetItemFilled);

  // Calculate totals
  const total_money_digital = filledDigital.reduce(
    (sum, d) => sum + Number(d.money || 0),
    0
  );
  const total_money_offset = filledOffset.reduce(
    (sum, o) => sum + Number(o.money || 0),
    0
  );
  const total = total_money_digital + total_money_offset;
  const remained = total - (order.recip || 0);

  // Generate bill number and timestamp
  const billNumber = order.id
    ? `${order.id}`
    : `${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  function formatToJalali(dateString) {
    const date = new Date(dateString);

    // Convert to Jalali
    const { jy, jm, jd } = jalaali.toJalaali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );

    // Get time
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "بعدازظهر" : "قبل‌ازظهر";
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // convert 0 to 12

    // Pad numbers
    const pad = (n) => (n < 10 ? "0" + n : n);

    return `${jy}/${pad(jm)}/${pad(jd)}, ${pad(hours)}:${pad(minutes)} ${ampm}`;
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 print:bg-transparent print:p-0">
      {/* A5 Container */}
      <div className="px-5">
        <div
          id="printable-area"
          className="bg-white shadow-2xl rounded-lg py-10 overflow-hidden  flex flex-col print:shadow-none print:rounded-none"
          style={{
            width: "148mm",
            height: "210mm",
            direction: "rtl",
          }}
        >
          {/* Header */}
          <div
            id="header-area"
            className=" py-4 px-4 grid grid-cols-2 text-center"
          >
            <div></div>
            <div className="flex flex-col items-center  mt-2 text-base">
              <span className="font-semibold">نمبر بل: {billNumber}</span>
              <span className="font-medium">
                تاریخ: {formatToJalali(order.createdAt)}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="px-3 border-gray-200">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-semibold text-[14px]">
                <span className="font-semibold">اسم: </span>{" "}
                {order.customer?.name || order.name || "—"}
              </div>
              <div className=" text-center font-semibold text-[14px]">
                <span className="font-semibold"> کد: </span>{" "}
                <span className="">{order.digitalId || "—"}</span>
              </div>
              <div className=" text-end font-semibold text-[14px]">
                <span className="font-semibold">شماره تماس: </span>{" "}
                <span className="text-[14px]">
                  {order.customer?.phone_number || order.phone_number || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3  overflow-auto">
            {/* Digital Printing Section */}
            {filledDigital.length > 0 && (
              <div className="mb-2 ">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead className="">
                      <tr className="text-md font-semibold">
                        <th className="p-1 text-center ">#</th>
                        <th className=" p-1 text-center">مشخصات</th>
                        <th className=" p-1 text-center ">تعداد</th>
                        <th className="p-1 text-center ">طول</th>
                        <th className="  p-1 text-center ">عرض</th>
                        <th className=" p-1 text-center "> فی متر</th>
                        <th className="  p-1 text-center 0">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledDigital.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1 text-center">
                            {i + 1}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.name || "—"}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.quantity || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.height || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.weight || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {d.price_per_unit || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">
                            {d.money || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Offset Printing Section */}
            {filledOffset.length > 0 && (
              <div className=" mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-300">
                    <thead className="">
                      <tr className="text-md font-semibold">
                        <th className=" border-gray-300 p-1 text-center ">#</th>
                        <th className=" border-gray-300 p-1 text-center">
                          مشخصات
                        </th>
                        <th className=" border-gray-300 p-1 text-center ">
                          تعداد
                        </th>
                        <th className=" border-gray-300 p-1 text-center">
                          فی متر
                        </th>
                        <th className=" p-1 text-center ">مبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledOffset.map((o, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300  text-center">
                            {i + 1}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {o.name || "—"}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {o.quantity || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            {o.price_per_unit || 0}
                          </td>
                          <td className="border border-gray-300 p-1 text-center font-semibold">
                            {o.money || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex items-center py-1 justify-between">
              {filledDigital.length > 0 && (
                <div className="flex justify-end mt-1 text-xs font-bold ">
                  مجموع چاپ دیجیتال: {formatCurrency(total_money_digital)}
                </div>
              )}
              {filledOffset.length > 0 && (
                <div className="flex justify-end mt-1 text-xs font-bold ">
                  مجموع چاپ افست: {formatCurrency(total_money_offset)}
                </div>
              )}
            </div>

            {/* No Items Message */}
            {filledDigital.length === 0 && filledOffset.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                هیچ محصولی ثبت نشده است
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="flex  h-[110px] border-gray-300 bg-gray-50">
            {/* Left Half — Totals Section */}
            <div className="w-1/2 p-4">
              <div className="space-y-1 ">
                <div className="flex justify-between font-bold  border-gray-300 pt-1">
                  <span>مجموع کل:</span>
                  <span className="">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between font-bold  border-gray-300 pt-1 ">
                  <span>
                    <strong>دریافتی :</strong>
                  </span>
                  <span className="">{formatCurrency(order.recip || 0)}</span>
                </div>
                <div className="flex justify-between font-bold  border-gray-300 pt-1">
                  <span className={remained > 0 ? "" : ""}>باقیمانده:</span>
                  <span className={remained > 0 ? "" : ""}>
                    {formatCurrency(order.remained)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Half — Signature and Stamp Section */}
            <div className="w-1/2 flex flex-col items-center justify-center p-4 text-center"></div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Hide during auto-print */}
      {
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
      }

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 5px;
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
            padding-top: 28mm; /* space from top */
            padding-bottom: 28mm; /* space from bottom */
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .print-hidden {
            display: none !important;
          }
        }

        /* Hide scrollbars for print */
        @media print {
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
