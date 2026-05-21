// BenefitsManager.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination.jsx"; // adjust path
import BenefitReportDownload from "../report/BenefitReportDownload;.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const ITEMS_PER_PAGE = 20; // must match the `limit` sent to backend

const BenefitsManager = () => {
  const [benefits, setBenefits] = useState([]);
  const [formData, setFormData] = useState({
    amount: "",
    sellId: "",
    departmentId: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch benefits whenever currentPage changes
  useEffect(() => {
    fetchBenefits(currentPage);
  }, [currentPage]);

  const fetchBenefits = async (page) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/benifit`, {
        params: {
          page: page,
          limit: ITEMS_PER_PAGE,
        },
      });
      // Backend returns { data: [], meta: { totalItems, totalPages, currentPage, itemsPerPage } }
      setBenefits(response.data.data);
      setTotalItems(response.data.meta.totalItems);
      setTotalPages(response.data.meta.totalPages);
      // Ensure currentPage is synced with backend (in case of invalid page)
      setCurrentPage(response.data.meta.currentPage);
      setError("");
    } catch (err) {
      setError("Failed to load benefits");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ amount: "", sellId: "", departmentId: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/benifit/${editingId}`, formData);
      } else {
        await axios.post(`${BASE_URL}/benifit`, formData);
      }
      // After creating/updating, go back to page 1 and refresh
      setCurrentPage(1);
      await fetchBenefits(1);
      resetForm();
    } catch (err) {
      setError(editingId ? "Failed to update benefit" : "Failed to create benefit");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (benefit) => {
    setFormData({
      amount: benefit.amount,
      sellId: benefit.sellId,
      departmentId: benefit.departmentId,
    });
    setEditingId(benefit.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this benefit?")) return;
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/benifit/${id}`);
      // After deletion, refresh current page (items might have shifted)
      await fetchBenefits(currentPage);
      // If current page becomes empty and it's not page 1, go to previous page
      if (benefits.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      setError("Failed to delete benefit");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Benefits Manager</h2>
      {/* Benefits Table */}
      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {!loading && benefits.length === 0 && (
        <p className="text-center text-gray-500">No benefits found.</p>
      )}
      {benefits.length > 0 && (
        <>
          <div className="overflow-x-auto">
             <BenefitReportDownload/>
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-right">ID</th>
                  <th className="px-4 py-2 border-b text-right">Amount</th>
                  <th className="px-4 py-2 border-b text-right">Sell ID</th>
                  <th className="px-4 py-2 border-b text-right">Department</th>
                  <th className="px-4 py-2 border-b text-right">Created At</th>
                </tr>
              </thead>
              <tbody>
                {benefits.map((benefit) => (
                  <tr key={benefit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b text-right">{benefit.id}</td>
                    <td className="px-4 py-2 border-b text-right">
                      ${parseFloat(benefit.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-b text-right">{benefit.sellId}</td>
                    <td className="px-4 py-2 border-b text-right">
                      {benefit.department?.name || "—"}
                    </td>
                    <td className="px-4 py-2 border-b text-right">
                      {new Date(benefit.createdAt).toLocaleString()}
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
  );
};

export default BenefitsManager;