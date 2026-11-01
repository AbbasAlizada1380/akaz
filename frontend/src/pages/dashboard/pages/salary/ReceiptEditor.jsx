// components/ReceiptEditor.jsx
import React, { useEffect, useState } from "react";
import { normalizeReceipt, sumReceipt } from "./ReceiptCell";

/**
 * Props:
 *   - value:    the current receipt (any shape accepted by normalizeReceipt)
 *   - onCommit: (arrayOfObjects) => void   -- called on blur/Enter
 *               Each entry is: { amount: number, note: string | null }
 *   - disabled: boolean
 *   - placeholder?: string
 *
 * Input format:
 *   "5000"                      → [{ amount: 5000, note: null }]
 *   "1000, 2000, 500"           → 3 entries, no notes
 *   "1000 | قسط اول, 500 | قسط دوم"  → 2 entries with notes
 */
export default function ReceiptEditor({
  value,
  onCommit,
  disabled = false,
  placeholder = "5000 یا 1000 | قسط اول, 500",
}) {
  const [text, setText] = useState(toText(value));

  // Sync local text whenever parent value changes (after save, refresh, etc.)
  useEffect(() => {
    setText(toText(value));
  }, [value]);

  const commit = () => {
    const entries = parse(text);
    onCommit?.(entries);
    setText(entriesToText(entries)); // normalize display
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
    if (e.key === "Escape") {
      setText(toText(value));
      e.target.blur();
    }
  };

  const parsed = parse(text);
  const total = sumReceipt(parsed);

  return (
    <div className="flex flex-col items-start gap-1 w-full">
      <input
        type="text"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full font-mono text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:border-primary disabled:bg-gray-100"
        dir="ltr"
      />

      {/* Live preview of parsed entries */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500" dir="ltr">
        <span>
          مجموع: <span className="font-semibold text-gray-700">{total}</span>
        </span>
        {parsed.length > 1 && (
          <span className="text-gray-400">({parsed.length} پرداخت)</span>
        )}
      </div>

      {/* Optional: show chips for each entry when there are notes */}
      {parsed.some((e) => e.note) && (
        <div className="flex flex-wrap gap-1 mt-0.5" dir="ltr">
          {parsed.map((e, i) =>
            e.note ? (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5"
              >
                {e.amount}
                <span className="text-primary/70">· {e.note}</span>
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   value → text
   --------------------------------------------------------- */
function toText(value) {
  const entries = normalizeReceipt(value);
  return entriesToText(entries);
}

function entriesToText(entries) {
  return entries
    .map((e) => (e.note ? `${e.amount} | ${e.note}` : String(e.amount)))
    .join(", ");
}

/* ---------------------------------------------------------
   text → [{ amount, note }]
   --------------------------------------------------------- */
function parse(text) {
  if (!text || !text.trim()) return [];

  return text
    .split(",")
    .map((chunk) => {
      const [amountPart, ...noteParts] = chunk.split("|");
      const amount = Number(amountPart.trim());
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const note = noteParts.join("|").trim() || null;
      return { amount, note };
    })
    .filter(Boolean);
}