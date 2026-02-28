import { useEffect, useState } from "react";
import axios from "axios";
import ExpenseTable from "./ExpenseTable";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const limit = 10;

const ExpenseManager = () => {
  const [expenses, setExpenses] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    purpose: "",
    by: "",
    amount: "",
    description: "",
  });

  /* ======================
     Fetch Expenses
  ====================== */
  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/expense?page=${page}&limit=${limit}`
      );
      setExpenses(res.data.expenses);
      setCurrentPage(res.data.pagination.currentPage);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/expense/${editingId}`, form);
      } else {
        await axios.post(`${BASE_URL}/expense`, form);
      }

      resetForm();
      fetchExpenses(currentPage);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error saving expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      purpose: expense.purpose,
      by: expense.by,
      amount: expense.amount,
      description: expense.description,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?"))
      return;

    try {
      await axios.delete(`${BASE_URL}/expense/${id}`);
      fetchExpenses(currentPage);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error deleting expense");
    }
  };

  const resetForm = () => {
    setForm({ purpose: "", by: "", amount: "", description: "" });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Expense Management
        </h1>
        <p className="text-gray-600">
          Record and manage organizational expenses
        </p>

        {editingId && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <span className="font-semibold">
                Edit Mode – Expense #{editingId}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Form Header */}
        <div className="bg-gray-200 text-black p-4">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Expense" : "Add New Expense"}
          </h2>
          <p className="text-sm">
            {editingId
              ? "Update expense information"
              : "Enter new expense details"}
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Expense Purpose
                </label>
                <input
                  required
                  placeholder="Example: Office equipment purchase"
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Paid By
                </label>
                <input
                  required
                  placeholder="Example: Finance Department"
                  value={form.by}
                  onChange={(e) =>
                    setForm({ ...form, by: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Amount (AFN)
              </label>
              <input
                required
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: parseInt(e.target.value || 0, 10),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Additional details about the expense (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg"
              >
                {submitting
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Expense Table */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ExpenseManager;