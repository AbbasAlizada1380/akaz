// components/AddStaffToListModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaTimes, FaSpinner, FaUserPlus, FaSearch } from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/**
 * Props:
 *   - listId: number
 *   - existingStaffIds: number[]      // staff already in the list
 *   - onAdded: (newRows) => void      // callback with the fresh attendance rows
 *   - onClose: () => void
 */
export default function AddStaffToListModal({
  listId,
  existingStaffIds = [],
  onAdded,
  onClose,
}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  /* Load all active staff */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Pull a large page so the picker isn't truncated
        const res = await axios.get(`${BASE_URL}/staff`, {
          params: { page: 1, limit: 1000 },
        });
        const list = res.data?.staffs || res.data?.data || res.data || [];
        if (!cancelled) setStaff(list.filter((s) => s.isActive !== false));
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err.message ||
              "Failed to load staff"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const existingSet = useMemo(
    () => new Set(existingStaffIds.map(Number)),
    [existingStaffIds]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((s) => !existingSet.has(Number(s.id)))
      .filter((s) => {
        if (!q) return true;
        return (
          String(s.name || "").toLowerCase().includes(q) ||
          String(s.fatherName || "").toLowerCase().includes(q) ||
          String(s.NIC || "").toLowerCase().includes(q)
        );
      });
  }, [staff, existingSet, search]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const created = [];
      for (const staffId of selected) {
        const member = staff.find((s) => Number(s.id) === Number(staffId));
        const res = await axios.post(`${BASE_URL}/attendance`, {
          list: listId,
          staffId,
          // Backend will apply these defaults:
          attendance: {
            Saturday: { attendance: false, overtime: 0 },
            Sunday: { attendance: false, overtime: 0 },
            Monday: { attendance: false, overtime: 0 },
            Tuesday: { attendance: false, overtime: 0 },
            Wednesday: { attendance: false, overtime: 0 },
            Thursday: { attendance: false, overtime: 0 },
          },
          // Pre-fill salary/overtime from the staff's monthly salary
          salary: Number(member?.salary || 0),
          overtime: 0,
          total: Number(member?.salary || 0),
          receipt: [],
        });
        created.push(res.data?.record || res.data);
      }
      onAdded?.(created);
      onClose?.();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to add staff to the list"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FaUserPlus />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add Staff to List</h2>
              <p className="text-sm text-white/80">
                Select staff members to include in this salary list
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, father name, or NIC"
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
              disabled={loading || saving}
            />
          </div>

          {/* List */}
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-gray-200">
            {loading ? (
              <div className="py-12 text-center">
                <FaSpinner className="animate-spin text-primary text-2xl mx-auto" />
                <p className="mt-3 text-gray-600">Loading staff...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {existingSet.size > 0
                  ? "All active staff are already in this list."
                  : "No active staff found."}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={selected.has(Number(s.id))}
                        onChange={() => toggle(Number(s.id))}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        disabled={saving}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.fatherName}
                          {s.NIC ? ` • ${s.NIC}` : ""}
                        </div>
                      </div>
                    </label>
                    <div className="text-sm text-gray-700 whitespace-nowrap">
                      {new Intl.NumberFormat("en-US").format(
                        Number(s.salary || 0)
                      )}{" "}
                      AFN
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              {selected.size} selected
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || selected.size === 0}
                className={`px-5 py-2.5 rounded-xl font-medium shadow-sm transition flex items-center gap-2 ${
                  saving || selected.size === 0
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90"
                }`}
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <FaUserPlus />
                    Add to List
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}