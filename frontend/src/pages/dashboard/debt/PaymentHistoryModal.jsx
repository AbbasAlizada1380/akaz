import React, { useState, useEffect } from "react";
import axios from "axios";
import PaymentForm from "./PaymentForm";
import { LuX, LuHistory, LuDollarSign } from "react-icons/lu";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const PaymentHistoryModal = ({ debt, onClose, onPaymentSuccess }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const paymentsRes = await axios.get(`${BASE_URL}/payment/debt/${debt.id}`);
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

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Payment History</h3>
            <p className="text-sm text-gray-600">
              Debt #{debt.id} – {debt.purpose} (Total: {parseFloat(debt.amount).toFixed(2)} AFN)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <LuX size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
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
          <div>
            <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
              <LuHistory /> Previous Payments
            </h4>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No payments recorded yet.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount (AFN)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{formatDate(p.paymentDate)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                            {parseFloat(p.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{p.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right text-sm text-gray-500">
                  Total: {payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)} AFN
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