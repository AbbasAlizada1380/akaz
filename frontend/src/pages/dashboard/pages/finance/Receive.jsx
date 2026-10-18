import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment-jalaali';
import CustomerReport from './CustomerReport';
import ReceiptDateDownload from '../report/ReceiptDateDownload.jsx';
import Pagination from '../../pagination/Pagination';
import VazirmatnTTF from '../../../../../public/ttf/Vazirmatn.js';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  customer: '',
  description: '',
};

const Receive = () => {
  const [activeTab, setActiveTab] = useState('receives');
  const [receives, setReceives] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [departmentAmounts, setDepartmentAmounts] = useState({});
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);

  // Selection state for creating a receipt bill
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDescription, setBillDescription] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // ======================
  // Fetch Receives
  // ======================
  const fetchReceives = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/receive`, {
        params: { page, limit },
      });
      setReceives(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.totalRecords || 0);
      setSelectedReceipts([]);
    } catch (error) {
      console.error('Error fetching receives:', error);
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Fetch Customers
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
  // Customer select
  // ======================
  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setForm({ ...form, customer: customerId });
    setDepartmentAmounts({});
    setSelectedCustomerData(null);

    if (customerId) {
      const selected = customers.find(
        (c) => c.customer?.id === parseInt(customerId)
      );
      if (selected) {
        setSelectedCustomerData(selected);
        const initialDeptAmounts = {};
        if (selected.departments && Array.isArray(selected.departments)) {
          selected.departments.forEach((dept) => {
            initialDeptAmounts[dept.id] = 0;
          });
        }
        setDepartmentAmounts(initialDeptAmounts);
      }
    }
  };

  const handleDeptAmountChange = (deptId, value) => {
    // ⚠️ Keep the raw value as string while the user types (including "-")
    setDepartmentAmounts((prev) => ({ ...prev, [deptId]: value }));
  };

  // Parse helper for calculations only
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getTotalPayment = () => {
    return Object.values(departmentAmounts).reduce(
      (sum, val) => sum + toNum(val),
      0
    );
  };

  const getMaxForDepartment = (deptId) => {
    if (!selectedCustomerData || !selectedCustomerData.departments) return 0;
    const dept = selectedCustomerData.departments.find(
      (d) => d.id === deptId
    );
    return dept ? dept.amount : 0;
  };

  const getDepartmentName = (deptId) => {
    if (!selectedCustomerData || !selectedCustomerData.departments)
      return `Department ${deptId}`;
    const dept = selectedCustomerData.departments.find(
      (d) => d.id === deptId
    );
    return dept ? dept.name : `Department ${deptId}`;
  };

  /**
   * Sign-aware validation.
   *
   * For each department:
   *   - |payment| cannot exceed |deptDue|
   *   - payment must be in the SAME direction as deptDue (both positive, or
   *     both negative). A positive payment cannot clear a negative return,
   *     and vice versa.
   *
   * Total cannot exceed total abs open either.
   */
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
      for (const [deptIdRaw, rawVal] of Object.entries(departmentAmounts)) {
        const amount = toNum(rawVal);
        if (amount === 0) continue;

        const deptId = parseInt(deptIdRaw, 10);
        const deptDue = toNum(getMaxForDepartment(deptId));
        const deptName = getDepartmentName(deptId);

        // Same-sign rule (both > 0, both < 0, or deptDue === 0)
        if (deptDue !== 0 && Math.sign(amount) !== Math.sign(deptDue)) {
          alert(
            `Amount for ${deptName} (${amount}) has the wrong direction. ` +
              `Department balance is ${deptDue}. ` +
              (deptDue > 0
                ? 'Enter a positive payment.'
                : 'Enter a negative amount to refund.')
          );
          return false;
        }

        // Magnitude rule
        if (Math.abs(amount) > Math.abs(deptDue)) {
          alert(
            `Amount for ${deptName} (${amount}) exceeds the balance ` +
              `for that department (${deptDue}).`
          );
          return false;
        }
      }

      // Global magnitude check
      const totalAbsDue = (selectedCustomerData.departments || []).reduce(
        (sum, d) => sum + Math.abs(toNum(d.amount)),
        0
      );
      if (Math.abs(totalPayment) > totalAbsDue) {
        alert(
          `Total payment (${totalPayment}) exceeds total open balance (${totalAbsDue}).`
        );
        return false;
      }
    }

    return true;
  };

  // ======================
  // Submit
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePayment()) return;

    const payload = {
      customer: form.customer,
      description: form.description || null,
      date: new Date().toISOString(),
    };

    let hasNonZero = false;
    for (const [deptId, rawVal] of Object.entries(departmentAmounts)) {
      const amount = toNum(rawVal);
      if (amount !== 0) {
        // ⚠️ Send negative amounts as-is
        payload[`department${deptId}`] = amount;
        hasNonZero = true;
      }
    }

    if (!hasNonZero) {
      alert('Please enter at least one department payment amount');
      return;
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

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setDepartmentAmounts({});
    setSelectedCustomerData(null);
  };

  // ======================
  // Edit / Delete
  // ======================
  const handleEdit = () => {
    alert(
      'Editing with department split is not fully supported yet. Please delete and recreate if needed.'
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receive?'))
      return;
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

  const formatDate = (dateString) =>
    moment(dateString).format('YYYY/MM/DD HH:mm');

  const getCustomerName = (customerId) => {
    const cust = customers.find((c) => c.customer?.id === customerId);
    return cust ? cust.customer.fullname : 'Unknown';
  };

  // ======================
  // Selection helpers
  // ======================
  const toggleReceiptSelection = (id) => {
    setSelectedReceipts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentlySelectedCustomer =
      selectedReceipts.length > 0
        ? receives.find((r) => r.id === selectedReceipts[0])?.customer
        : null;

    const visibleIds = receives
      .filter(
        (r) =>
          !currentlySelectedCustomer ||
          r.customer === currentlySelectedCustomer
      )
      .map((r) => r.id);

    const allSelected = visibleIds.every((id) =>
      selectedReceipts.includes(id)
    );

    if (allSelected) setSelectedReceipts([]);
    else setSelectedReceipts(visibleIds);
  };

  const getSelectedTotal = () => {
    return receives
      .filter((r) => selectedReceipts.includes(r.id))
      .reduce((sum, r) => sum + toNum(r.amount), 0);
  };

  const getSelectedCustomer = () => {
    if (selectedReceipts.length === 0) return null;
    const first = receives.find((r) => r.id === selectedReceipts[0]);
    return first ? first.customer : null;
  };

  const openBillModal = () => {
    if (selectedReceipts.length === 0) {
      alert('Please select at least one receipt');
      return;
    }
    const firstRec = receives.find((r) => r.id === selectedReceipts[0]);
    const firstCustomer = firstRec?.customer;
    const mixed = selectedReceipts.some((id) => {
      const rec = receives.find((r) => r.id === id);
      return rec && rec.customer !== firstCustomer;
    });
    if (mixed) {
      alert('All selected receipts must belong to the same customer.');
      return;
    }
    setBillDescription('');
    setShowBillModal(true);
  };

  const isRowSelected = (id) => selectedReceipts.includes(id);
  const canSelectRow = (receive) => {
    if (selectedReceipts.length === 0) return true;
    const firstRec = receives.find((r) => r.id === selectedReceipts[0]);
    return firstRec && firstRec.customer === receive.customer;
  };

  // ======================
  // Download combined PDF
  // ======================
  const handleDownloadPDF = () => {
    const selectedItems = receives.filter((r) =>
      selectedReceipts.includes(r.id)
    );
    if (selectedItems.length === 0) return;

    const customerName = getCustomerName(getSelectedCustomer());
    const total = getSelectedTotal();

    const billNumber = `RB-${Date.now().toString().slice(-6)}`;
    const dateStr = moment().format('YYYY/MM/DD HH:mm');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });
    doc.setR2L(false);
    doc.addFileToVFS('Vazirmatn.ttf', VazirmatnTTF);
    doc.addFont('Vazirmatn.ttf', 'Vazirmatn', 'normal');
    doc.setFont('Vazirmatn');

    doc.setFontSize(16);
    doc.text(
      'Combined Receipt Bill',
      doc.internal.pageSize.getWidth() - 40,
      40,
      { align: 'right' }
    );

    doc.setFontSize(10);
    doc.text(
      `Bill #: ${billNumber}`,
      doc.internal.pageSize.getWidth() - 40,
      65,
      { align: 'right' }
    );
    doc.text(`Date: ${dateStr}`, doc.internal.pageSize.getWidth() - 40, 80, {
      align: 'right',
    });
    doc.text(
      `Customer: ${customerName}`,
      doc.internal.pageSize.getWidth() - 40,
      95,
      { align: 'right' }
    );

    let startY = 115;
    if (billDescription) {
      doc.text(
        `Notes: ${billDescription}`,
        doc.internal.pageSize.getWidth() - 40,
        startY,
        { align: 'right' }
      );
      startY += 20;
    }

    const headers = [['#', 'Date', 'Description', 'Amount']];
    const body = selectedItems.map((item, index) => [
      index + 1,
      formatDate(item.createdAt),
      item.description || '-',
      toNum(item.amount).toFixed(2),
    ]);

    autoTable(doc, {
      startY,
      head: headers,
      body,
      theme: 'grid',
      styles: {
        font: 'Vazirmatn',
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: 20,
        fontStyle: 'normal',
      },
      margin: { left: 30, right: 30 },
    });

    let finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text(
      `Total Paid: ${total.toFixed(2)}`,
      doc.internal.pageSize.getWidth() - 40,
      finalY,
      { align: 'right' }
    );

    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`${i}/${pageCount}`, pageWidth - 40, pageHeight - 30, {
        align: 'right',
      });
      doc.text(
        `Generated: ${moment().format('YYYY/MM/DD HH:mm')}`,
        pageWidth - 40,
        pageHeight - 15,
        { align: 'right' }
      );
    }

    doc.save(`Receipt_Bill_${billNumber}.pdf`);
    setShowBillModal(false);
  };

  // ======================
  // Render
  // ======================
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tab Bar */}
        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('receives');
              setPage(1);
            }}
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
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div className="w-full border-t border-primary"></div>
              </div>
              <div className="relative flex justify-start">
                <span className="pr-4 text-3xl font-bold">
                  Receive Management
                </span>
              </div>
              <p className="mt-2 ml-1">
                Record payments and refunds – negative amounts represent refunds
                / customer credit
              </p>
            </div>

            {/* FORM */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-primary">
              <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      ></path>
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
                        {c.customer.fullname} - Balance: {c.total_due}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomerData &&
                  selectedCustomerData.departments &&
                  selectedCustomerData.departments.length > 0 && (
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">
                          Department Payment Allocation
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                          Positive amounts = customer pays. Negative amounts =
                          refund to customer. Sign must match the department
                          balance.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedCustomerData.departments.map((dept) => {
                            const balance = toNum(dept.amount);
                            if (balance === 0) return null;
                            const current =
                              departmentAmounts[dept.id] ?? 0;
                            const overLimit =
                              Math.abs(toNum(current)) >
                              Math.abs(balance);
                            const wrongDirection =
                              toNum(current) !== 0 &&
                              Math.sign(toNum(current)) !== Math.sign(balance);
                            return (
                              <div key={dept.id} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  {dept.name} (Balance: {balance})
                                </label>
                                <input
                                  type="number"
                                  /* ⚠️ NO min="0" — negatives allowed */
                                  value={current}
                                  onChange={(e) =>
                                    handleDeptAmountChange(
                                      dept.id,
                                      e.target.value
                                    )
                                  }
                                  step="0.01"
                                  placeholder={
                                    balance > 0 ? 'Amount to pay' : 'Refund (negative)'
                                  }
                                  className={`w-full border-2 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary ${
                                    overLimit || wrongDirection
                                      ? 'border-red-400'
                                      : 'border-gray-200'
                                  }`}
                                />
                                {(overLimit || wrongDirection) && (
                                  <p className="text-xs text-red-600">
                                    {wrongDirection
                                      ? `Must be ${
                                          balance > 0 ? 'positive' : 'negative'
                                        }`
                                      : `Cannot exceed ${balance}`}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 text-sm bg-white p-3 rounded-lg">
                          <span className="font-semibold">
                            Total Payment:{' '}
                          </span>
                          <span
                            className={`font-bold ${
                              getTotalPayment() < 0
                                ? 'text-red-600'
                                : 'text-primary'
                            }`}
                          >
                            {getTotalPayment().toFixed(2)}
                          </span>
                          {selectedCustomerData.total_due !== undefined && (
                            <span className="ml-4 text-gray-600">
                              (Net balance: {selectedCustomerData.total_due})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
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
                      loading
                        ? 'opacity-50 cursor-not-allowed hover:scale-100'
                        : 'hover:bg-primary'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        <span>
                          {editingId ? 'Update Receive' : 'Create Receive'}
                        </span>
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

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary">
              <ReceiptDateDownload />
              <div className="bg-gradient-to-r from-primary to-primary px-6 py-5">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        ></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">
                      Receive History
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedReceipts.length > 0 && (
                      <button
                        onClick={openBillModal}
                        className="bg-white text-primary font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-all shadow"
                      >
                        Create Receipt Bill ({selectedReceipts.length})
                      </button>
                    )}
                    <span className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                      Total: {totalRecords} receives
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary">
                    <tr>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-white w-10">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={
                            receives.length > 0 &&
                            receives
                              .filter(
                                (r) =>
                                  !getSelectedCustomer() ||
                                  r.customer === getSelectedCustomer()
                              )
                              .every((r) => isRowSelected(r.id))
                          }
                          className="w-4 h-4 accent-primary cursor-pointer"
                          title="Select all for same customer"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary">
                    {loading && receives.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : receives.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-16 text-center">
                          No receives found
                        </td>
                      </tr>
                    ) : (
                      receives.map((receive, index) => {
                        const disabled = !canSelectRow(receive);
                        const selected = isRowSelected(receive.id);
                        const amt = toNum(receive.amount);
                        const isNegative = amt < 0;
                        return (
                          <tr
                            key={receive.id}
                            className={`group hover:bg-gray-50 ${
                              selected ? 'bg-primary/10' : ''
                            }`}
                          >
                            <td className="px-3 py-4">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={disabled}
                                onChange={() =>
                                  toggleReceiptSelection(receive.id)
                                }
                                className={`w-4 h-4 accent-primary cursor-pointer ${
                                  disabled
                                    ? 'opacity-30 cursor-not-allowed'
                                    : ''
                                }`}
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {String(
                                index + 1 + (page - 1) * limit
                              ).padStart(2, '0')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">
                                {receive.receiveCustomer?.fullname ||
                                  getCustomerName(receive.customer)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-xl font-semibold ${
                                  isNegative
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {isNegative ? '−' : '+'}
                                {Math.abs(amt).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDate(receive.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {receive.description || (
                                <span className="italic">No description</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(receive)}
                                  className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all"
                                  title="Edit receive"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    ></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(receive.id)}
                                  className="p-2 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                  title="Delete receive"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    ></path>
                                  </svg>
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
              {totalPages > 1 && (
                <div className="border-t border-primary px-6 py-4 bg-primary/50">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>

            {/* Receipt Bill Modal */}
            {showBillModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                  <div className="bg-primary px-6 py-5 text-white">
                    <h2 className="text-xl font-semibold">
                      Create Receipt Bill
                    </h2>
                    <p className="text-sm opacity-90 mt-1">
                      Combine {selectedReceipts.length} selected receipt(s)
                      into a single bill
                    </p>
                  </div>

                  <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Customer:</span>
                        <span className="font-semibold">
                          {getCustomerName(getSelectedCustomer())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <span
                          className={`font-bold ${
                            getSelectedTotal() < 0
                              ? 'text-red-700'
                              : 'text-green-700'
                          }`}
                        >
                          {getSelectedTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">
                              Description
                            </th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receives
                            .filter((r) =>
                              selectedReceipts.includes(r.id)
                            )
                            .map((r, idx) => (
                              <tr key={r.id} className="border-t">
                                <td className="px-3 py-2">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  {formatDate(r.createdAt)}
                                </td>
                                <td className="px-3 py-2">
                                  {r.description || '-'}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-semibold ${
                                    toNum(r.amount) < 0
                                      ? 'text-red-700'
                                      : ''
                                  }`}
                                >
                                  {toNum(r.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bill Description (optional)
                      </label>
                      <textarea
                        value={billDescription}
                        onChange={(e) =>
                          setBillDescription(e.target.value)
                        }
                        rows="3"
                        placeholder="Notes about this combined receipt bill..."
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                      onClick={() => setShowBillModal(false)}
                      className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl transition-all shadow hover:bg-primary/90 flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        ></path>
                      </svg>
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <CustomerReport />
        )}
      </div>
    </div>
  );
};

export default Receive;