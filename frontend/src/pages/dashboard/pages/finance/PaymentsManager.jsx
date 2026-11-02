import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import PaymentReport from "../report/PaymentReport";
import Pagination from "../../pagination/Pagination";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const PaymentsManager = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [deptLoading, setDeptLoading] = useState(true);

  const limit = 15;

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/department/`);
        setDepartments(response.data.data || []);
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedDeptId !== "all")
        params.departmentId = parseInt(selectedDeptId);

      const response = await axios.get(`${BASE_URL}/payment/`, { params });
      setPayments(response.data.data || []);
      setMeta({
        currentPage: response.data.meta?.currentPage || page,
        totalPages: response.data.meta?.totalPages || 1,
        totalItems: response.data.meta?.totalItems || 0,
      });
    } catch (err) {
      console.error("Error fetching payments:", err);
      alert("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [selectedDeptId, startDate, endDate]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      fetchPayments(newPage);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US").format(Number(amount || 0)) + " AFN";

  /* ✅ Shamsi formatter — display only */
  const formatJalaliDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return moment(dateStr).format("jYYYY/jMM/jDD");
    } catch {
      return "—";
    }
  };

  // Helper to get debtor name (staff or non‑staff)
  const getDebtorName = (payment) => {
    const debt = payment.paymentDebt;
    if (!debt) return "—";
    if (debt.debtStaff?.name) return debt.debtStaff.name;
    if (debt.debtNonStaff?.name) return debt.debtNonStaff.name;
    return "—";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Payments Management</h2>

        <PaymentReport
          departmentId={selectedDeptId !== "all" ? selectedDeptId : null}
          departmentName={
            selectedDeptId !== "all"
              ? departments.find((d) => d.id === parseInt(selectedDeptId))
                  ?.name
              : null
          }
          startDate={startDate}
          endDate={endDate}
        />

        {/* Payments Table */}
        {deptLoading ? (
          <div className="text-center py-8">Loading departments...</div>
        ) : loading ? (
          <div className="text-center py-8">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No payments found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border text-left">ID</th>
                    <th className="px-4 py-2 border text-left">Debtor</th>
                    <th className="px-4 py-2 border text-left">Purpose</th>
                    <th className="px-4 py-2 border text-right">Amount</th>
                    <th className="px-4 py-2 border text-left">
                      Payment Date
                    </th>
                    <th className="px-4 py-2 border text-left">
                      Description
                    </th>
                    <th className="px-4 py-2 border text-left">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 text-center">
                      <td className="px-4 py-2 border">{p.id}</td>
                      <td className="px-4 py-2 border">
                        {getDebtorName(p)}
                      </td>
                      <td className="px-4 py-2 border">
                        {p.paymentDebt?.purpose || "—"}
                      </td>
                      <td className="px-4 py-2 border text-right">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-2 border">
                        {formatJalaliDate(p.paymentDate)}
                      </td>
                      <td className="px-4 py-2 border">
                        {p.description || "—"}
                      </td>
                      <td className="px-4 py-2 border">
                        {p.paymentDepartment?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={meta.currentPage}
              totalPages={meta.totalPages}
              onPageChange={handlePageChange}
            />
            <div className="text-center text-sm text-gray-500 mt-2">
              Total: {meta.totalItems} payments
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentsManager;