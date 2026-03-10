import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  customer: '',
  amount: '',
  description: ''
};

const Receive = () => {
  const [receives, setReceives] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // ======================
  // Fetch Receives
  // ======================
  const fetchReceives = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/receive`);
      setReceives(res.data || []);
    } catch (error) {
      console.error('Error fetching receives:', error);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Fetch Customers from debt API
  // ======================
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/customeraccount/debt`);
      if (res.data.success) {
        setCustomers(res.data.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetchReceives();
    fetchCustomers();
  }, []);

  // ======================
  // Handle Input Change
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
  // Handle Submit (Add/Edit)
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customer || !form.amount) {
      alert('Customer and amount are required');
      return;
    }

    const payload = {
      customer: form.customer,
      amount: parseFloat(form.amount),
      description: form.description || null
    };

    setLoading(true);
    try {
      console.log(payload);
      if (editingId) {
        await axios.put(`${BASE_URL}/receive/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/receive`, payload);
      }
      resetForm();
      fetchReceives();
      fetchCustomers()
    } catch (error) {
      console.error('Error saving receive:', error);
      alert('Error saving receive');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Handle Edit
  // ======================
  const handleEdit = (receive) => {
    setForm({
      customer: receive.customer,
      amount: receive.amount,
      description: receive.description || ''
    });
    setEditingId(receive.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ======================
  // Handle Delete
  // ======================
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receive?')) return;

    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/receive/${id}`);
      fetchReceives();
    } catch (error) {
      console.error('Error deleting receive:', error);
      alert('Error deleting receive');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Cancel Edit
  // ======================
  const handleCancel = () => resetForm();

  // ======================
  // Format Date
  // ======================
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

  // Helper to get customer name (uses the fetched customers array)
  const getCustomerName = (customerId) => {
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.fullname : 'Unknown';
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header with decorative elements */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-primary"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="pr-4 text-3xl font-bold">
              Receive Management
            </span>
          </div>
          <p className="mt-2 ml-1">
            Record and track all customer payments
          </p>
        </div>

        {/* ================= FORM ================= */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-primary">
          {/* Form Header with primary gradient */}
          <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">
                {editingId ? 'Edit Receive Record' : 'Create New Receive'}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Customer Select */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Customer <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <select
                    name="customer"
                    value={form.customer}
                    onChange={handleChange}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white appearance-none"
                  >
                    <option value="">Choose a customer...</option>
                    {Array.isArray(customers) && customers.map((c) => (
                      <option key={c.id} value={c.customer.id}>
                        <span> {c.customer.fullname}</span>- <span>{c.totalDue}</span>
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Amount <span className="text-primary">*</span>
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
                    className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>

              {/* Description - Full width */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter description or notes..."
                  rows="3"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3.5 bg-primary text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-lg ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:bg-primary'
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
                    <span>{editingId ? 'Update Receive' : 'Create Receive'}</span>
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary">
          {/* Table Header with primary gradient */}
          <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Receive History
                </h2>
              </div>
              <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold border border-white/30">
                Total: {receives.length} receives
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-primary">
                {loading && receives.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                          <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                        </div>
                        <p className="font-medium">Loading receives...</p>
                      </div>
                    </td>
                  </tr>
                ) : receives.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 bg-primary rounded-full mb-4">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-900">No receives found</p>
                        <p className="text-sm mt-1">Create your first receive using the form above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  receives.map((receive, index) => (
                    <tr key={receive.id} className="group hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {receive.customerInfo?.fullname || getCustomerName(receive.customer)}
                            </div>
                            {receive.customerInfo?.phoneNumber && (
                              <div className="text-xs text-gray-500">{receive.customerInfo.phoneNumber}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-xl font-semibold">
                          ${parseFloat(receive.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{formatDate(receive.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs text-gray-600" title={receive.description}>
                          {receive.description || <span className="text-gray-400 italic">No description</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(receive)}
                            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all transform hover:scale-105"
                            title="Edit receive"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(receive.id)}
                            className="p-2 text-red-700 rounded-lg hover:bg-red-200 transition-all transform hover:scale-105"
                            title="Delete receive"
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

          {/* Optional: Add Pagination here if backend supports it */}
        </div>
      </div>
    </div>
  );
};

export default Receive;