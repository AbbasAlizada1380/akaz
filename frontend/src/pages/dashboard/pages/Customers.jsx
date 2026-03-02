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
    return moment(date).format("jYYYY/jMM/jDD");
  };

  return (
    <div className="p-4 md:p-6">
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