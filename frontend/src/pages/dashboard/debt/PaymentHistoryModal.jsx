// components/PaymentHistoryModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import PaymentForm from "./PaymentForm";
import { LuX, LuHistory, LuDollarSign } from "react-icons/lu";
import moment from "moment-jalaali";

const BASE_URL = import.meta.env.VITE_BASE_URL;

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const fmt = (n) => Number(n || 0).toFixed(2);

const PaymentHistoryModal = ({ debt, onClose, onPaymentSuccess }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const paymentsRes = await axios.get(
        `${BASE_URL}/payment/debt/${debt.id}`
      );
      setPayments(paymentsRes.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [debt.id]);

  const handlePaymentSuccess = () => {
    fetchPayments();
    if (onPaymentSuccess) onPaymentSuccess();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return moment(dateStr).format("jYYYY/jMM/jDD");
    } catch {
      return "—";
    }
  };

  /* ---------------- Derived numbers ---------------- */
  const debtTotal = Number(debt.amount || 0);

  /* Remaining comes from the debt as stored on the server.
     Fall back to whatever the API echoes on payment.paymentDebt. */
  const remainingFromDebt =
    debt.remainingAmount !== undefined && debt.remainingAmount !== null
      ? Number(debt.remainingAmount)
      : payments[0]?.paymentDebt?.remainingAmount !== undefined
      ? Number(payments[0].paymentDebt.remainingAmount)
      : null;

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  /* Oldest-first copy for the running total, oldest = earliest payment */
  const paymentsOldestFirst = [...payments].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Payment History</h3>
            <p className="text-sm text-gray-600">
              Debt #{debt.id} – {debt.purpose} (Total: {fmt(debtTotal)} AFN)
            </p>
            {remainingFromDebt !== null && (
              <p className="text-xs text-gray-500 mt-1">
                Paid: <span className="text-emerald-700 font-semibold">{fmt(totalPaid)} AFN</span>
                {" • "}
                Remaining: <span className="text-red-600 font-semibold">{fmt(remainingFromDebt)} AFN</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <LuX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* New payment */}
          <div className="border-b pb-4">
            <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
              <LuDollarSign /> Record New Payment
            </h4>
            <PaymentForm
              debtId={debt.id}
              onClose={() => {}}
              onSuccess={handlePaymentSuccess}
              isModal={true}
            />
          </div>

          {/* Previous payments */}
          <div>
            <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
              <LuHistory /> Previous Payments
            </h4>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payments recorded yet.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2  text-xs font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Amount (AFN)
                        </th>
                        {/* ✅ New: running total */}
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Paid So Far
                        </th>
                        {/* ✅ New: remaining after each payment */}
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Remaining After
                        </th>
                        <th className="px-4 py-2  text-xs font-medium text-gray-500">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentsOldestFirst.map((p, idx) => {
                        const runningPaid = paymentsOldestFirst
                          .slice(0, idx + 1)
                          .reduce((s, x) => s + Number(x.amount || 0), 0);
                        const remainingAfter = debtTotal - runningPaid;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">
                              {formatDate(p.createdAt)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                              {fmt(p.amount)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-emerald-700">
                              {fmt(runningPaid)}
                            </td>
                            <td
                              className={`px-4 py-2 text-sm text-right font-semibold ${
                                remainingAfter > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {fmt(remainingAfter)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {p.description || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer totals */}
                <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
                  <div className="text-gray-500">
                    Total paid:{" "}
                    <span className="font-semibold text-emerald-700">
                      {fmt(totalPaid)} AFN
                    </span>
                  </div>
                  {remainingFromDebt !== null && (
                    <div className="text-gray-500">
                      Remaining:{" "}
                      <span className="font-semibold text-red-600">
                        {fmt(remainingFromDebt)} AFN
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;