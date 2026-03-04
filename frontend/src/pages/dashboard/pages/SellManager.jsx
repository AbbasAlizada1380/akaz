import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiEye } from 'react-icons/fi';
import { useSelector } from "react-redux";
const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
  const { accessToken } = useSelector((state) => state.user);
  const [sells, setSells] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockIncomes, setStockIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    stockIncome: "",
    customer: "",
    amount: "",
    unitPrice: "",
    received: "",
  });
  const [selectedStockIncome, setSelectedStockIncome] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({ customer: null });

  const total = formData.amount && formData.unitPrice ? formData.amount * formData.unitPrice : 0;
  const remained = total - (formData.received || 0);

  /* =========================
     Fetch Data
  ========================== */
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/customer`);
      setCustomers(res.data.customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };


  const fetchStockIncomes = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/stockincome`);
      setStockIncomes(res.data);
    } catch (error) {
      console.error("Error fetching stock incomes:", error);
    }
  };

  const fetchSells = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/sells`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setSells(res.data);
    } catch (error) {
      console.error("Error fetching sells:", error);
      showNotification("Failed to fetch sells", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSells();
    fetchCustomers();
    fetchStockIncomes();
  }, []);

  /* =========================
     Helpers
  ========================== */
  const showNotification = (message, type = 'success') => {
    alert(message);
  };

  /* =========================
     Handle Stock Income Selection
  ========================== */
  const handleStockIncomeChange = (e) => {
    const selectedId = e.target.value;
    setFormData(prev => ({ ...prev, stockIncome: selectedId }));

    const selected = stockIncomes.find(item => item.id === parseInt(selectedId));
    setSelectedStockIncome(selected || null);

    if (selected) {
      setFormData(prev => ({ ...prev, unitPrice: selected.unitPrice }));
    }
  };

  /* =========================
     Form Handling
  ========================== */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.stockIncome || !formData.customer || !formData.amount || !formData.unitPrice) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const data = {
      stockIncome: formData.stockIncome,
      customer: formData.customer,
      amount: parseInt(formData.amount),
      unitPrice: parseFloat(formData.unitPrice),
      received: parseFloat(formData.received) || 0,
    };

    try {
      if (editingRecord) {
        await axios.put(`${BASE_URL}/sells/${editingRecord.id}`, data);
        showNotification('Sell updated successfully');
      } else {
        await axios.post(`${BASE_URL}/sells/create`, data);
        showNotification('Sell created successfully');
      }

      setModalVisible(false);
      resetForm();
      fetchSells();
    } catch (error) {
      console.error("Error submitting form:", error);
      showNotification('Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/sells/${deleteId}`);
      showNotification('Sell deleted successfully');
      setDeleteModalVisible(false);
      setDeleteId(null);
      fetchSells();
    } catch (error) {
      console.error("Error deleting sell:", error);
      showNotification('Failed to delete sell', 'error');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      stockIncome: record.stockIncome,
      customer: record.customer,
      amount: record.amount,
      unitPrice: record.unitPrice,
      received: record.received,
    });

    const selected = stockIncomes.find(item => item.id === parseInt(record.stockIncome));
    setSelectedStockIncome(selected || null);
    setModalVisible(true);
  };

  const handleView = (record) => {
    setViewingRecord(record);
    setViewModalVisible(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      stockIncome: "",
      customer: "",
      amount: "",
      unitPrice: "",
      received: "",
    });
    setSelectedStockIncome(null);
    setEditingRecord(null);
  };

  /* =========================
     Sorting & Filtering
  ========================== */
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredAndSortedData = () => {
    let filteredData = [...sells];

    if (filters.customer) {
      filteredData = filteredData.filter(item => item.customer === filters.customer);
    }

    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'stockIncomeName') {
          const aStock = stockIncomes.find(s => s.id === parseInt(a.stockIncome));
          const bStock = stockIncomes.find(s => s.id === parseInt(b.stockIncome));
          aValue = aStock?.name || '';
          bValue = bStock?.name || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  };

  const filteredAndSortedData = getFilteredAndSortedData();

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-primary/90"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const getCustomerName = (customerFullname) => {
    const customer = customers.find(c => c.fullname === customerFullname);
    return customer ? `${customer.fullname} (${customer.phoneNumber})` : customerFullname;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with gradient background */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/70 rounded-2xl -z-10"></div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sell Management</h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage all sales transactions</p>
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              setModalVisible(true);
            }}
            className="bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 hover:shadow-lg group"
          >
            <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Add New Sell
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary">
              <tr>
                <SortableHeader label="ID" sortKey="id" />
                <SortableHeader label="Stock Income" sortKey="stockIncomeName" />
                <SortableHeader label="Customer" sortKey="customer" />
                <SortableHeader label="Amount" sortKey="amount" />
                <SortableHeader label="Unit Price" sortKey="unitPrice" />
                <SortableHeader label="Total" sortKey="total" />
                <SortableHeader label="Received" sortKey="received" />
                <SortableHeader label="Remained" sortKey="remained" />
                <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-4 w-4 bg-primary rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500 text-lg">No sell records found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filters or add a new one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((sell) => {
                  const relatedStock = stockIncomes.find(item => item.id === parseInt(sell.stockIncome));
                  return (
                    <tr
                      key={sell.id}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{sell.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {relatedStock ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{relatedStock.name}</div>
                            <div className="text-xs text-gray-500">ID: {sell.stockIncome}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">ID: {sell.stockIncome}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{getCustomerName(sell.customer)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{sell.amount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">${parseFloat(sell.unitPrice).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">${parseFloat(sell.total).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-green-600 font-medium">${parseFloat(sell.received).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${parseFloat(sell.remained) > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                          }`}>
                          ${parseFloat(sell.remained).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(sell)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(sell)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sell.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
            {/* Modal Header with gradient */}
            <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {editingRecord ? 'Edit Sell Record' : 'Add New Sell Record'}
                </h3>
                <button
                  onClick={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* StockIncome Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Income <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.stockIncome}
                    onChange={handleStockIncomeChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                    required
                  >
                    <option value="">Select Stock Income</option>
                    {stockIncomes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} - {item.name} (Seller: {item.sellerName}, Remaining: ${item.remaining})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Selected Stock Income Details */}
                {selectedStockIncome && (
                  <div className="md:col-span-2 bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Selected Stock Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStockIncome.name}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStockIncome.type}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Quantity:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStockIncome.quantity}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Unit Price:</span>
                        <span className="ml-2 font-medium text-primary">${selectedStockIncome.unitPrice}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Department:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStockIncome.departmentName}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Seller:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedStockIncome.sellerName}</span>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <span className="text-gray-500">Remaining:</span>
                        <span className="ml-2 font-medium text-yellow-600">${selectedStockIncome.remaining}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customer"
                    value={formData.customer}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.fullname}>
                        {cust.fullname} - {cust.phoneNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    value={formData.amount}
                    onChange={(e) => handleNumberChange('amount', parseInt(e.target.value) || '')}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      name="unitPrice"
                      min="0"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => handleNumberChange('unitPrice', parseFloat(e.target.value) || '')}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Received */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      name="received"
                      min="0"
                      step="0.01"
                      value={formData.received}
                      onChange={(e) => handleNumberChange('received', parseFloat(e.target.value) || '')}
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Live Calculation */}
                <div className="md:col-span-2 bg-primary/5 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="ml-2 text-lg font-bold text-primary">${total.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Remained:</span>
                      <span className={`ml-2 text-lg font-bold ${remained > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        ${remained.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModalVisible && viewingRecord && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Sell Record Details</h3>
                <button
                  onClick={() => setViewModalVisible(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Record ID</p>
                  <p className="font-semibold text-gray-900">#{viewingRecord.id}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Stock Income ID</p>
                  <p className="font-semibold text-gray-900">{viewingRecord.stockIncome}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="font-semibold text-gray-900">{getCustomerName(viewingRecord.customer)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="font-semibold text-gray-900">{viewingRecord.amount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Unit Price</p>
                  <p className="font-semibold text-primary">${parseFloat(viewingRecord.unitPrice).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="font-semibold text-gray-900">${parseFloat(viewingRecord.total).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Received</p>
                  <p className="font-semibold text-green-600">${parseFloat(viewingRecord.received).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Remained</p>
                  <p className={`font-semibold ${parseFloat(viewingRecord.remained) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    ${parseFloat(viewingRecord.remained).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="font-semibold text-gray-900">{new Date(viewingRecord.createdAt).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="font-semibold text-gray-900">{new Date(viewingRecord.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setViewModalVisible(false)}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalVisible && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-0 border w-96 shadow-2xl rounded-xl bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Delete Sell Record</h3>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this sell record? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeleteModalVisible(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellManager;