// components/SalaryLists.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaEye,
  FaPlus,
  FaCalendarCheck,
  FaTrash,
} from "react-icons/fa";
import SalaryListRow from "./SalaryListRow";
import AddSalaryList from "./AddSalaryList";
import moment from "moment-jalaali";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* Pick the staff object whether the backend alias is `staff` or `attendanceStaff` */
const rowStaff = (row) => row?.staff || row?.attendanceStaff || null;

export default function SalaryLists({ onClose }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [selectedList, setSelectedList] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingId, setSavingId] = useState(null);

  moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

  const [showAddForm, setShowAddForm] = useState(false);

  /* ---------------- Fetch salary lists ---------------- */
  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/salary-lists`);
      setLists(res.data.salaryLists || res.data || []);
      setError(null);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to load salary lists"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  /* ✅ Convert Gregorian range "2026.09.23-2026.10.06" → Shamsi */
  const formatRangeShamsi = (rangeStr) => {
    if (!rangeStr) return "—";

    const trimmed = String(rangeStr).trim();

    /* Already Shamsi? Return as-is */
    const firstYear = Number(trimmed.slice(0, 4));
    if (firstYear >= 1300 && firstYear <= 1500 && trimmed.includes("/")) {
      return trimmed;
    }

    const parts = trimmed.split(/\s*[-–]\s*|\s+to\s+/);
    if (parts.length !== 2) {
      const m = moment(
        parts[0],
        ["YYYY.MM.DD", "YYYY-MM-DD", "YYYY/MM/DD"],
        true
      );
      if (m.isValid()) return m.format("jYYYY/jMM/jDD");
      return trimmed;
    }

    const [fromStr, toStr] = parts;

    const convert = (str) => {
      if (!str) return "";
      const formats = [
        "YYYY.MM.DD",
        "YYYY-MM-DD",
        "YYYY/MM/DD",
        "YYYY.MM.DDTHH:mm:ss",
        "YYYY-MM-DDTHH:mm:ss",
      ];
      const m = moment(str.trim(), formats, true);
      if (!m.isValid()) {
        const dm = moment(new Date(str.trim()));
        if (dm.isValid()) return dm.format("jYYYY/jMM/jDD");
        return str.trim();
      }
      return m.format("jYYYY/jMM/jDD");
    };

    return `${convert(fromStr)} to ${convert(toStr)}`;
  };

  /* ---------------- Fetch attendance for a list ---------------- */
  const openAttendance = async (list) => {
    setSelectedList(list);
    setLoadingAttendance(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE_URL}/attendance`, {
        params: { list: list.id },
      });
      const rows = res.data.attendances || res.data || [];
      setAttendances(rows);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to load attendance"
      );
      setAttendances([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const closeAttendance = () => {
    setSelectedList(null);
    setAttendances([]);
  };

  /* ---------------- Local updates ---------------- */

  /* Weekly attendance — kept for backward compat, no longer rendered */
  const updateLocalAttendance = (id, day, field, value) => {
    setAttendances((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextAttendance = { ...(row.attendance || {}) };
        nextAttendance[day] = {
          ...(nextAttendance[day] || { attendance: false, overtime: 0 }),
          [field]: value,
        };
        return { ...row, attendance: nextAttendance };
      })
    );
  };

  /* ✅ Generic field updater — used by the row for salary / overtime / total */
  const updateLocalField = (id, field, value) => {
    setAttendances((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value === "" ? 0 : value };

        // Auto-recompute total when salary or overtime changes,
        // unless the user has hand-edited the total away from salary+overtime.
        if (field === "salary" || field === "overtime") {
          const prevAutoTotal =
            Number(row.salary || 0) + Number(row.overtime || 0);
          const wasAutoTotal = Number(row.total || 0) === prevAutoTotal;
          if (wasAutoTotal) {
            const newAutoTotal =
              Number(next.salary || 0) + Number(next.overtime || 0);
            next.total = Number(newAutoTotal.toFixed(2));
          }
        }

        return next;
      })
    );
  };

  const updateLocalReceipt = (id, receiptArray) => {
    setAttendances((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, receipt: receiptArray } : row
      )
    );
  };

  /* ---------------- Delete one attendance row ---------------- */
  const deleteAttendance = async (row) => {
    const name = rowStaff(row)?.name || `Staff #${row.staffId}`;
    if (
      !window.confirm(
        `Are you sure you want to delete the attendance record for "${name}"?`
      )
    ) {
      return;
    }

    setSavingId(row.id);
    setError(null);
    try {
      await axios.delete(`${BASE_URL}/attendance/${row.id}`);
      setAttendances((prev) => prev.filter((r) => r.id !== row.id));
      fetchLists();
      setSuccessMessage("Attendance record deleted");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to delete attendance"
      );
    } finally {
      setSavingId(null);
    }
  };

  /* ---------------- Delete whole salary list ---------------- */
  const deleteList = async (list, e) => {
    e?.stopPropagation();

    if (
      !window.confirm(
        `Are you sure you want to delete the list "${list.name}" and all its attendance records?`
      )
    ) {
      return;
    }

    setSavingId(`list-${list.id}`);
    setError(null);
    try {
      await axios.delete(`${BASE_URL}/salary-lists/${list.id}`);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
      setSuccessMessage("Salary list deleted");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to delete salary list"
      );
    } finally {
      setSavingId(null);
    }
  };

  /* ---------------- Save one attendance row ---------------- */
  const saveAttendance = async (row) => {
    setSavingId(row.id);
    setError(null);
    try {
      const res = await axios.put(`${BASE_URL}/attendance/${row.id}`, {
        // ✅ Only send editable money fields + receipt.
        // We deliberately do NOT send `attendance`, so the backend
        // won't overwrite the user's manual salary/overtime/total.
        salary: Number(row.salary || 0),
        overtime: Number(row.overtime || 0),
        total: Number(row.total || 0),
        receipt: row.receipt ?? [],
      });

      const updated = res.data.record || res.data;
      setAttendances((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                salary: updated.salary ?? r.salary,
                overtime: updated.overtime ?? r.overtime,
                total: updated.total ?? r.total,
                receipt: updated.receipt ?? r.receipt,
              }
            : r
        )
      );

      fetchLists();
      setSuccessMessage("Attendance saved");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "Failed to save attendance"
      );
    } finally {
      setSavingId(null);
    }
  };

  /* ---------------- Helpers ---------------- */
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0 AFN";
    return new Intl.NumberFormat("en-US").format(Number(amount)) + " AFN";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return moment(dateString).format("jYYYY/jMM/jDD");
    } catch {
      return "—";
    }
  };

  /* ---------------- Loading state ---------------- */
  if (loading && lists.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading salary lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print:p-0">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaFileInvoiceDollar className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Salary Lists</h2>
            <p className="text-xs text-gray-500">
              Click any list to view and edit attendance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
          >
            <FaPlus />
            Add Salary List
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              title="Close"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Salary lists table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary to-primary/80">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  List Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Range
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Staff Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {lists.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No salary lists have been registered yet
                  </td>
                </tr>
              ) : (
                lists.map((list) => {
                  const staffCount = Array.isArray(list.staffIds)
                    ? list.staffIds.length
                    : 0;
                  const remaining =
                    Number(list.total || 0) - Number(list.paid || 0);
                  return (
                    <tr
                      key={list.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openAttendance(list)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-primary">
                          #{list.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {list.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FaCalendarAlt className="text-gray-400" />
                          {formatRangeShamsi(list.range)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {staffCount} staff
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(list.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(list.paid)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`text-sm font-semibold ${
                            remaining > 0
                              ? "text-red-600"
                              : remaining < 0
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(remaining)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {formatDate(list.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1.5 bg-primary text-white rounded-md hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAttendance(list);
                            }}
                          >
                            <FaEye />
                            View Attendance
                          </button>

                          <button
                            onClick={(e) => deleteList(list, e)}
                            disabled={savingId === `list-${list.id}`}
                            className={`p-2 rounded-md transition ${
                              savingId === `list-${list.id}`
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title="Delete list"
                          >
                            {savingId === `list-${list.id}` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <FaTrash />
                            )}
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

      {/* Add Salary List modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-3xl">
            <AddSalaryList
              onSuccess={() => {
                setShowAddForm(false);
                setSuccessMessage("Salary list created successfully");
                fetchLists();
                setTimeout(() => setSuccessMessage(null), 3000);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Attendance modal */}
      {selectedList && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <FaCalendarCheck />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    Attendance: {selectedList.name}
                  </h2>
                  <p className="text-sm text-white/80" dir="ltr">
                    {formatRangeShamsi(selectedList.range)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAttendance}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 md:p-6 max-h-[75vh] overflow-y-auto bg-gray-50">
              {loadingAttendance ? (
                <div className="py-16 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading attendance...</p>
                </div>
              ) : attendances.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  No attendance records found for this list
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-primary to-primary/80">
                      <tr>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Staff
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Salary
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Overtime
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Total
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Receipt
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Paid
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase">
                          Remaining
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {attendances.map((row) => (
                        <SalaryListRow
                          key={row.id}
                          row={row}
                          saving={savingId === row.id}
                          onChange={updateLocalAttendance}
                          onChangeField={updateLocalField}
                          onReceiptChange={updateLocalReceipt}
                          onSave={saveAttendance}
                          onDelete={deleteAttendance}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}