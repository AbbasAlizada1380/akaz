// components/SalaryListRow.jsx
import React from "react";
import { FaClock, FaTrash } from "react-icons/fa";
import ReceiptEditor from "./ReceiptEditor";
import { sumReceipt } from "./ReceiptCell";

/**
 * Kept for backwards compatibility with SalaryLists.jsx which imports
 * { DAYS, DAY_LABELS_FA } from this file. The weekly grid is no longer
 * rendered inside the row.
 */
const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

const DAY_LABELS_FA = {
  Saturday: "شنبه",
  Sunday: "یکشنبه",
  Monday: "دوشنبه",
  Tuesday: "سه‌شنبه",
  Wednesday: "چهارشنبه",
  Thursday: "پنجشنبه",
};

/**
 * Props:
 *   - row
 *   - onChange(rowId, day, field, value)         // still used for days (kept for compat)
 *   - onReceiptChange(rowId, arrayOfNumbers)
 *   - onSave(row)
 *   - saving
 *   - formatCurrency
 *   - onChangeField(rowId, field, value)          // NEW: generic field updater
 *   - onDelete(row)
 */
export default function SalaryListRow({
  row,
  onChange,
  onReceiptChange,
  onChangeField,        // ✅ NEW
  onSave,
  saving,
  onDelete,
  formatCurrency,
}) {
  const paid = sumReceipt(row.receipt);
  const remaining = Number(row.total || 0) - paid;

  /* Helper — prefer onChangeField if provided, otherwise fall back to onChange */
  const setField = (field, value) => {
    if (typeof onChangeField === "function") {
      onChangeField(row.id, field, value);
    }
  };

  const numberInput = (value, onChange, opts = {}) => (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value === "" || value === null || value === undefined ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? "" : Number(raw));
      }}
      disabled={saving}
      className="w-24 text-sm border border-gray-200 rounded px-2 py-1 text-right focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100"
      {...opts}
    />
  );

  return (
    <tr className="hover:bg-gray-50">
      {/* Staff */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {row.staff?.name ||
                row.attendanceStaff?.name ||
                `Staff #${row.staffId}`}
            </div>
            {(row.staff?.NIC || row.attendanceStaff?.NIC) && (
              <div className="text-xs text-gray-500">
                {row.staff?.NIC || row.attendanceStaff?.NIC}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Salary — editable */}
      <td className="px-3 py-3 whitespace-nowrap">
        {numberInput(row.salary, (v) => setField("salary", v), {
          title: "Monthly salary",
        })}
      </td>

      {/* Overtime — editable */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <FaClock className="text-gray-400 text-xs" />
          {numberInput(row.overtime, (v) => setField("overtime", v), {
            title: "Overtime amount",
          })}
        </div>
      </td>

      {/* Total — editable, defaults to salary+overtime if blank */}
      <td className="px-3 py-3 whitespace-nowrap">
        {numberInput(
          row.total,
          (v) => setField("total", v),
          {
            title: "Total (salary + overtime)",
            className:
              "w-24 text-sm font-bold text-primary border border-gray-200 rounded px-2 py-1 text-right focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100",
          }
        )}
      </td>

      {/* Receipt — editable */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <ReceiptEditor
          value={row.receipt}
          onCommit={(arr) => onReceiptChange(row.id, arr)}
          disabled={saving}
        />
      </td>

      {/* Paid (read-only, derived from receipt) */}
      <td className="px-3 py-3 text-sm text-emerald-700 whitespace-nowrap">
        {formatCurrency(paid)}
      </td>

      {/* Remaining (read-only, derived) */}
      <td
        className={`px-3 py-3 text-sm font-bold whitespace-nowrap ${
          remaining > 0
            ? "text-red-500"
            : remaining < 0
            ? "text-yellow-600"
            : "text-green-600"
        }`}
      >
        {formatCurrency(remaining)}
      </td>

      {/* Action */}
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onSave(row)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
              saving
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-primary text-white hover:opacity-90"
            }`}
            title="Save"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>

          <button
            onClick={() => onDelete?.(row)}
            disabled={saving}
            className={`p-2 rounded-lg text-xs transition ${
              saving
                ? "text-gray-400 cursor-not-allowed"
                : "text-red-600 hover:bg-red-50"
            }`}
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

export { DAYS, DAY_LABELS_FA };