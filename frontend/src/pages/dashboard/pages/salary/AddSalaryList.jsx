// src/components/salary/AddSalaryList.jsx
import React, { useState } from "react";
import axios from "axios";
import moment from "moment-jalaali";

// ── Imports that must tolerate CJS/ESM interop under Vite ──
import DatePickerRaw from "react-multi-date-picker";
import persianRaw from "react-date-object/calendars/persian";
import persian_faRaw from "react-date-object/locales/persian_fa";

import {
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaSave,
} from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/**
 * Vite sometimes hands back `{ default: X }` for CJS packages.
 * If the value is an object *with a default key*, unwrap it.
 * If it already is a function/object, use it as-is.
 */
const unwrap = (mod) => (mod && mod.default ? mod.default : mod);

const DatePicker = unwrap(DatePickerRaw);
const persian = unwrap(persianRaw);
const persian_fa = unwrap(persian_faRaw);

// Sanity check — remove these in production
if (typeof DatePicker !== "function") {
  // eslint-disable-next-line no-console
  console.error(
    "[AddSalaryList] DatePicker is not a component:",
    DatePickerRaw
  );
}

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatter — display only */
const formatShamsiDots = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jYYYY.jMM.jDD");
  } catch {
    return "";
  }
};

const formatShamsiLong = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("jDD jMMMM jYYYY");
  } catch {
    return "";
  }
};

/* ✅ Gregorian formatter — for backend storage */
const formatGregorianDots = (date) => {
  if (!date) return "";
  try {
    return moment(date).format("YYYY.MM.DD");
  } catch {
    return "";
  }
};

export default function AddSalaryList({ onSuccess, onCancel }) {
  const [name, setName] = useState("");
  /* dateRange = [DateObject, DateObject] */
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const resetForm = () => {
    setName("");
    setDateRange([null, null]);
    setError(null);
  };

  /* Convert DateObject → JS Date */
  const toJSDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === "function") return d.toDate();
    if (d instanceof Date) return d;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("List name is required");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select a date range");
      return;
    }

    const startJs = toJSDate(startDate);
    const endJs = toJSDate(endDate);

    /* ✅ Backend receives GREGORIAN — "2026.09.23-2026.10.06" */
    const range = `${formatGregorianDots(startJs)}-${formatGregorianDots(
      endJs
    )}`;

    setSubmitting(true);
    try {
      const payload = { name: name.trim(), range };
      const res = await axios.post(`${BASE_URL}/salary-lists`, payload);

      setSuccessMessage("Salary list created successfully");
      resetForm();
      onSuccess?.(res.data);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to create salary list"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ✅ Preview — Shamsi, for display only */
  const startJs = toJSDate(startDate);
  const endJs = toJSDate(endDate);

  const rangePreviewShamsi =
    startJs && endJs
      ? `${formatShamsiDots(startJs)}-${formatShamsiDots(endJs)}`
      : "No date range selected";

  const rangePreviewLong =
    startJs && endJs
      ? `${formatShamsiLong(startJs)} to ${formatShamsiLong(endJs)}`
      : null;

  /* Small hint showing what will actually be sent */
  const rangePreviewGregorian =
    startJs && endJs
      ? `${formatGregorianDots(startJs)}-${formatGregorianDots(endJs)}`
      : null;

  return (
    <div className="bg-white min-h-[500px] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden print:p-0">
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
              <FaFileInvoiceDollar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add New Salary List</h2>
              <p className="text-sm text-white/80">
                Specify the list name and date range
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> List Name
              </label>
              <input
                required
                placeholder="e.g. First-week salary of Hamal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
              />
            </div>

            {/* ✅ Shamsi Date Range Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Date Range (Shamsi)
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                  <FaCalendarAlt />
                </div>
                <DatePicker
                  range
                  value={dateRange}
                  onChange={setDateRange}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  format="YYYY/MM/DD"
                  editable={false}
                  inputClass="w-full border border-gray-300 rounded-xl pr-10 pl-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition bg-white cursor-pointer outline-none"
                  placeholder="Select a date range"
                  containerClassName="w-full"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {rangePreviewLong || rangePreviewShamsi}
              </p>
            </div>
          </div>

          {/* Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">List Name</p>
              <p className="text-lg font-bold text-gray-900">
                {name.trim() || "—"}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-primary mb-1">
                Range (Shamsi)
              </p>
              <p className="text-lg font-bold text-primary" dir="ltr">
                {rangePreviewShamsi}
              </p>
              {rangePreviewGregorian && (
                <p className="text-[10px] text-gray-500 mt-2">
                  Gregorian (stored):{" "}
                  <span dir="ltr" className="font-mono">
                    {rangePreviewGregorian}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 print:hidden">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
              >
                <FaTimes />
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-3 rounded-xl font-medium shadow-md transition flex items-center gap-2 ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FaSave />
                  Create Salary List
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}