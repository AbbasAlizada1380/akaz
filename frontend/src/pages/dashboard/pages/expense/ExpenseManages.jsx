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
  const [totalRecords, setTotalRecords] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    purpose: "",
    by: "",
    amount: "",
    description: "",
  });

  /* ======================
     Fetch Expenses (with pagination)
  ====================== */
  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/expense?page=${page}&limit=${limit}`
      );
      // Expected response: { data: [], totalRecords, totalPages, currentPage, limit }
      setExpenses(res.data.data || []);
      setTotalRecords(res.data.totalRecords || 0);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(res.data.currentPage || page);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch expenses");
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

    const payload = {
      ...form,
      amount: parseFloat(form.amount),
    };

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/expense/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/expense`, payload);
      }

      resetForm();
      // Refresh current page after operation
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
      // If current page becomes empty and not first page, go to previous page
      if (expenses.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchExpenses(currentPage);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error deleting expense");
    }
  };

  const resetForm = () => {
    setForm({ purpose: "", by: "", amount: "", description: "" });
    setEditingId(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
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
        <div className="bg-primary text-white p-4">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Expense" : "Add New Expense"}
          </h2>
          <p className="text-sm">
            {editingId
              ? "Update expense information"
              : "Enter new expense details"}
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Amount (AFN)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

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

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

      {/* Expense Table with Pagination */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ExpenseManager;