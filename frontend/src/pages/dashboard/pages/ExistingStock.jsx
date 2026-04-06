import React, { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination"; // adjust path as needed

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockExistViewer = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchStockExist = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/stockExist`, {
        params: { page, limit }
      });
      // Response structure: { success: true, data: [...], pagination: {...} }
      setStocks(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Error fetching stock exist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchStockExist(newPage, pagination.itemsPerPage);
    }
  };

  useEffect(() => {
    fetchStockExist(1, 10);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-primary rounded-full animate-spin"></div>
          <span className="font-medium">Loading data...</span>
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
                ) : (
                  stocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className="border-b border-gray-100 hover:bg-primary/5 transition-colors"
                    >
                      <td className="p-4 text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          #{stock.id}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center font-bold text-sm">
                            {stock.department?.name || "Unknown"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                          {Array.isArray(stock.allStockIds) ? stock.allStockIds.length : 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                          {Array.isArray(stock.soldStockIds) ? stock.soldStockIds.length : 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                          {Array.isArray(stock.remainingStockIds) ? stock.remainingStockIds.length : 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 px-4 py-3">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
          {/* Footer info */}
          {stocks.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
              Showing {stocks.length} of {pagination.totalItems} departments
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockExistViewer;