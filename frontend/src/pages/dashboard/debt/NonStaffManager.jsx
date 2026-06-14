import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaSpinner } from "react-icons/fa";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  name: "",
  address: "",
  notes: "",
};

const NonStaffManager = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [nonStaffs, setNonStaffs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false); // form loading
  const [tableLoading, setTableLoading] = useState(true);

  const fetchNonStaffs = async () => {
    setTableLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/nonstaff`);
      setNonStaffs(res.data.data || []);
    } catch (error) {
      console.error("Error fetching non-staff debtors:", error);
      setNonStaffs([]);
      alert("Failed to load non‑staff debtors");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchNonStaffs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/nonstaff/${editingId}`, form);
      } else {
        await axios.post(`${BASE_URL}/nonstaff`, form);
      }
      setForm(initialForm);
      setEditingId(null);
      fetchNonStaffs();
    } catch (error) {
      console.error("Error saving debtor:", error);
      alert(error.response?.data?.error || "Error saving data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (debtor) => {
    setForm({
      name: debtor.name || "",
      address: debtor.address || "",
      notes: debtor.notes || "",
    });
    setEditingId(debtor.id);
    document.getElementById("nonstaff-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this debtor?")) return;
    setTableLoading(true);
    try {
      await axios.delete(`${BASE_URL}/nonstaff/${id}`);
      fetchNonStaffs();
    } catch (error) {
      console.error("Error deleting debtor:", error);
      alert("Error deleting debtor");
      setTableLoading(false);
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-US") : "—";

  // Initial loading screen
  if (tableLoading && nonStaffs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-6">
        <FaSpinner className="text-5xl text-primary-800 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Debtors Data</h2>
        <p className="text-gray-600">Please wait a moment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Debtors (Non‑Staff)</h1>
        <p className="text-gray-600">Manage non‑staff debtors information</p>

        {editingId && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              <span className="font-semibold">Editing mode – Debtor #{editingId}</span>
            </div>
          </div>
        )}
      </div>

      {/* Form Section */}
      <div id="nonstaff-form" className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Form Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Debtor" : "Add New Debtor"}
              </h2>
              <p className="text-sm text-white/80">
                {editingId ? "Edit debtor information" : "Enter debtor details"}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> Full Name
                </label>
                <input
                  required
                  placeholder="Debtor's full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  disabled={loading}
                />
              </div>

              {/* Address Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  placeholder="Street, city, etc."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Notes Field (full width) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                placeholder="Additional information about the debtor..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setEditingId(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:from-primary-900 hover:to-primary-700 transition font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin h-5 w-5" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{editingId ? "Save Changes" : "Add Debtor"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Debtors List</h2>
                <p className="text-sm text-white/80">
                  {nonStaffs.length} debtor{nonStaffs.length !== 1 ? "s" : ""}
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
            <FaSpinner className="text-4xl text-primary-800 animate-spin mb-4" />
            <p className="text-gray-600">Loading debtors list...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-primary-50 text-primary-800">
                <tr>
                  <th className="p-3 border-b font-semibold">ID</th>
                  <th className="p-3 border-b font-semibold">Name</th>
                  <th className="p-3 border-b font-semibold">Address</th>
                  <th className="p-3 border-b font-semibold">Notes</th>
                  <th className="p-3 border-b font-semibold">Created At</th>
                  <th className="p-3 border-b font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nonStaffs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8">
                      <div className="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-500 text-lg">No debtors found</p>
                        <p className="text-gray-400 text-sm mt-1">Add a new debtor to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  nonStaffs.map((debtor) => (
                    <tr
                      key={debtor.id}
                      className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                    >
                      <td className="p-3 text-gray-600">{debtor.id}</td>
                      <td className="p-3 font-medium text-gray-800">{debtor.name}</td>
                      <td className="p-3 text-gray-600">{debtor.address || "—"}</td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">
                        {debtor.notes || "—"}
                      </td>
                      <td className="p-3 text-gray-500 text-sm">
                        {formatDate(debtor.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(debtor)}
                            className="p-2 text-primary-700 hover:bg-primary-50 rounded-lg transition disabled:opacity-50"
                            title="Edit"
                            disabled={loading || tableLoading}
                          >
                            <FaEdit />
                          </button>
                          {currentUser?.role === "admin" && (
                            <button
                              onClick={() => handleDelete(debtor.id)}
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
    </div>
  );
};

export default NonStaffManager;