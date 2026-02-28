import { useSelector } from "react-redux";
import Pagination from "../../pagination/Pagination";
import { FaEdit, FaTrash } from "react-icons/fa";
import ExpenseDateDownload from "../report/ExpenseDateDownload";
const ExpenseTable = ({
  expenses,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}) => {

  const { currentUser } = useSelector((state) => state.user);
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl text-black font-bold">Expense List</h2>
            </div>
          </div>
          <div>
            <ExpenseDateDownload />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border border-gray-300">
          <thead className="bg-primary text-white">
            <tr>
              <th className="border border-gray-300 px-4 py-3 font-semibold">ID</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Purpose</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Paid By</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Amount (AFN)</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Description</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Created Date</th>
              <th className="border border-gray-300 px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="border border-gray-300 py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : expenses.length ? (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">

                  <td className="border border-gray-300 px-4 py-3 text-gray-600">
                    {e.id}
                  </td>

                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-800">
                    <div className="max-w-xs mx-auto truncate">
                      {e.purpose}
                    </div>
                  </td>

                  <td className="border border-gray-300 px-4 py-3">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {e.by}
                    </span>
                  </td>

                  <td className="border border-gray-300 px-4 py-3">
                    <div className="flex flex-col items-center">
                      <span className="text-purple-700 font-bold text-lg">
                        {parseFloat(e.amount || 0).toLocaleString("en-US")}
                      </span>
                      <span className="text-xs text-gray-500">AFN</span>
                    </div>
                  </td>

                  <td className="border border-gray-300 px-4 py-3">
                    <div className="max-w-xs mx-auto">
                      {e.description ? (
                        <div
                          className="text-gray-600 text-sm truncate"
                          title={e.description}
                        >
                          {e.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </td>

                  <td className="border border-gray-300 px-4 py-3 text-gray-600">
                    {e.createdAt
                      ? new Date(e.createdAt).toLocaleDateString("en-US")
                      : "—"}
                  </td>

                  <td className="border border-gray-300 px-4 py-3">
                    {currentUser?.role === "admin" ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(e)}
                          className="h-8 w-8 flex items-center justify-center border border-primary rounded-md hover:scale-105 hover:bg-primary hover:text-white transition-all"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="h-8 w-8 flex items-center justify-center border border-red-500 rounded-md hover:scale-105 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <FaTrash className="text-red-500" />
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="border border-gray-300 py-8">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-lg">No expenses recorded</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Add a new expense to get started
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
