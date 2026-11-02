import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaBoxOpen,
  FaSpinner,
  FaTimes,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import moment from "moment-jalaali";
import Pagination from "../pagination/Pagination";
import OrderDownloadrange from "./report/OrderDownloadrange";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Shamsi formatter — display only */
const formatShamsi = (dateStr) => {
  if (!dateStr) return "—";
  try {
    return moment(dateStr).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const RemainOrderItems = ({ customer, onClose }) => {
  const [remainingMoney, setRemainingMoney] = useState(0);
  const [items, setItems] = useState([]); // sells for current page
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Server‑side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Fetch remaining money
  const fetchRemainData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/customerAccount/debt`);
      const foundCustomer = res.data.data.find(
        (item) => item.customer.id == customer.id
      );
      setRemainingMoney(foundCustomer?.remainingMoney || 0);
    } catch (err) {
      console.error(err);
      setError("Error fetching remaining amount");
    }
  };

  // Fetch sells with pagination
  const fetchSells = async (page = 1) => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `${BASE_URL}/customerAccount/customer/${customer.id}/sells`,
        {
          params: {
            page,
            limit: itemsPerPage,
          },
        }
      );
      setItems(res.data.data || []);
      setCurrentPage(res.data.pagination?.page || 1);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error fetching orders");
    } finally {
      setLoading(false);
    }
  };

  // Reload when customer changes
  useEffect(() => {
    if (customer?.id) {
      fetchSells(1);
      fetchRemainData();
    }
  }, [customer]);

  const handlePageChange = (page) => {
    fetchSells(page);
  };

  if (!customer) return null;

  // Optional: compute totals from current page items (if needed)
  const totalQuantity = items.reduce(
    (sum, item) => sum + (parseInt(item.amount) || 0),
    0
  );
  const totalMoney = items.reduce(
    (sum, item) => sum + (parseFloat(item.total) || 0),
    0
  );

  return (
    <div className="mt-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-lg border border-gray-100">
      {/* Header */}
      <OrderDownloadrange customerId={customer.id} />
      <div className="flex items-center justify-between bg-gradient-to-r from-cyan-800 to-cyan-600 text-white rounded-t-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaBoxOpen className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Order Report</h2>
            <p className="text-sm text-white/80">
              Customer:{" "}
              <span className="font-semibold">{customer.fullname}</span>
            </p>
            <p className="text-sm text-white/80">
              Total Remaining:{" "}
              <span className="font-semibold">
                {remainingMoney.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg">
            <FaFileInvoiceDollar />
            <span className="text-sm">{totalItems} Orders</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Close"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FaSpinner className="text-4xl text-cyan-800 animate-spin mb-4" />
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600 font-semibold">⚠️ {error}</p>
            <button
              onClick={() => fetchSells(currentPage)}
              className="mt-2 text-sm text-red-500 hover:text-red-700"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <FaBoxOpen className="text-4xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">
              No orders found for this customer
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm mb-4">
              <table className="w-full text-center">
                <thead className="bg-cyan-50 text-cyan-800">
                  <tr>
                    <th className="p-3 border-b font-semibold">#</th>
                    <th className="p-3 border-b font-semibold">
                      Product Name
                    </th>
                    <th className="p-3 border-b font-semibold">Quantity</th>
                    <th className="p-3 border-b font-semibold">
                      Unit Price (Afghani)
                    </th>
                    <th className="p-3 border-b font-semibold">
                      Total Amount (Afghani)
                    </th>
                    <th className="p-3 border-b font-semibold">
                      Paid (Afghani)
                    </th>
                    <th className="p-3 border-b font-semibold">
                      Remaining (Afghani)
                    </th>
                    <th className="p-3 border-b font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                    >
                      <td className="p-3 text-gray-600">{item.id}</td>
                      <td className="p-3 font-medium text-gray-800">
                        {item.name || "—"}
                      </td>
                      <td className="p-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                          {item.amount}
                        </span>
                      </td>
                      <td className="p-3 text-green-700 font-semibold">
                        {parseFloat(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-purple-700 font-bold">
                        {parseFloat(item.total || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-purple-700 font-bold">
                        {parseFloat(item.received || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-orange-600 font-semibold">
                        {parseFloat(item.remained || 0).toLocaleString()}
                      </td>
                      {/* ✅ Shamsi date */}
                      <td className="p-3 text-gray-500 text-sm">
                        {formatShamsi(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default RemainOrderItems;