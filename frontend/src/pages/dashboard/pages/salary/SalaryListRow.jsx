// components/SalaryListRow.jsx
import React from "react";
import { FaClock, FaTrash, FaUserPlus, FaPercent } from "react-icons/fa";
import ReceiptEditor from "./ReceiptEditor";
import { sumReceipt } from "./ReceiptCell";

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

const toNumber = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function SalaryListRow({
  row,
  onChange,
  onReceiptChange,
  onChangeField,
  onSave,
  saving,
  onDelete,
  onAddStaff,                 // ✅ NEW
  formatCurrency,
}) {
  const paid = sumReceipt(row.receipt);
  const remaining = Number(row.total || 0) - paid;

  const setField = (field, value) => {
    if (typeof onChangeField === "function") {
      onChangeField(row.id, field, value);
    }
  };

  /**
   * When salary / overtime / tax changes, keep total = salary + overtime - tax
   * (unless the user is actively editing the total field).
   */
  const setFieldAndRecalcTotal = (field, value) => {
    setField(field, value);

    if (field === "total") return;

    const salary = field === "salary" ? toNumber(value) : toNumber(row.salary);
    const overtime =
      field === "overtime" ? toNumber(value) : toNumber(row.overtime);
    const tax = field === "tax" ? toNumber(value) : toNumber(row.tax);

    const total = Number((salary + overtime - tax).toFixed(2));
    setField("total", total);
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
        {numberInput(row.salary, (v) => setFieldAndRecalcTotal("salary", v), {
          title: "Monthly salary",
        })}
      </td>

      {/* Overtime — editable */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <FaClock className="text-gray-400 text-xs" />
          {numberInput(row.overtime, (v) => setFieldAndRecalcTotal("overtime", v), {
            title: "Overtime amount",
          })}
        </div>
      </td>

      {/* Tax — editable */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <FaPercent className="text-gray-400 text-xs" />
          {numberInput(row.tax, (v) => setFieldAndRecalcTotal("tax", v), {
            title: "Tax (deducted from salary + overtime)",
          })}
        </div>
      </td>

      {/* Total — editable */}
      <td className="px-3 py-3 whitespace-nowrap">
        {numberInput(row.total, (v) => setFieldAndRecalcTotal("total", v), {
          title: "Total (salary + overtime - tax)",
          className:
            "w-24 text-sm font-bold text-primary border border-gray-200 rounded px-2 py-1 text-right focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100",
        })}
      </td>

      {/* Receipt — editable */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <ReceiptEditor
          value={row.receipt}
          onCommit={(arr) => onReceiptChange(row.id, arr)}
          disabled={saving}
        />
      </td>

      {/* Paid */}
      <td className="px-3 py-3 text-sm text-emerald-700 whitespace-nowrap">
        {formatCurrency(paid)}
      </td>

      {/* Remaining */}
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

      {/* Actions */}
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

          {onAddStaff && (
            <button
              onClick={onAddStaff}
              disabled={saving}
              className="p-2 rounded-lg text-xs text-primary hover:bg-primary/10 transition disabled:opacity-50"
              title="Add staff to this list"
            >
              <FaUserPlus />
            </button>
          )}

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