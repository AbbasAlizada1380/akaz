import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUserPlus,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaBan,
  FaSave,
} from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  name: "",
  fatherName: "",
  NIC: "",
  salary: "",
  overTimePerHour: "",
  workingDaysPerWeek: "",
  departmentId: "",
  isActive: true,
};

/**
 * Props:
 *   - editingStaff: staff object to edit, or null/undefined for "add new"
 *   - onSuccess:    (savedStaff) => void
 *   - onCancel:     () => void
 *   - defaultDepartmentId: (optional) preselect a department when adding
 */
export default function AddStaff({
  editingStaff = null,
  onSuccess,
  onCancel,
  defaultDepartmentId = "",
}) {
  const [form, setForm] = useState({
    ...initialForm,
    departmentId: defaultDepartmentId || "",
  });
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const editingId = editingStaff?.id ?? null;

  /* ---------- Load departments (handles { data: [...] } paginated response) ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDepartmentsLoading(true);
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;

        // Loop through all pages (usually just 1)
        while (page <= totalPages) {
          const res = await axios.get(`${BASE_URL}/department`, {
            params: { page, limit: 100 },
          });

          const body = res.data || {};

          // ✅ Your API puts the array under `data`
          const pageItems = Array.isArray(body.data)
            ? body.data
            : Array.isArray(body)
              ? body
              : body.departments || [];

          all.push(...pageItems);
          totalPages = body.totalPages || 1;
          page += 1;
        }

        // Only keep active departments, and normalize the shape
        const normalized = all
          .filter((d) => d && d.id != null)
          .filter((d) => d.isActive !== false)
          .map((d) => ({ id: d.id, name: d.name }));

        if (!cancelled) setDepartments(normalized);
      } catch (err) {
        console.error("Error fetching departments:", err);
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Load initial values when editing ---------- */
  useEffect(() => {
    if (editingStaff) {
      setForm({
        ...initialForm,
        ...editingStaff,
        // Prefer the FK, fall back to the joined association
        departmentId:
          editingStaff.departmentId ??
          editingStaff.staffDepartment?.id ??
          "",
        isActive: editingStaff.isActive ?? true,
      });
    } else {
      setForm({ ...initialForm, departmentId: defaultDepartmentId || "" });
    }
  }, [editingStaff, defaultDepartmentId]);

  const resetForm = () => {
    setForm({ ...initialForm, departmentId: defaultDepartmentId || "" });
    setError(null);
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side guard (backend validates too)
    if (!form.departmentId) {
      setError("Please select a department.");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      fatherName: form.fatherName.trim(),
      NIC: form.NIC.trim(),
      salary: Number(form.salary),
      overTimePerHour: Number(form.overTimePerHour),
      workingDaysPerWeek: Number(form.workingDaysPerWeek),
      departmentId: Number(form.departmentId),
      isActive: Boolean(form.isActive),
    };

    try {
      let res;
      if (editingId) {
        res = await axios.put(`${BASE_URL}/staff/${editingId}`, payload);
      } else {
        res = await axios.post(`${BASE_URL}/staff`, payload);
      }

      setSuccessMessage(
        editingId
          ? "Changes saved successfully"
          : "Staff member registered successfully"
      );
      resetForm();
      onSuccess?.(res.data?.staff || res.data);

      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to save data. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden print:p-0">
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
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FaUserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Staff" : "Add New Staff"}
              </h2>
              <p className="text-sm text-white/80">
                {editingId
                  ? `Editing staff #${editingId}`
                  : "Register a new staff member"}
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors print:hidden"
              title="Close"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Name / Father Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Name
              </label>
              <input
                required
                placeholder="Staff member's name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Father Name
              </label>
              <input
                required
                placeholder="Staff member's father name"
                value={form.fatherName}
                onChange={(e) =>
                  setForm({ ...form, fatherName: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Row 2: NIC / Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> NIC Number
              </label>
              <input
                required
                placeholder="XXXXX-XXXXXXX-X"
                value={form.NIC}
                onChange={(e) => setForm({ ...form, NIC: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                disabled={submitting}
              />
            </div>

            {/* ✅ Department dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Department
              </label>
              <select
                required
                value={form.departmentId || ""}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition disabled:bg-gray-100"
                disabled={submitting || departmentsLoading}
              >
                <option value="">
                  {departmentsLoading
                    ? "Loading departments..."
                    : "Select a department"}
                </option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
              {!departmentsLoading && departments.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  No departments found. Please create one first.
                </p>
              )}
            </div>
          </div>


          {/* Row 4: Salary / Overtime */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Monthly Salary (AFN)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ؋
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) =>
                    setForm({ ...form, salary: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Overtime Per Hour (AFN)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ؋
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.overTimePerHour}
                  onChange={(e) =>
                    setForm({ ...form, overTimePerHour: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* isActive Toggle */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${form.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                    }`}
                >
                  {form.isActive ? <FaCheckCircle /> : <FaBan />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Staff Status
                  </div>
                  <div className="text-xs text-gray-500">
                    {form.isActive
                      ? "Active — included in the new salary list"
                      : "Inactive — excluded from the new salary list"}
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 print:hidden">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
                disabled={submitting}
              >
                <FaTimes />
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || departmentsLoading}
              className={`px-6 py-3 rounded-xl font-medium shadow-md transition flex items-center gap-2 ${submitting || departmentsLoading
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
                }`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  {editingId ? "Save Changes" : "Register Staff"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}