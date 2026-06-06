import React, { useState, useEffect } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination.jsx";
import BillExport from "./report/BillExport.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const BillsList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [selectedBillData, setSelectedBillData] = useState(null); // store full response { bill, sells }
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch bills with pagination
  const fetchBills = async (page = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/Bill/bills?limit=${pagination.itemsPerPage}&page=${page}`);
      if (res.data.success) {
        setBills(res.data.bills);
        setPagination({
          currentPage: res.data.pagination.currentPage,
          totalPages: res.data.pagination.totalPages,
          totalItems: res.data.pagination.totalItems,
          itemsPerPage: res.data.pagination.itemsPerPage,
        });
      } else {
        throw new Error(res.data.message || "Failed to fetch bills");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(1);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBills(newPage);
    }
  };

  const handleViewBill = async (billId) => {
    setDetailLoading(true);
    setSelectedBillData(null);
    try {
      const res = await axios.get(`${BASE_URL}/Bill/bills/${billId}`);
      if (res.data.success) {
        setSelectedBillData(res.data); // store { bill, sells }
      } else {
        alert("Failed to load bill details");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => setSelectedBillData(null);

  if (loading && bills.length === 0) {
    return <div className="p-6 text-center">Loading invoices...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">All Invoices</h1>

      {bills.length === 0 ? (
        <p className="text-gray-500 text-center">No invoices found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Bill #</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Remaining</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{bill.billNumber}</td>
                    <td className="px-4 py-2">{bill.customer?.fullname || "-"}</td>
                    <td className="px-4 py-2">{new Date(bill.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">
                      ${parseFloat(bill.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ${parseFloat(bill.paidAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      ${parseFloat(bill.remainingAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          bill.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : bill.status === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center space-x-2">
                      <button
                        onClick={() => handleViewBill(bill.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Items
                      </button>
{/* <BillExport billId={selectedBillData.bill.id} billData={selectedBillData} /> */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Bill Detail Modal using the correct "sells" array */}
      {selectedBillData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Bill {selectedBillData.bill.billNumber}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <p><strong>Customer:</strong> {selectedBillData.bill.customer?.fullname || "-"}</p>
              <p><strong>Date:</strong> {new Date(selectedBillData.bill.date).toLocaleDateString()}</p>
              <p><strong>Total:</strong> ${parseFloat(selectedBillData.bill.totalAmount).toFixed(2)}</p>
              <p><strong>Paid:</strong> ${parseFloat(selectedBillData.bill.paidAmount).toFixed(2)}</p>
              <p><strong>Remaining:</strong> ${parseFloat(selectedBillData.bill.remainingAmount).toFixed(2)}</p>
              <p><strong>Status:</strong>{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedBillData.bill.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : selectedBillData.bill.status === "partial"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedBillData.bill.status}
                </span>
              </p>
              {selectedBillData.bill.notes && <p><strong>Notes:</strong> {selectedBillData.bill.notes}</p>}
            </div>
            <h3 className="font-semibold mb-2">Line Items</h3>
            {detailLoading ? (
              <p>Loading items...</p>
            ) : (
              <>
                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1 text-left">Product</th>
                      <th className="px-3 py-1 text-right">Quantity</th>
                      <th className="px-3 py-1 text-right">Unit Price</th>
                      <th className="px-3 py-1 text-right">Discount %</th>
                      <th className="px-3 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedBillData.sells || []).map((sell) => (
                      <tr key={sell.id} className="border-t">
                        <td className="px-3 py-1">{sell.product?.name || "-"}</td>
                        <td className="px-3 py-1 text-right">{sell.amount}</td>
                        <td className="px-3 py-1 text-right">${parseFloat(sell.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-1 text-right">{sell.discount_percent}%</td>
                        <td className="px-3 py-1 text-right">${parseFloat(sell.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 flex justify-end border-t pt-4">
<BillExport billId={selectedBillData.bill.id} billData={selectedBillData} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillsList;