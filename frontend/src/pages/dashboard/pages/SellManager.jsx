import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiEye } from "react-icons/fi";
import { FaPrint } from "react-icons/fa";
import { useSelector } from "react-redux";
import PrintBillOrder from "./PrintOrderBill";
import SellsDateDownload from "./report/SellsDateDownload";
import Pagination from "../pagination/Pagination"; // Import your Pagination component
import PrintMultipleOrders from "./report/PrintMultipleOrders";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
  const [printAuto, setPrintAuto] = useState(false);
  const [printBillOpen, setPrintBillOpen] = useState(false);
  const [printBillData, setPrintBillData] = useState(null);
  const { accessToken } = useSelector((state) => state.user);
  const [sells, setSells] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stockIncomes, setStockIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  // New state for multi‑select
  const [selectedSellIds, setSelectedSellIds] = useState([]);
  const [printMultipleOpen, setPrintMultipleOpen] = useState(false);
  const [selectedSellsForPrint, setSelectedSellsForPrint] = useState([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // State for inline customer addition
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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


  const getSelectedSells = () => {
    return sells.filter(sell => selectedSellIds.includes(sell.id));
  };

  const handleSelectAll = () => {
    if (selectedSellIds.length === sells.length) {
      setSelectedSellIds([]);
    } else {
      setSelectedSellIds(sells.map(s => s.id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedSellIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintSelected = () => {
    const selected = getSelectedSells();
    if (selected.length === 0) return;
    setSelectedSellsForPrint(selected);
    setPrintMultipleOpen(true);
  };

  // ... (fetchSells, fetchCustomers, etc. unchanged)

  // After fetching sells, you may want to clear selection when page changes
  useEffect(() => {
    setSelectedSellIds([]);
  }, [pagination.currentPage]);

  // Handler to print an existing sell
  const handlePrintSell = (sell) => {
    setPrintBillData(sell);
    setPrintAuto(false);
    setPrintBillOpen(true);
  };

  /* =========================
     Fetch Data (with pagination)
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
      setStockIncomes(res.data.stockIncomes);
    } catch (error) {
      console.error("Error fetching stock incomes:", error);
    }
  };

  const fetchSells = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/sells`, {
        params: { page, limit },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      // Response structure: { sells: [...], pagination: {...} }
      setSells(res.data.sells);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Error fetching sells:", error);
      showNotification("Failed to fetch sells", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSells(newPage, pagination.itemsPerPage);
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
    if (name === "customer") {
      const customerObj = customers.find(c => c.id === parseInt(value));
      setSelectedCustomer(customerObj);
      setFormData(prev => ({ ...prev, customer: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.stockIncome || !formData.amount || !formData.unitPrice) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    let payload = {
      stockIncome: formData.stockIncome,
      amount: parseInt(formData.amount),
      unitPrice: parseFloat(formData.unitPrice),
      received: parseFloat(formData.received) || 0,
    };

    if (addingCustomer) {
      if (!newCustomerName.trim()) {
        showNotification('Please enter a customer name', 'error');
        return;
      }
      payload.newCustomerName = newCustomerName.trim();
    } else {
      if (!formData.customer) {
        showNotification('Please select a customer', 'error');
        return;
      }
      payload.customer = formData.customer;
    }

    setSubmitting(true);
    try {
      if (editingRecord) {
        await axios.put(`${BASE_URL}/sells/${editingRecord.id}`, payload);
        showNotification('Sell updated successfully');
      } else {
        await axios.post(`${BASE_URL}/sells/create`, payload);
        showNotification('Sell created successfully');
      }

      setModalVisible(false);
      resetForm();
      // Refresh the current page after create/update
      fetchSells(pagination.currentPage, pagination.itemsPerPage);
      fetchStockIncomes();
      fetchCustomers();
    } catch (error) {
      console.error("Error submitting form:", error);
      showNotification('Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/sells/${deleteId}`);
      showNotification('Sell deleted successfully');
      setDeleteModalVisible(false);
      setDeleteId(null);
      // Refresh current page after delete
      fetchSells(pagination.currentPage, pagination.itemsPerPage);
      fetchStockIncomes();
    } catch (error) {
      console.error("Error deleting sell:", error);
      showNotification('Failed to delete sell', 'error');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      stockIncome: record.stockIncome,
      customer: record.customer?.id || record.customer,
      amount: record.amount,
      unitPrice: record.unitPrice,
      received: record.received,
    });

    const selected = stockIncomes.find(item => item.id === parseInt(record.stockIncome));
    setSelectedStockIncome(selected || null);
    setModalVisible(true);
    setAddingCustomer(false);
    setNewCustomerName("");
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
    setAddingCustomer(false);
    setNewCustomerName("");
    setSelectedCustomer(null);
  };

  /* =========================
     Sorting & Filtering (client‑side on current page)
  ========================== */
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header – add "Print Selected" button */}
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
            <div className="flex gap-3">
              {selectedSellIds.length > 0 && (
                <button
                  onClick={handlePrintSelected}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:bg-purple-700"
                >
                  <FaPrint className="w-5 h-5" />
                  Print Selected ({selectedSellIds.length})
                </button>
              )}
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <SellsDateDownload />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedSellIds.length === sells.length && sells.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <SortableHeader label="ID" sortKey="id" />
                  <SortableHeader label="Type" sortKey="is_returned" />
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
                  <tr><td colSpan="11" className="px-6 py-12 text-center">Loading...</td></tr>
                ) : sells.length === 0 ? (
                  <tr><td colSpan="11" className="px-6 py-16 text-center">No sell records found</td></tr>
                ) : (
                  sells.map((sell) => (
                    <tr key={sell.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedSellIds.includes(sell.id)}
                          onChange={() => handleSelectOne(sell.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">#{sell.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sell.is_returned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Returned</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Sold</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{sell.stock?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sell.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sell.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${parseFloat(sell.unitPrice).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">${parseFloat(sell.total).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">${parseFloat(sell.received).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${parseFloat(sell.remained) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          ${parseFloat(sell.remained).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => handleView(sell)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><FiEye /></button>
                          <button onClick={() => handleEdit(sell)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Edit"><FiEdit2 /></button>
                          <button onClick={() => handleDeleteClick(sell.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><FiTrash2 /></button>
                          <button onClick={() => handlePrintSell(sell)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Print Bill"><FaPrint /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3">
              <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </div>

        {/* Modals (Create/Edit, View, Delete) – unchanged */}

        {/* Print Multiple Orders Modal */}
        <PrintMultipleOrders
          isOpen={printMultipleOpen}
          onClose={() => setPrintMultipleOpen(false)}
          orders={selectedSellsForPrint}
          autoPrint={false}
        />

        {/* Single Print Modal */}
        <PrintBillOrder isOpen={printBillOpen} onClose={() => setPrintBillOpen(false)} order={printBillData} autoPrint={false} />
      </div>
      {/* Modals (Create/Edit, View, Delete) – unchanged except refresh uses current page */}
      {modalVisible && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-0 border w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden">
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

                {/* Customer Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  {addingCustomer ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="New customer name"
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCustomer(false);
                          setNewCustomerName("");
                        }}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <select
                        name="customer"
                        value={formData.customer}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-gray-50 hover:bg-white"
                        required={!addingCustomer}
                      >
                        <option value="">Select Customer</option>
                        {customers.map((cust) => (
                          <option key={cust.id} value={cust.id}>
                            {cust.fullname} - {cust.phoneNumber}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setAddingCustomer(true)}
                        className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90"
                        title="Add new customer"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
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
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-colors ${submitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90"
                    }`}
                >
                  {submitting ? "Processing..." : (editingRecord ? 'Update' : 'Create')}
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
