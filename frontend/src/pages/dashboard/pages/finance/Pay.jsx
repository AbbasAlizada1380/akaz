import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination"; // Make sure this import path is correct

const BASE_URL = import.meta.env.VITE_BASE_URL;
const SELLER_API = `${BASE_URL}/seller`;

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
      setSellers(res.data.data || []);
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
  // Submit
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.seller || !form.amount) {
      alert("Seller and amount are required");
      return;
    }

    const payload = {
      seller: form.seller,
      amount: parseFloat(form.amount),
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
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Error saving payment");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Edit
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
  // Delete
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
  const handleCancel = () => {
    resetForm();
  };

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Seller Payments Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and track all seller payments
          </p>
        </div>

        {/* ================= FORM ================= */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">
              {editingId ? "Edit Payment" : "Create New Payment"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Seller Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Seller <span className="text-red-500">*</span>
                </label>
                <select
                  name="seller"
                  value={form.seller}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none bg-white"
                >
                  <option value="">Choose a seller...</option>
                  {Array.isArray(sellers) && sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullname} {s.phoneNumber ? `- ${s.phoneNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                  />
                  <span className="absolute left-3 top-3 text-gray-400">$</span>
                </div>
              </div>

              {/* Description Textarea - Full width on both columns */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter payment description or notes..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg transition ${loading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-700 hover:shadow-lg'
                  }`}
              >
                {loading ? 'Processing...' : (editingId ? 'Update Payment' : 'Create Payment')}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Payment History
              </h2>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                Total: {pays.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Seller</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading && pays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                      </div>
                      <p className="mt-2">Loading payments...</p>
                    </td>
                  </tr>
                ) : pays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p className="text-lg">No payments found</p>
                      <p className="text-sm text-gray-400 mt-1">Create your first payment using the form above</p>
                    </td>
                  </tr>
                ) : (
                  pays.map((pay, index) => (
                    <tr key={pay.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">#{index + 1 + (page - 1) * limit}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{pay.sellerInfo?.fullname || 'Unknown Seller'}</div>
                        {pay.sellerInfo?.phoneNumber && (
                          <div className="text-xs text-gray-500">{pay.sellerInfo.phoneNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-green-600">
                          ${parseFloat(pay.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-gray-600" title={pay.description}>
                          {pay.description || <span className="text-gray-400 italic">No description</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(pay.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(pay)}
                            className="px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(pay.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-6 py-4">
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