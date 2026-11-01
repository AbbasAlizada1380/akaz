// components/ReceiptCell.jsx
import React from "react";

/**
 * Displays a receipt as a formatted string.
 *
 * Accepts:
 *   - number          → 5000
 *   - string          → "1000,2000,2000"
 *   - array of nums   → [1000, 2000, 2000]
 *   - array of objs   → [{ amount: 1000, note: "قسط اول" }, ...]
 *   - object map      → { k1: { amount: 1000, note: "قسط اول" } }
 *   - null/undefined  → "0"
 */
export default function ReceiptCell({ receipt, className = "" }) {
  const entries = normalizeReceipt(receipt);

  if (entries.length === 0) {
    return (
      <span
        className={`inline-block font-mono text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-1 ${className}`}
        dir="ltr"
      >
        0
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {entries.map((e, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 font-mono text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 py-0.5"
          dir="ltr"
          title={e.note || ""}
        >
          <span className="font-semibold text-gray-800">{e.amount}</span>
          {e.note && (
            <span className="text-[10px] text-gray-500 max-w-[100px] truncate">
              · {e.note}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   formatReceipt — human-readable string (used in exports)
   ========================================================= */
export function formatReceipt(receipt) {
  const entries = normalizeReceipt(receipt);
  if (entries.length === 0) return "0";
  return entries
    .map((e) => (e.note ? `${e.amount} (${e.note})` : String(e.amount)))
    .join(", ");
}

/* =========================================================
   normalizeReceipt — always returns array of { amount, note }
   ========================================================= */
export function normalizeReceipt(receipt) {
  if (receipt == null) return [];

  /* ---------- Array ---------- */
  if (Array.isArray(receipt)) {
    return receipt
      .map((entry) => {
        // Plain number or numeric string
        if (typeof entry === "number" || typeof entry === "string") {
          const n = Number(entry);
          return Number.isFinite(n) && n > 0 ? { amount: n, note: null } : null;
        }
        // Object entry
        if (entry && typeof entry === "object") {
          const n = Number(entry.amount ?? entry.value ?? entry.paid ?? 0);
          if (!Number.isFinite(n) || n <= 0) return null;
          return {
            amount: n,
            note: entry.note ?? entry.description ?? null,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  /* ---------- Single number ---------- */
  if (typeof receipt === "number") {
    return receipt > 0 ? [{ amount: Number(receipt), note: null }] : [];
  }

  /* ---------- Comma-separated string ---------- */
  if (typeof receipt === "string") {
    return receipt
      .split(",")
      .map((s) => {
        // Support "1000 | قسط اول" format in strings too
        const [amountPart, ...noteParts] = s.split("|");
        const n = Number(amountPart.trim());
        if (!Number.isFinite(n) || n <= 0) return null;
        const note = noteParts.join("|").trim() || null;
        return { amount: n, note };
      })
      .filter(Boolean);
  }

  /* ---------- Object map: { k1: { amount, note }, k2: 500 } ---------- */
  if (typeof receipt === "object") {
    return Object.entries(receipt)
      .map(([key, val]) => {
        if (typeof val === "number") {
          return val > 0 ? { amount: val, note: key || null } : null;
        }
        if (val && typeof val === "object") {
          const n = Number(val.amount ?? val.value ?? 0);
          if (!Number.isFinite(n) || n <= 0) return null;
          return {
            amount: n,
            note: val.note ?? val.description ?? key ?? null,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  return [];
}

/* =========================================================
   sumReceipt — total of all amounts
   ========================================================= */
export function sumReceipt(receipt) {
  return normalizeReceipt(receipt).reduce((sum, e) => sum + e.amount, 0);
}

/* =========================================================
   toAmountsArray — strips notes, returns [1000, 500]
   (for legacy code that only wants the numbers)
   ========================================================= */
export function toAmountsArray(receipt) {
  return normalizeReceipt(receipt).map((e) => e.amount);
}