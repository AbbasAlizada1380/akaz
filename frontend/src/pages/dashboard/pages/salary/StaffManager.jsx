// src/components/staff/StaffManager.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import {
  FaEdit,
  FaTrash,
  FaSpinner,
  FaCheckCircle,
  FaBan,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import AddStaff from "./AddStaff";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Load Persian locale once (for Shamsi dates) */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi date formatter */
const formatShamsi = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const StaffManager = () => {
  const [staffs, setStaffs] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const [tableLoading, setTableLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  /* Modal state */
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  /* ---------------- Fetch ---------------- */
  const fetchStaffs = async () => {
    setTableLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/staff`);
      setStaffs(res.data.staffs || []);
    } catch (error) {
      console.error("Error fetching staffs:", error);
      setStaffs([]);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  /* ---------------- Open form ---------------- */
  const handleAddNew = () => {
    setEditingStaff(null);
    setShowForm(true);
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStaff(null);
    setSuccessMessage(
      editingStaff ? "Changes saved successfully" : "New staff member added"
    );
    fetchStaffs();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  /* ---------------- Delete ---------------- */
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    setTableLoading(true);
    try {
      await axios.delete(`${BASE_URL}/staff/${id}`);
      fetchStaffs();
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff member");
      setTableLoading(false);
    }
  };

  /* ---------------- Toggle active ---------------- */
  const handleToggleActive = async (staff) => {
    try {
      await axios.put(`${BASE_URL}/staff/${staff.id}`, {
        ...staff,
        isActive: !staff.isActive,
      });
      setStaffs((prev) =>
        prev.map((s) =>
          s.id === staff.id ? { ...s, isActive: !s.isActive } : s
        )
      );
    } catch (error) {
      console.error("Error toggling active state:", error);
      alert("Failed to change staff status");
    }
  };

  /* ---------------- Loading state ---------------- */
  if (tableLoading && staffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FaSpinner className="text-5xl text-primary animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Loading staff information
        </h2>
        <p className="text-gray-600">Please wait a moment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slideDown">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Staff Management
            </h2>
            <p className="text-xs text-gray-500">
              Register and manage staff information
            </p>
          </div>
        </div>

        <button
          onClick={handleAddNew}
          className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-sm self-start md:self-auto"
        >
          <FaPlus />
          Add Staff
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Staff List</h2>
                <p className="text-sm text-white/80">
                  {staffs.length} staff
                  {tableLoading && " • Loading..."}
                </p>
              </div>
            </div>
            {tableLoading && (
              <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full">
                <FaSpinner className="animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        {tableLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FaSpinner className="text-4xl text-primary animate-spin mb-4" />
            <p className="text-gray-600">Loading staff list...</p>
            <p className="text-sm text-gray-500 mt-2">
              Please wait a moment
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-primary/5 text-primary">
                <tr>
                  <th className="p-3 border-b font-semibold">#</th>
                  <th className="p-3 border-b font-semibold">Name</th>
                  <th className="p-3 border-b font-semibold">Father Name</th>
                  <th className="p-3 border-b font-semibold">NIC</th>
                  <th className="p-3 border-b font-semibold">
                    Salary (AFN)
                  </th>
                  <th className="p-3 border-b font-semibold">Status</th>
                  <th className="p-3 border-b font-semibold">Created At</th>
                  <th className="p-3 border-b font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {staffs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8">
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16 text-gray-300 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <p className="text-gray-500 text-lg">
                          No staff members registered
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          Click "Add Staff" to get started
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staffs.map((staff) => (
                    <tr
                      key={staff.id}
                      className={`hover:bg-gray-50 border-b last:border-0 transition-colors ${
                        staff.isActive === false ? "opacity-60" : ""
                      }`}
                    >
                      <td className="p-3 text-gray-600">{staff.id}</td>
                      <td className="p-3 font-medium text-gray-800">
                        {staff.name}
                      </td>
                      <td className="p-3 text-gray-600">
                        {staff.fatherName}
                      </td>
                      <td className="p-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                          {staff.NIC}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          {parseFloat(staff.salary || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(staff)}
                          title="Toggle status"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                            staff.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {staff.isActive ? (
                            <>
                              <FaCheckCircle className="text-[10px]" />
                              Active
                            </>
                          ) : (
                            <>
                              <FaBan className="text-[10px]" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>

                      {/* ✅ Shamsi date */}
                      <td className="p-3 text-gray-500 text-sm">
                        {formatShamsi(staff.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(staff)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition disabled:opacity-50"
                            title="Edit"
                            disabled={tableLoading}
                          >
                            <FaEdit />
                          </button>
                          {currentUser?.role === "admin" && (
                            <button
                              onClick={() => handleDelete(staff.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Delete"
                              disabled={tableLoading}
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ Add / Edit Staff modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-3xl">
            <AddStaff
              editingStaff={editingStaff}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setShowForm(false);
                setEditingStaff(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;