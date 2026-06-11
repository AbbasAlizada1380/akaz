import React from "react";
import Pagination from "../../pagination/Pagination"; // adjust path to your Pagination component
import ExpenseDateDownload from "../report/ExpenseDateDownload";

const ExpenseTable = ({
  expenses = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  totalAmount = 0,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AFN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Table Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Expense List</h2>
          <div className="flex gap-4">
            <span className="bg-white/20 px-4 py-2 rounded-lg text-sm">
              Total Records: {totalRecords}
            </span>
            <span className="bg-white/20 px-4 py-2 rounded-lg text-sm">
              Total Amount: {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <ExpenseDateDownload />
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">#</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Purpose</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Paid By</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount (AFN)</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Description</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Department</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                  </div>
                  <p className="mt-2 text-gray-500">Loading expenses...</p>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense, idx) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(currentPage - 1) * 10 + idx + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {expense.purpose}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {expense.by}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(parseFloat(expense.amount))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={expense.description || "-"}>
                    {expense.description || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {expense.expenseDepartment?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(expense.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(expense)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
      
      {/* Summary Footer */}
      {!loading && expenses.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} entries
            </div>
            <div className="text-sm font-semibold text-gray-700">
              Total Amount: {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;