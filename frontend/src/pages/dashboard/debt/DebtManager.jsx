import React, { useState, useEffect } from "react";
import axios from "axios";
import PaymentForm from "./PaymentForm";
import { LuPlus, LuTrash2, LuCreditCard, LuDollarSign, LuX, LuHistory } from "react-icons/lu";
import PaymentHistoryModal from './PaymentHistoryModal';
import PaymentsManager from "../pages/finance/PaymentsManager"; // adjust path as needed

const BASE_URL = import.meta.env.VITE_BASE_URL;

const DebtManager = () => {
  const [activeTab, setActiveTab] = useState("debts"); // "debts" or "payments"
  const [debts, setDebts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [nonStaffs, setNonStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(null);
  const [form, setForm] = useState({
    receiverType: "staff",
    staffId: "",
    nonStaffId: "",
    purpose: "",
    amount: "",
    departmentId: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [filterDept, setFilterDept] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDept) params.departmentId = filterDept;
      if (filterActive !== "all") params.isActive = filterActive === "true";
      const [debtsRes, deptsRes, staffRes, nonStaffRes] = await Promise.all([
        axios.get(`${BASE_URL}/debts`, { params }),
        axios.get(`${BASE_URL}/department`),
        axios.get(`${BASE_URL}/staff`),
        axios.get(`${BASE_URL}/nonstaff`),
      ]);
      setDebts(debtsRes.data.data || []);
      setDepartments(deptsRes.data.data || []);
      setStaff(staffRes.data.staffs || staffRes.data.data || []);
      setNonStaffs(nonStaffRes.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "debts") {
      fetchData();
    }
  }, [filterDept, filterActive, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.purpose || !form.amount || !form.departmentId) {
      alert("Please fill all required fields (purpose, amount, department)");
      return;
    }
    if (form.receiverType === "staff" && !form.staffId) {
      alert("Please select a staff member");
      return;
    }
    if (form.receiverType === "nonstaff" && !form.nonStaffId) {
      alert("Please select a non‑staff debtor");
      return;
    }
    const payload = {
      purpose: form.purpose,
      amount: parseFloat(form.amount),
      departmentId: parseInt(form.departmentId),
      description: form.description || null,
    };
    if (form.receiverType === "staff") {
      payload.staffId = parseInt(form.staffId);
    } else {
      payload.nonStaffId = parseInt(form.nonStaffId);
    }
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/debts/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/debts`, payload);
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error saving debt");
    }
  };

  const resetForm = () => {
    setForm({
      receiverType: "staff",
      staffId: "",
      nonStaffId: "",
      purpose: "",
      amount: "",
      departmentId: "",
      description: "",
    });
    setEditingId(null);
  };

  const editDebt = (debt) => {
    setEditingId(debt.id);
    setForm({
      receiverType: debt.staffId ? "staff" : "nonstaff",
      staffId: debt.staffId || "",
      nonStaffId: debt.nonStaffId || "",
      purpose: debt.purpose,
      amount: debt.amount,
      departmentId: debt.departmentId,
      description: debt.description || "",
    });
    document.getElementById("debt-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const deleteDebt = async (id) => {
    if (!confirm("Delete this debt?")) return;
    try {
      await axios.delete(`${BASE_URL}/debts/${id}`);
      fetchData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const markAsPaid = async (debt) => {
    if (debt.isActive === false) return;
    if (window.confirm(`Mark debt #${debt.id} as fully paid?`)) {
      try {
        await axios.put(`${BASE_URL}/debts/${debt.id}`, { isActive: false });
        fetchData();
      } catch (err) {
        alert("Failed to update");
      }
    }
  };

  const getPaidAmount = (debt) => parseFloat(debt.amount) - parseFloat(debt.remainingAmount);

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Debt & Payment Management</h1>
        <p className="text-gray-600">Manage debts, track payments, and view payment history</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("debts")}
            className={`py-2 px-4 font-medium text-sm rounded-t-lg transition ${
              activeTab === "debts"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Debts
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-2 px-4 font-medium text-sm rounded-t-lg transition ${
              activeTab === "payments"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Payments
          </button>
        </nav>
      </div>

      {/* Debts Tab Content */}
      {activeTab === "debts" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All (Active & Inactive)</option>
                <option value="true">Active (Unpaid)</option>
                <option value="false">Inactive (Paid)</option>
              </select>
            </div>
            <button
              onClick={() => {
                setFilterDept("");
                setFilterActive("all");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>

          {/* Form Card */}
          <div id="debt-form" className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LuCreditCard size={24} className="text-blue-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? "Edit Debt" : "Create New Debt"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Receiver Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Receiver Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="staff"
                      checked={form.receiverType === "staff"}
                      onChange={() =>
                        setForm({
                          ...form,
                          receiverType: "staff",
                          staffId: "",
                          nonStaffId: "",
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Staff</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="nonstaff"
                      checked={form.receiverType === "nonstaff"}
                      onChange={() =>
                        setForm({
                          ...form,
                          receiverType: "nonstaff",
                          staffId: "",
                          nonStaffId: "",
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Non‑Staff</span>
                  </label>
                </div>
              </div>

              {/* Staff Selection */}
              {form.receiverType === "staff" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
                  <select
                    value={form.staffId}
                    onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select staff</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Non‑Staff Selection */}
              {form.receiverType === "nonstaff" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Debtor *</label>
                  <select
                    value={form.nonStaffId}
                    onChange={(e) => setForm({ ...form, nonStaffId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select debtor</option>
                    {nonStaffs.map((ns) => (
                      <option key={ns.id} value={ns.id}>{ns.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (AFN) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <LuPlus size={18} /> {editingId ? "Update Debt" : "Create Debt"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Debt Table */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2">Loading debts...</p>
            </div>
          )}
          {!loading && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Debtor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Department</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Paid</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Remaining</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                          No debts found.
                        </td>
                      </tr>
                    ) : (
                      debts.map((debt) => {
                        const paidAmount = getPaidAmount(debt);
                        const remaining = parseFloat(debt.remainingAmount);
                        const debtorName = debt.staffId
                          ? debt.debtStaff?.name || "Staff"
                          : debt.debtNonStaff?.name || "Non‑Staff";
                        return (
                          <tr key={debt.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">#{debt.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{debtorName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{debt.purpose}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {debt.debtDepartment?.name || debt.departmentId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {parseFloat(debt.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                              {paidAmount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                              {remaining.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  debt.isActive
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {debt.isActive ? "Unpaid" : "Paid"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setShowPaymentHistoryModal(debt)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View Payments"
                                >
                                  <LuDollarSign size={18} />
                                </button>
                                <button
                                  onClick={() => editDebt(debt)}
                                  className="text-indigo-600 hover:text-indigo-800"
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
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteDebt(debt.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <LuTrash2 size={18} />
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
          )}
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === "payments" && <PaymentsManager />}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && (
        <PaymentHistoryModal
          debt={showPaymentHistoryModal}
          onClose={() => setShowPaymentHistoryModal(null)}
          onPaymentSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default DebtManager;