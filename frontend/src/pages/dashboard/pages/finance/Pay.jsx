import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination"; // Adjust import path

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SELLER_API = `${BASE_URL}/seller/dept`;

const initialForm = {
  seller: "",
  amount: "",
  description: ""
};

export default function Pay() {
  const [pays, setPays] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  // ======================
  // Fetch Pays
  // ======================
  const fetchPays = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/pay?page=${page}&limit=${limit}`);
      setPays(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching pays:", error);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Fetch Sellers
  // ======================
  const fetchSellers = async () => {
    try {
      const res = await axios.get(SELLER_API);
      if (res.data.success) {
        setSellers(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  useEffect(() => {
    fetchPays();
    fetchSellers();
  }, [page]);

  // ======================
  // Handle Change
  // ======================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // ======================
  // Reset Form
  // ======================
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  // ======================
  // Handle Submit
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.seller || !form.amount) {
      alert("Seller and amount are required");
      return;
    }

    const selected = sellers.find(s => s.id === parseInt(form.seller));
    if (!selected) {
      alert("Selected seller not found");
      return;
    }

    const amount = parseFloat(form.amount);
    const maxAmount = parseFloat(selected.totalUnpaidAmount);

    if (amount > maxAmount) {
      alert(`Payment cannot exceed total unpaid amount: ${maxAmount}`);
      return;
    }

    const payload = {
      seller: form.seller,
      amount,
      description: form.description || null
    };

    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/pay/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/pay`, payload);
      }
      resetForm();
      fetchPays();
      fetchSellers();
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Error saving payment");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Handle Edit
  // ======================
  const handleEdit = (pay) => {
    setForm({
      seller: pay.seller,
      amount: pay.amount,
      description: pay.description || ""
    });
    setEditingId(pay.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ======================
  // Handle Delete
  // ======================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;

    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/pay/${id}`);
      fetchPays();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Error deleting payment");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Cancel Edit
  // ======================
  const handleCancel = () => resetForm();

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header with decorative elements */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-primary-300"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="pr-4 bg-gradient-to-br from-primary-50 to-primary-100 text-3xl font-bold text-primary-800">
              Seller Payments
            </span>
          </div>
          <p className="text-primary-600 mt-2 ml-1">
            Manage and track all seller payments efficiently
          </p>
        </div>

        {/* ================= FORM ================= */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-primary-100">
          {/* Form Header with primary gradient */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {editingId ? "Edit Payment Record" : "Create New Payment"}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Seller Select with better styling */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Seller <span className="text-primary-600">*</span>
                </label>
                <div className="relative">
                  <select
                    name="seller"
                    value={form.seller}
                    onChange={handleChange}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none bg-white appearance-none"
                  >
                    <option value="">Choose a seller...</option>
                    {Array.isArray(sellers) && sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullname} {s.phoneNumber ? `- ${s.phoneNumber}` : ''} (${s.totalUnpaidAmount || 0})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-primary-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Amount Input with primary accent */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Amount <span className="text-primary-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-3.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Description Textarea - Full width */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter payment description or notes..."
                  rows="3"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Form Actions with primary buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3.5 bg-primary-600 text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-lg ${loading
                  ? 'opacity-50 cursor-not-allowed hover:scale-100'
                  : 'hover:bg-primary-700'
                  }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>{editingId ? 'Update Payment' : 'Create Payment'}</span>
                  </span>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-8 py-3.5 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all transform hover:scale-105 hover:shadow-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary-100">
          {/* Table Header with primary gradient */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-800 px-6 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Payment History
                </h2>
              </div>
              <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold border border-white/30">
                Total: {pays.length} payments
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">Seller</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-primary-800">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-primary-100">
                {loading && pays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                        </div>
                        <p className="text-primary-600 font-medium">Loading payments...</p>
                      </div>
                    </td>
                  </tr>
                ) : pays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 bg-primary-100 rounded-full mb-4">
                          <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-900">No payments found</p>
                        <p className="text-sm text-primary-500 mt-1">Create your first payment using the form above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pays.map((pay, index) => (
                    <tr key={pay.id} className="hover:bg-primary-50 transition-all duration-200 group">
                      <td className="px-6 py-4 text-sm font-medium text-primary-600">
                        #{String(index + 1 + (page - 1) * limit).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                            {pay.sellerInfo?.fullname?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{pay.sellerInfo?.fullname || 'Unknown Seller'}</div>
                            {pay.sellerInfo?.phoneNumber && (
                              <div className="text-xs text-primary-600">{pay.sellerInfo.phoneNumber}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-xl font-semibold">
                          ${parseFloat(pay.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs text-gray-600" title={pay.description}>
                          {pay.description || <span className="text-primary-400 italic">No description</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span>{formatDate(pay.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(pay)}
                            className="p-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-all transform hover:scale-105"
                            title="Edit payment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(pay.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all transform hover:scale-105"
                            title="Delete payment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination with primary styling */}
          {totalPages > 1 && (
            <div className="border-t border-primary-100 px-6 py-4 bg-primary-50/50">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}