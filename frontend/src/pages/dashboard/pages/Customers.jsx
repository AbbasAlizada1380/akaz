import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination";
import {
  FaUsers, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt,
  FaBuilding, FaPhone, FaUser, FaEye, FaToggleOn, FaToggleOff,
  FaSpinner, FaSearch, FaFilter, FaIdCard, FaCalendarAlt,
  FaCheck, FaTimes
} from "react-icons/fa";
import { useSelector } from "react-redux";
import moment from "moment-jalaali";
import StockIncomeManager from "./StockIncomeManager";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const limit = 20;

const Customers = ({ onStatsUpdate }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
     Fetch Customers
  ====================== */
  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page,
        limit,
        ...(statusFilter !== "all" && { isActive: statusFilter === "active" }),
        ...(departmentFilter !== "all" && { department: departmentFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const res = await axios.get(`${BASE_URL}/customer?${params}`);

      setCustomers(res.data.customers);
      setFilteredCustomers(res.data.customers);
      setCurrentPage(res.data.pagination.currentPage);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);

      // Update stats in parent
      if (onStatsUpdate) {
        const activeCount = res.data.customers.filter(c => c.isActive).length;
        onStatsUpdate({
          totalCustomers: res.data.pagination.totalItems,
          activeCustomers: activeCount
        });
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     Fetch Departments
  ====================== */
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
    fetchDepartments();
  }, [currentPage, statusFilter, departmentFilter, searchTerm]);

  /* ======================
     Filter Customers Locally
  ====================== */
  useEffect(() => {
    let filtered = [...customers];

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber?.includes(searchTerm) ||
        customer.id?.toString().includes(searchTerm)
      );
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  /* ======================
     Create/Update Customer
  ====================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validation
    if (!form.fullname.trim()) {
      alert("لطفاً نام مشتری را وارد کنید");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/customer/${editingId}`, form);
        alert("مشتری با موفقیت ویرایش شد");
      } else {
        await axios.post(`${BASE_URL}/customer`, form);
        alert("مشتری با موفقیت اضافه شد");
      }

      resetForm();
      fetchCustomers(currentPage);
    } catch (err) {
      console.error("Error saving customer:", err);
      alert(err.response?.data?.message || "خطا در ذخیره اطلاعات");
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Edit Customer
  ====================== */
  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      fullname: customer.fullname || "",
      phoneNumber: customer.phoneNumber || "",
      address: customer.address || "",
      department: customer.department || "",
      isActive: customer.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  /* ======================
     View Details
  ====================== */
  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  /* ======================
     Delete Customer
  ====================== */
  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      await axios.delete(`${BASE_URL}/customer/${selectedCustomer.id}`);
      alert("مشتری با موفقیت حذف شد");
      setIsDeleteModalOpen(false);
      setSelectedCustomer(null);
      fetchCustomers(currentPage);
    } catch (err) {
      console.error("Error deleting customer:", err);
      alert(err.response?.data?.message || "خطا در حذف مشتری");
    }
  };

  /* ======================
     Toggle Status
  ====================== */
  const handleToggleStatus = async (customer) => {
    try {
      await axios.patch(`${BASE_URL}/customer/${customer.id}/toggle-status`);
      fetchCustomers(currentPage);
    } catch (err) {
      console.error("Error toggling status:", err);
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
      isActive: true
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg">

            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-lg">
                {editingId ? "Edit Customer" : "Add Customer"}
              </h2>

              <button onClick={resetForm}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <input
                type="text"
                placeholder="Full Name"
                value={form.fullname}
                onChange={(e) =>
                  setForm({ ...form, fullname: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
                required
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <input
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <select
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Department</option>

                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                Active
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="border px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  {submitting && <FaSpinner className="animate-spin" />}
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}{isDetailsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg">

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FaUser />
                Customer Details
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
                <span>{selectedCustomer.id}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaUser className="text-gray-400" />
                <span className="font-medium">Full Name:</span>
                <span>{selectedCustomer.fullname}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaPhone className="text-gray-400" />
                <span className="font-medium">Phone:</span>
                <span>{selectedCustomer.phoneNumber || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className="text-gray-400" />
                <span className="font-medium">Address:</span>
                <span>{selectedCustomer.address || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <FaBuilding className="text-gray-400" />
                <span className="font-medium">Department:</span>
                <span>{getDepartmentName(selectedCustomer.department)}</span>
              </div>

              <div className="flex items-center gap-3">
                {selectedCustomer.isActive ? (
                  <FaCheck className="text-green-500" />
                ) : (
                  <FaTimes className="text-red-500" />
                )}
                <span className="font-medium">Status:</span>
                <span>
                  {selectedCustomer.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-gray-400" />
                <span className="font-medium">Created:</span>
                <span>{formatDate(selectedCustomer.createdAt)}</span>
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
      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaUsers className="text-xl" />
            <h3 className="text-lg font-bold text-gray-800">
              Customers List
            </h3>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FaPlus />
              <span>Add New Customer</span>
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
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono">{customer.id}</td>

                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <FaUser className="text-gray-400" />
                        {customer.fullname}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <FaPhone className="text-gray-400" />
                        {customer.phoneNumber || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 max-w-xs">
                        <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {customer.address || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <FaBuilding className="text-gray-400" />
                        {getDepartmentName(customer.department)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(customer)}
                        className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 mx-auto ${customer.isActive
                          ? "bg-primary text-white"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                      >
                        {customer.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        {customer.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <FaEye />
                          </button>

                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
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
                          onClick={() => handleViewDetails(customer)}
                          className="p-2 rounded-lg transition-colors"
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
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div></div>
  );
};

export default Customers;