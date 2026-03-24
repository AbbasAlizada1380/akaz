import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FaMoneyBillWave,
  FaWallet,
  FaUndoAlt,
  FaChartPie,
  FaSync,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import debounce from "lodash.debounce";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const DashboardHome = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { currentUser } = useSelector((state) => state.user);

  // Build metrics from the report data
  const buildMetrics = (data) => {
    if (!data) return [];

    const { pay, receive, return: returnAmount, combinedTotal } = data;

    return [
      {
        title: "Payments",
        key: "pay",
        value: pay,
        icon: FaMoneyBillWave,
        color: "bg-primary", // kept red for payments (distinct from primary)
        description: "Total amount paid to suppliers",
        formatter: (val) => new Intl.NumberFormat("en-US").format(val) + " AFN",
      },
      {
        title: "Receipts",
        key: "receive",
        value: receive,
        icon: FaWallet,
        color: "bg-primary", // kept green for receipts
        description: "Total amount received from customers",
        formatter: (val) => new Intl.NumberFormat("en-US").format(val) + " AFN",
      },
      {
        title: "Returns",
        key: "return",
        value: returnAmount,
        icon: FaUndoAlt,
        color: "bg-primary", // kept amber for returns
        description: "Total amount returned",
        formatter: (val) => new Intl.NumberFormat("en-US").format(val) + " AFN",
      },
      {
        title: "Net Total",
        key: "combinedTotal",
        value: combinedTotal,
        icon: FaChartPie,
        color: "bg-primary", // primary color
        description: "Receipts minus payments and returns",
        formatter: (val) => new Intl.NumberFormat("en-US").format(val) + " AFN",
      },
    ];
  };

  // Fetch report data with optional date filters
  const fetchReportData = async (start, end) => {
    try {
      setLoading(true);
      const params = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const response = await axios.get(`${BASE_URL}/report`, { params });
      setReportData(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("Error fetching report data");
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch to avoid too many requests while typing
  const debouncedFetch = useCallback(
    debounce((start, end) => fetchReportData(start, end), 500),
    []
  );

  // Effect to trigger fetch when dates change (with debounce)
  useEffect(() => {
    debouncedFetch(startDate, endDate);
    return () => debouncedFetch.cancel();
  }, [startDate, endDate, debouncedFetch]);

  // Manual fetch without debounce (optional, use with a button)
  const handleApplyFilter = () => {
    fetchReportData(startDate, endDate);
  };

  // Initial fetch on mount (no dates)
  useEffect(() => {
    fetchReportData();
  }, []);

  if (loading && !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => fetchReportData(startDate, endDate)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            <FaSync />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const metrics = buildMetrics(reportData);
  const { from, to } = reportData;

  const handleCardClick = (index) => {
    setSelectedMetricIndex(selectedMetricIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header with date filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Financial Dashboard
          </h1>
          <p className="text-gray-600">
            Summary of payments, receipts, and returns
          </p>
        </div>

        {/* Date filter controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="From"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="To"
            />
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        {lastUpdated && (
          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow">
            Last updated:{" "}
            {lastUpdated.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
        )}
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg shadow">
          Date range: {from === "earliest" ? "Earliest" : from} to{" "}
          {to === "latest" ? "Now" : to}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const isSelected = selectedMetricIndex === index;
          const Icon = metric.icon;

          return (
            <div
              key={metric.key}
              onClick={() => handleCardClick(index)}
              className={`bg-white rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border overflow-hidden cursor-pointer ${
                isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "border-gray-100"
              }`}
            >
              <div className={`${metric.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <Icon className="text-2xl opacity-90" />
                  <span className="text-sm font-semibold">{metric.title}</span>
                </div>
              </div>

              <div className="p-6">
                {isSelected ? (
                  <>
                    <div className="text-2xl font-bold text-gray-800 mb-2">
                      {metric.formatter(metric.value)}
                    </div>
                    <p className="text-gray-600 text-sm">{metric.description}</p>
                  </>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    Click to view details
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint when nothing is selected */}
      {selectedMetricIndex === null && (
        <div className="text-center text-gray-500 bg-gray-50 rounded-lg p-4">
          Click any card to see the corresponding amount.
        </div>
      )}
    </div>
  );
};

export default DashboardHome;