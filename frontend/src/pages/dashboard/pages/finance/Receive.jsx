import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomerReport from './CustomerReport';
import ReceiptDateDownload from '../report/ReceiptDateDownload.jsx';
import Pagination from '../../pagination/Pagination';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  customer: '',
  description: ''
};

const Receive = () => {
  const [activeTab, setActiveTab] = useState('receives');
  const [receives, setReceives] = useState([]);
  const [customers, setCustomers] = useState([]);       // full customer debt data
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [departmentAmounts, setDepartmentAmounts] = useState({}); // { department1: 2000, department2: 0, ... }
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // ======================
  // Fetch Receives (with pagination)
  // ======================
  const fetchReceives = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/receive`, {
        params: { page, limit }
      });
      setReceives(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching receives:', error);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Fetch Customers (with department breakdown)
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
    if (activeTab === 'receives') {
      fetchReceives();
      fetchCustomers();
    }
  }, [activeTab, page]);

  // ======================
  // When customer is selected, load their department data
  // ======================
  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setForm({ ...form, customer: customerId });
    setDepartmentAmounts({});
    setSelectedCustomerData(null);

    if (customerId) {
      const selected = customers.find(c => c.customer?.id === parseInt(customerId));
      if (selected) {
        setSelectedCustomerData(selected);
        // Extract department fields (keys starting with 'department')
        const deptFields = Object.keys(selected).filter(k => k.startsWith('department'));
        const initialDeptAmounts = {};
        deptFields.forEach(field => {
          initialDeptAmounts[field] = 0; // start with 0 for each department
        });
        setDepartmentAmounts(initialDeptAmounts);
      }
    }
  };

  // ======================
  // Update amount for a specific department
  // ======================
  const handleDeptAmountChange = (deptKey, value) => {
    const numValue = parseFloat(value) || 0;
    setDepartmentAmounts(prev => ({
      ...prev,
      [deptKey]: numValue
    }));
  };

  // ======================
  // Calculate total payment from all departments
  // ======================
  const getTotalPayment = () => {
    return Object.values(departmentAmounts).reduce((sum, val) => sum + (val || 0), 0);
  };

  // ======================
  // Get max possible per department (from customer data)
  // ======================
  const getMaxForDepartment = (deptKey) => {
    if (!selectedCustomerData) return 0;
    return selectedCustomerData[deptKey] || 0;
  };

  // ======================
  // Validate before submit
  // ======================
  const validatePayment = () => {
    if (!form.customer) {
      alert('Please select a customer');
      return false;
    }
    const totalPayment = getTotalPayment();
    if (totalPayment === 0) {
      alert('Please enter at least one department payment amount');
      return false;
    }
    if (selectedCustomerData) {
      const totalDue = selectedCustomerData.total_due || 0;
      if (totalPayment > totalDue) {
        alert(`Total payment (${totalPayment}) cannot exceed total due (${totalDue})`);
        return false;
      }
      // Per‑department maximums are enforced by the input's max attribute, but double‑check
      for (const [deptKey, amount] of Object.entries(departmentAmounts)) {
        const maxAllowed = getMaxForDepartment(deptKey);
        if (amount > maxAllowed) {
          alert(`Amount for ${deptKey} (${amount}) exceeds the due amount for that department (${maxAllowed})`);
          return false;
        }
      }
    }
    return true;
  };

  // ======================
  // Handle Submit (Add/Edit)
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePayment()) return;

    // Build payload: include department fields if any, otherwise fallback to single amount
    const payload = {
      customer: form.customer,
      description: form.description || null,
      date: new Date().toISOString()
    };

    const totalPayment = getTotalPayment();
    const hasDepartmentPayments = Object.keys(departmentAmounts).some(k => departmentAmounts[k] > 0);

    if (hasDepartmentPayments) {
      // Department‑specific payment
      for (const [deptKey, amount] of Object.entries(departmentAmounts)) {
        if (amount > 0) {
          payload[deptKey] = amount;
        }
      }
    } else {
      // Fallback to single amount (should not happen because validation ensures at least one amount)
      if (totalPayment === 0) return;
      payload.amount = totalPayment;
    }

    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/receive/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/receive`, payload);
      }
      resetForm();
      fetchReceives();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving receive:', error);
      alert(error.response?.data?.message || 'Error saving receive');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Reset Form
  // ======================
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setDepartmentAmounts({});
    setSelectedCustomerData(null);
  };

  // ======================
  // Handle Edit – pre‑fill form (⚠️ editing with department split is complex; you may disable or implement later)
  // ======================
  const handleEdit = (receive) => {
    // For simplicity, editing falls back to single amount; you can extend to fetch original department allocation
    alert('Editing with department split is not fully supported yet. Please delete and recreate if needed.');
    // Alternatively, you could fetch the original allocation from the backend.
  };

  // ======================
  // Handle Delete
  // ======================
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receive?')) return;
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/receive/${id}`);
      if (receives.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchReceives();
      }
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting receive:', error);
      alert('Error deleting receive');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => resetForm();
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getCustomerName = (customerId) => {
    const cust = customers.find(c => c.customer?.id === customerId);
    return cust ? cust.customer.fullname : 'Unknown';
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tab Bar */}
        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('receives'); setPage(1); }}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
              activeTab === 'receives'
                ? 'bg-primary text-white shadow-lg'
                : 'text-gray-600 hover:text-primary hover:bg-gray-100'
            }`}
          >
            Receives
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
              activeTab === 'report'
                ? 'bg-primary text-white shadow-lg'
                : 'text-gray-600 hover:text-primary hover:bg-gray-100'
            }`}
          >
            Customer Report
          </button>
        </div>

        {activeTab === 'receives' ? (
          <>
            <div className="mb-8 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-primary"></div>
              </div>
              <div className="relative flex justify-start">
                <span className="pr-4 text-3xl font-bold">Receive Management</span>
              </div>
              <p className="mt-2 ml-1">Record and track all customer payments – now with department‑specific allocation</p>
            </div>

            {/* FORM */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-primary">
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
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Select Customer <span className="text-primary">*</span>
                  </label>
                  <select
                    name="customer"
                    value={form.customer}
                    onChange={handleCustomerChange}
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map((c) => (
                      <option key={c.customer.id} value={c.customer.id}>
                        {c.customer.fullname} - Total Due: ${c.total_due}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department breakdown and input fields */}
                {selectedCustomerData && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">Department Payment Allocation</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(departmentAmounts).map((deptKey) => {
                          const maxAmount = getMaxForDepartment(deptKey);
                          if (maxAmount === 0) return null;
                          return (
                            <div key={deptKey} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 capitalize">
                                {deptKey.replace('department', 'Department ')} (Due: ${maxAmount})
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <input
                                  type="number"
                                  value={departmentAmounts[deptKey] || 0}
                                  onChange={(e) => handleDeptAmountChange(deptKey, e.target.value)}
                                  min="0"
                                  max={maxAmount}
                                  step="0.01"
                                  className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 text-sm bg-white p-3 rounded-lg">
                        <span className="font-semibold">Total Payment: </span>
                        <span className="text-primary font-bold">${getTotalPayment().toFixed(2)}</span>
                        {selectedCustomerData.total_due && (
                          <span className="ml-4 text-gray-600">
                            (Out of total due: ${selectedCustomerData.total_due})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter description or notes..."
                    rows="3"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-3.5 bg-primary text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-lg ${
                      loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:bg-primary'
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
                      className="px-8 py-3.5 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* TABLE (unchanged) */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary">
              <ReceiptDateDownload />
              <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Receive History</h2>
                  </div>
                  <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                    Total: {totalRecords} receives
                  </span>
                </div>
              </div>
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
                      <tr><td colSpan="6" className="px-6 py-16 text-center">Loading...</td></tr>
                    ) : receives.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-16 text-center">No receives found</td></tr>
                    ) : (
                      receives.map((receive, index) => (
                        <tr key={receive.id} className="group hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {String(index + 1 + (page - 1) * limit).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">
                              {receive.customerInfo?.fullname || getCustomerName(receive.customer)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-xl font-semibold">
                              ${parseFloat(receive.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(receive.createdAt)}</td>
                          <td className="px-6 py-4 text-gray-600">{receive.description || <span className="italic">No description</span>}</td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(receive)}
                                className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all"
                                title="Edit receive"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(receive.id)}
                                className="p-2 text-red-700 rounded-lg hover:bg-red-200 transition-all"
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
              {totalPages > 1 && (
                <div className="border-t border-primary px-6 py-4 bg-primary/50">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </div>
          </>
        ) : (
          <CustomerReport />
        )}
      </div>
    </div>
  );
};

export default Receive;