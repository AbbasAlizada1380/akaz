import React from "react";
import Pagination from "../../pagination/Pagination"; // adjust path to your Pagination component
import ExpenseDateDownload from "../report/ExpenseDateDownload";

const ExpenseTable = ({
  expenses = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("eng-en");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Table Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Expense List</h2>
          <span className="bg-white/20 px-4 py-2 rounded-lg text-sm">
            Total: {totalRecords} records
          </span>
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
                <td colSpan="7" className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
                    {parseFloat(expense.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={expense.description}>
                    {expense.description || "-"}
                  </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={expense.description}>
                    {expense.department.name || "-"}
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

      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};

export default ExpenseTable;