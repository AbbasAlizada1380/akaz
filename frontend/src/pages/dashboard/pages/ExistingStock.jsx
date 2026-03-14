import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockExistViewer = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStockExist = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/stockExist`);
      setStocks(res.data.data);
      log
    } catch (error) {
      console.error("Error fetching stock exist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockExist();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-primary rounded-full animate-spin"></div>
          <span className="  font-medium">Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 border-l-4 border-primary pl-4">
            Department Stock Status
          </h2>
          <p className="text-gray-600 mt-2 ml-5 text-sm">
            View and analyze stock availability across departments
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-primary to-primary border-b border-gray-200">
                  <th className="p-4 text-right font-semibold text-white">ID</th>
                  <th className="p-4 text-right font-semibold text-white">Department</th>
                  <th className="p-4 text-right font-semibold text-white">Total Stock</th>
                  <th className="p-4 text-right font-semibold text-white">Sold</th>
                  <th className="p-4 text-right font-semibold text-white">Remaining</th>
                </tr>
              </thead>

              <tbody>
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span>No data available</span>
                      </div>
                    </td>
                  </tr>
                ) : (Array.isArray(stocks) &&
                  stocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className="border-b border-gray-100 hover:bg-primary transition-colors"
                    >
                      <td className="p-4 text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          #{stock.id}
                        </span>
                      </td>

                      <td className="p-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="  flex items-center justify-center   font-bold text-sm">
                            {stock.department.name || "D"}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="bg-primary   px-3 py-1 rounded-full text-sm font-medium">
                          {stock.allStockIds || 0}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                          {stock.soldStockIds || 0}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                          {stock.remainingStockIds || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {stocks.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
              Showing {stocks.length} departments
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockExistViewer;