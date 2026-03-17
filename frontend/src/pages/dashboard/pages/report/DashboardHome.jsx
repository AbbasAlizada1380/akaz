import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaMoneyBillWave,
  FaTruck,
  FaClock,
  FaCheckCircle,
  FaChartLine,
  FaBoxOpen,
  FaWallet,
  FaExclamationTriangle,
  FaSync,
} from "react-icons/fa";
import OrderDownload from "./OrderDownload.jsx";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const DashboardHome = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(null); // index of selected card
  const { currentUser } = useSelector((state) => state.user);

  // Helper to build metrics based on reportData and user role
  const buildMetrics = (data) => {
    if (!data) return [];

    const {
      totalRemainedMoney,
      deliveredOrdersCount,
      notDeliveredOrdersCount,
      totalReceivedMoney,
      totalPendingMoney,
      totalOrdersCount,
    } = data;

    const deliveryRate =
      totalOrdersCount > 0 ? (deliveredOrdersCount / totalOrdersCount) * 100 : 0;

    const metrics = [
      // Admin only metrics (if needed)
      // ... you can add more here
    ];

    // Common metrics (shown to all roles, but you can filter by role later)
    const commonMetrics = [
      {
        title: "تعداد کل سفارشات",
        key: "totalOrdersCount",
        value: totalOrdersCount,
        icon: FaBoxOpen,
        color: "bg-purple-600",
        description: "تعداد کل سفارشات",
        formatter: (val) => new Intl.NumberFormat("fa-AF").format(val),
        role: "reception",
      },
      {
        title: "مجموع پول دریافتی",
        key: "totalReceivedMoney",
        value: totalReceivedMoney,
        icon: FaWallet,
        color: "bg-emerald-600",
        description: "کل مبالغ دریافت شده",
        formatter: (val) => new Intl.NumberFormat("fa-AF").format(val) + " افغانی",
        role: "admin",
      },
      {
        title: "مجموع پول باقیمانده",
        key: "totalRemainedMoney",
        value: totalRemainedMoney,
        icon: FaMoneyBillWave,
        color: "bg-cyan-800",
        description: "کل مبلغ باقیمانده از سفارشات",
        formatter: (val) => new Intl.NumberFormat("fa-AF").format(val) + " افغانی",
        role: "admin",
      },
      {
        title: "مانده در انتظار",
        key: "totalPendingMoney",
        value: totalPendingMoney,
        icon: FaClock,
        color: "bg-orange-600",
        description: "مبلغ سفارشات تحویل‌نشده",
        formatter: (val) => new Intl.NumberFormat("fa-AF").format(val) + " افغانی",
        role: "admin",
      },
      {
        title: "درصد تحویل",
        key: "deliveryRate",
        value: deliveryRate,
        icon: FaChartLine,
        color: "bg-cyan-600",
        description: "نرخ تحویل سفارشات",
        formatter: (val) => val.toFixed(1) + "%",
        role: "reception",
      },
      // Combined card for delivered/pending (special handling)
      {
        title: "وضعیت سفارشات",
        key: "orderStatus",
        isCombined: true,
        delivered: deliveredOrdersCount,
        pending: notDeliveredOrdersCount,
        icon: FaBoxOpen,
        color: "bg-gradient-to-r from-blue-600 to-purple-600",
        role: "reception",
      },
    ];

    return commonMetrics.filter(
      (metric) => metric.role === currentUser.role || currentUser.role === "admin"
    );
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/report`);
      setReportData(response.data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("خطا در دریافت اطلاعات");
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const formatNumber = (number) => new Intl.NumberFormat("fa-AF").format(number);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">در حال دریافت اطلاعات...</p>
        </div>
      </div>
    );
  }

  // if (error) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
  //       <div className="text-center">
  //         <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
  //         <p className="text-red-600 text-lg mb-4">{error}</p>
  //         <button
  //           onClick={fetchReportData}
  //           className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 mx-auto"
  //         >
  //           <FaSync />
  //           تلاش مجدد
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  if (!reportData) return null;

  const metrics = buildMetrics(reportData);

  const handleCardClick = (index) => {
    setSelectedMetricIndex(selectedMetricIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            داشبورد مدیریت
          </h1>
          <p className="text-gray-600">
            خلاصه وضعیت سفارشات و مالی چاپخانه اکبر
          </p>
        </div>
        {lastUpdated && (
          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow">
            آخرین به‌روزرسانی: {lastUpdated.toLocaleTimeString("fa-IR")}
          </div>
        )}
      </div>

      {currentUser.role === "admin" && <OrderDownload />}

      {/* Metrics Grid – only titles shown initially */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const isSelected = selectedMetricIndex === index;
          const Icon = metric.icon;

          return (
            <div
              key={metric.key || index}
              onClick={() => handleCardClick(index)}
              className={`bg-white rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border overflow-hidden cursor-pointer ${
                isSelected ? "ring-2 ring-cyan-500 ring-offset-2" : "border-gray-100"
              }`}
            >
              <div className={`${metric.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <Icon className="text-2xl opacity-90" />
                  <span className="text-sm font-semibold">{metric.title}</span>
                </div>
              </div>

              <div className="p-6">
                {metric.isCombined ? (
                  // Combined card (delivered/pending) – show only when selected
                  isSelected ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <FaCheckCircle className="text-green-600 text-xl mx-auto mb-1" />
                          <div className="text-lg font-bold text-green-700">
                            {formatNumber(metric.delivered)}
                          </div>
                          <div className="text-green-600 text-xs">تحویل شده</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <FaClock className="text-orange-600 text-xl mx-auto mb-1" />
                          <div className="text-lg font-bold text-orange-700">
                            {formatNumber(metric.pending)}
                          </div>
                          <div className="text-orange-600 text-xs">در انتظار</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // When not selected, show a placeholder or nothing
                    <div className="text-gray-400 text-center py-4">
                      برای نمایش اطلاعات کلیک کنید
                    </div>
                  )
                ) : (
                  // Regular metric – show value only when selected
                  isSelected ? (
                    <>
                      <div className="text-2xl font-bold text-gray-800 mb-2">
                        {metric.formatter(metric.value)}
                      </div>
                      <p className="text-gray-600 text-sm">{metric.description}</p>
                    </>
                  ) : (
                    <div className="text-gray-400 text-center py-4">
                      برای نمایش اطلاعات کلیک کنید
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: show a hint when nothing is selected */}
      {selectedMetricIndex === null && (
        <div className="text-center text-gray-500 bg-gray-50 rounded-lg p-4">
          روی هر کارت کلیک کنید تا اطلاعات مربوط به آن نمایش داده شود.
        </div>
      )}
    </div>
  );
};

export default DashboardHome;