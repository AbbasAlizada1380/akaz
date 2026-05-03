// components/StockExistManager.jsx (updated)
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Package, Plus, Trash2, Pencil, Search, X } from "lucide-react";
import Pagination from "../pagination/Pagination.jsx"; // adjust path

const BASE_URL = import.meta.env.VITE_BASE_URL;
if (!BASE_URL) {
  console.error("VITE_BASE_URL is not defined in .env file");
}
const API_BASE = BASE_URL || "http://localhost:5000/api";

const StockExistManager = () => {
  const [stocks, setStocks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20; // items per page

  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    amount: "",
    sell_price: "",
    unit_price: "",
  });

  // Fetch departments once
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch stocks when page or search changes
  useEffect(() => {
    fetchStocks();
  }, [currentPage, searchTerm]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: limit,
      };
      // If search term exists, add to query (assuming backend supports search)
      if (searchTerm) {
        params.search = searchTerm; // adjust if backend uses a different param
      }
      const res = await axios.get(`${API_BASE}/stockExist`, { params });
      if (res.data.success) {
        setStocks(res.data.data);
        setTotalItems(res.data.pagination.totalItems);
        setTotalPages(res.data.pagination.totalPages);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error("Fetch stocks error:", err);
      alert("Failed to load stocks.");
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/department`);
      const depts = res.data?.data || res.data || [];
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (err) {
      console.error("Fetch departments error:", err);
      setDepartments([]);
    }
  };

  const getDepartmentName = (stock) => {
    if (stock.department?.name) return stock.department.name;
    if (stock.departmentId) {
      const found = departments.find(d => d.id === Number(stock.departmentId));
      if (found) return found.name;
    }
    return stock.departmentId || "-";
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingStock(null);
    setFormData({
      name: "",
      departmentId: "",
      amount: "",
      sell_price: "",
      unit_price: "",
    });
    // Do not reset search or page here, only when explicitly needed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.amount) < 0) {
      alert("Amount cannot be negative");
      return;
    }
    if (parseFloat(formData.sell_price) < 0 || parseFloat(formData.unit_price) < 0) {
      alert("Prices cannot be negative");
      return;
    }

    try {
      if (editingStock) {
        await axios.put(`${API_BASE}/stockExist/${editingStock.id}`, formData);
      } else {
        await axios.post(`${API_BASE}/stockExist`, formData);
      }
      resetForm();
      // After successful operation, go back to page 1 and refetch
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchStocks(); // refetch same page
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(editingStock ? "Update failed" : "Create failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock?")) return;
    try {
      await axios.delete(`${API_BASE}/stockExist/${id}`);
      // If current page becomes empty and not first page, go to previous page
      if (stocks.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchStocks();
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Delete failed");
    }
  };

  const startEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      name: stock.name || "",
      departmentId: stock.departmentId || "",
      amount: stock.amount || "",
      sell_price: stock.sell_price || "",
      unit_price: stock.unit_price || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  return (
    <div className="bg-white py-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Stock Items Management</h1>
          <p className="text-secondary">Manage existing stock items or add new ones</p>
        </div>

        <div className="gap-8">
          {/* Form Card */}
          <div className="bg-white mr-4 ml-6 rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold">
                {editingStock ? "Edit Stock Item" : "Add New Stock Item"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-gray-50 text-secondary"
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Department</label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-gray-50 text-secondary"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Amount (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-gray-50 text-secondary"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Sell Price (₮)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-gray-50 text-secondary"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Unit Price (₮)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-gray-50 text-secondary"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="bg-primary px-6 py-3 text-secondary rounded-xl font-semibold text-lg hover:bg-primary/90 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={20} />
                  {editingStock ? "Update Stock" : "Add Stock"}
                </button>
                {editingStock && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-secondary bg-white hover:bg-gray-50 transition-all duration-200 font-medium flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Stock List Card */}
          <div className="mt-8 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package size={24} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold">Stock Items List</h2>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none w-full sm:w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                {searchTerm && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-primary">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">ID</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Department</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Sell Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Unit Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stocks.length > 0 ? (
                        stocks.map((stock) => (
                          <tr key={stock.id} className="hover:bg-gray-50 bg-white transition-colors duration-150">
                            <td className="px-6 py-4 text-sm text-secondary">#{stock.id}</td>
                            <td className="px-6 py-4 text-sm font-medium text-secondary">{stock.name}</td>
                            <td className="px-6 py-4 text-sm text-secondary">
                              {getDepartmentName(stock)}
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">{stock.amount}</td>
                            <td className="px-6 py-4 text-sm text-secondary">₮{Number(stock.sell_price).toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm text-secondary">₮{Number(stock.unit_price).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-3">
                                <button
                                  onClick={() => startEdit(stock)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Pencil size={16} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(stock.id)}
                                  className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                >
                                  <Trash2 size={16} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center">
                            <div className="text-secondary text-sm">
                              <Package size={32} className="mx-auto text-gray-300 mb-2" />
                              {searchTerm
                                ? "No stock items match your search"
                                : "No stock items found"}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockExistManager;