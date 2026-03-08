import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUsers, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt,
  FaBuilding, FaPhone, FaUser, FaCheck, FaTimes,
  FaSearch, FaFilter, FaEye, FaToggleOn, FaToggleOff,
  FaSpinner, FaDownload, FaFileExcel, FaIdCard, FaCalendarAlt
} from "react-icons/fa";
import { useSelector } from "react-redux";
import moment from "moment-jalaali";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const limit = 20;

const SellerManagement = ({ onStatsUpdate }) => {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [departments, setDepartments] = useState([]);

  // Form state
  const [form, setForm] = useState({
    fullname: "",
    phoneNumber: "",
    address: "",
    department: "",
    isActive: true,
  });

  const { currentUser } = useSelector((state) => state.user);
  const isAdmin = currentUser?.role === "admin";

  /* ======================
     Fetch Sellers
  ====================== */
  const fetchSellers = async (page = 1) => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page,
        limit,
        ...(departmentFilter !== "all" && { department: departmentFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await axios.get(`${BASE_URL}/seller?${params}`);
      console.log(response.data);

      setSellers(response.data.data);
      setFilteredSellers(response.data.data);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.total);

      // Update stats in parent
      if (onStatsUpdate) {
        const activeCount = response.data.data.filter(s => s.isActive).length;
        onStatsUpdate({
          totalSellers: response.data.total,
          activeSellers: activeCount
        });
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
      alert("خطا در دریافت اطلاعات فروشندگان");
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     Fetch Departments
  ====================== */
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/department`);
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchSellers(currentPage);
    fetchDepartments();
  }, [currentPage, statusFilter, departmentFilter]);

  /* ======================
     Filter Sellers (Local Search)
  ====================== */
  useEffect(() => {
    let filtered = [...sellers];

    if (searchTerm) {
      filtered = filtered.filter(seller =>
        seller.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.phoneNumber?.includes(searchTerm) ||
        seller.id?.toString().includes(searchTerm)
      );
    }

    setFilteredSellers(filtered);
  }, [searchTerm, sellers]);

  /* ======================
     Create/Update Seller
  ====================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validation
    if (!form.fullname.trim()) {
      alert("لطفاً نام فروشنده را وارد کنید");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/seller/${editingId}`, form);
        alert("فروشنده با موفقیت ویرایش شد");
      } else {
        await axios.post(`${BASE_URL}/seller`, form);
        alert("فروشنده با موفقیت اضافه شد");
      }

      resetForm();
      fetchSellers(currentPage);
    } catch (error) {
      console.error("Error saving seller:", error);
      alert(error.response?.data?.message || "خطا در ذخیره اطلاعات");
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Edit Seller
  ====================== */
  const handleEdit = (seller) => {
    setEditingId(seller.id);
    setForm({
      fullname: seller.fullname || "",
      phoneNumber: seller.phoneNumber || "",
      address: seller.address || "",
      department: seller.department || "",
      isActive: seller.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  /* ======================
     View Details
  ====================== */
  const handleViewDetails = (seller) => {
    setSelectedSeller(seller);
    setIsDetailsModalOpen(true);
  };

  /* ======================
     Delete Seller
  ====================== */
  const handleDelete = async () => {
    if (!selectedSeller) return;

    try {
      await axios.delete(`${BASE_URL}/seller/${selectedSeller.id}`);
      alert("فروشنده با موفقیت حذف شد");
      setIsDeleteModalOpen(false);
      setSelectedSeller(null);
      fetchSellers(currentPage);
    } catch (error) {
      console.error("Error deleting seller:", error);
      alert(error.response?.data?.message || "خطا در حذف فروشنده");
    }
  };

  /* ======================
     Toggle Status
  ====================== */
  const handleToggleStatus = async (seller) => {
    try {
      await axios.patch(`${BASE_URL}/seller/${seller.id}/toggle-status`);
      fetchSellers(currentPage);
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("خطا در تغییر وضعیت");
    }
  };

  /* ======================
     Reset Form
  ====================== */
  const resetForm = () => {
    setForm({
      fullname: "",
      phoneNumber: "",
      address: "",
      department: "",
      isActive: true,
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  /* ======================
     Get Department Name
  ====================== */
  const getDepartmentName = (deptValue) => {
    if (!deptValue) return "—";
    const department = departments.find(d => d.name === deptValue || d.id?.toString() === deptValue?.toString());
    return department ? department.name : deptValue;
  };

  /* ======================
     Format Date
  ====================== */
  const formatDate = (date) => {
    return moment(date).format("YYYY/MM/DD");
  };

  return (
    <div className="p-4 md:p-6">
      {/* Add / Edit Seller Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg">

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Seller" : "Add New Seller"}
              </h2>

              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-red-500"
              >
                <FaTimes />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>

                <input
                  type="text"
                  value={form.fullname}
                  onChange={(e) =>
                    setForm({ ...form, fullname: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Seller name"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number
                </label>

                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm({ ...form, phoneNumber: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0700000000"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Address
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Department
                </label>

                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Department</option>

                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />

                <span className="text-sm">Active</span>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
                >
                  {submitting && <FaSpinner className="animate-spin" />}
                  {editingId ? "Update Seller" : "Add Seller"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sellers Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaUsers className="text-xl" />
            <h3 className="text-lg font-bold text-gray-800">
              Sellers List
            </h3>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary transition-colors"
            >
              <FaPlus />
              <span>Add New Seller</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8">
                    <div className="flex justify-center items-center gap-2">
                      <FaSpinner className="animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSellers.length > 0 ? (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono">{seller.id}</td>

                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <FaUser className="text-gray-400" />
                        {seller.fullname}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <FaPhone className="text-gray-400" />
                        {seller.phoneNumber || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 max-w-xs">
                        <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {seller.address || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <FaBuilding className="text-gray-400" />
                        {getDepartmentName(seller.department)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(seller)}
                        className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 mx-auto ${seller.isActive
                          ? "bg-primary text-white"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                      >
                        {seller.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        {seller.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(seller)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleEdit(seller)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSeller(seller);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleViewDetails(seller)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-gray-500">
                    No sellers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>{/* Seller Details Modal */}
      {isDetailsModalOpen && selectedSeller && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg">

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FaUser />
                Seller Details
              </h2>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">

              <div className="flex items-center gap-3">
                <FaIdCard className="text-gray-400" />
                <span className="font-medium">ID:</span>
                <span>{selectedSeller.id}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaUser className="text-gray-400" />
                <span className="font-medium">Full Name:</span>
                <span>{selectedSeller.fullname}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaPhone className="text-gray-400" />
                <span className="font-medium">Phone:</span>
                <span>{selectedSeller.phoneNumber || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className="text-gray-400" />
                <span className="font-medium">Address:</span>
                <span>{selectedSeller.address || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaBuilding className="text-gray-400" />
                <span className="font-medium">Department:</span>
                <span>{getDepartmentName(selectedSeller.department)}</span>
              </div>

              <div className="flex items-center gap-3">
                {selectedSeller.isActive ? (
                  <FaCheck className="text-green-500" />
                ) : (
                  <FaTimes className="text-red-500" />
                )}
                <span className="font-medium">Status:</span>
                <span>
                  {selectedSeller.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-gray-400" />
                <span className="font-medium">Created:</span>
                <span>{formatDate(selectedSeller.createdAt)}</span>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SellerManagement;