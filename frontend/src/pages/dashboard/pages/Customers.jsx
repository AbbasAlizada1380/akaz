import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination";
import { FaUsers, FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaBuilding } from "react-icons/fa";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const limit = 20;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    phoneNumber: "",
    address: "",
    department: "",
    isActive: true,
  });

  /* ======================
     Fetch Departments
  ====================== */
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  /* ======================
     Fetch Customers
  ====================== */
  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/customer?page=${page}&limit=${limit}`
      );

      setCustomers(res.data.customers);
      setCurrentPage(res.data.pagination.currentPage);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
    fetchDepartments(); // Fetch departments when component mounts
  }, [currentPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/customer/${editingId}`, form);
      } else {
        await axios.post(`${BASE_URL}/customer`, form);
      }

      resetForm();
      fetchCustomers(currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Edit
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
    setShowDetailsModal(true);
  };

  /* ======================
     Delete
  ====================== */
  const handleDelete = async (id) => {
    if (!window.confirm("آیا مطمئن هستید؟")) return;

    try {
      await axios.delete(`${BASE_URL}/customer/${id}`);
      fetchCustomers(currentPage);
    } catch (err) {
      console.error(err);
    }
  };

  /* ======================
     Reset
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
     Get Department Name by ID/Value
  ====================== */
  const getDepartmentName = (deptValue) => {
    if (!deptValue) return "—";
    const department = departments.find(d => d.name === deptValue || d.id.toString() === deptValue.toString());
    return department ? department.name : deptValue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          مدیریت مشتریان
        </h1>
        <p className="text-gray-600">مدیریت اطلاعات مشتریان</p>

        {editingId && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <FaEdit />
              <span className="font-semibold">
                حالت ویرایش – مشتری #{editingId}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-100">
        {/* Table Header */}
        <div className="flex bg-gray-200 items-center justify-between rounded-t-md p-6">
          <div className="flex items-center gap-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FaUsers className="text-primary text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              لیست مشتریان
            </h2>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary900 transition-colors"
          >
            <FaPlus />
            افزودن مشتری
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border border-gray-300">
            <thead className="bg-primary text-white">
              <tr>
                <th className="border px-4 py-2">#</th>
                <th className="border px-4 py-2">نام کامل</th>
                <th className="border px-4 py-2">شماره تماس</th>
                <th className="border px-4 py-2">آدرس</th>
                <th className="border px-4 py-2">بخش</th>
                <th className="border px-4 py-2">وضعیت</th>
                <th className="border px-4 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-4">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : customers.length ? (
                customers.map((c, index) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(c)}
                  >
                    <td className="border px-4 py-2">
                      {c.id}
                    </td>
                    <td className="border px-4 py-2 font-medium">{c.fullname}</td>
                    <td className="border px-4 py-2">{c.phoneNumber || "—"}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <FaMapMarkerAlt className="text-gray-400 text-xs" />
                        <span className="truncate max-w-[150px]">
                          {c.address || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <FaBuilding className="text-gray-400 text-xs" />
                        <span>{getDepartmentName(c.department)}</span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        c.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {c.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="border px-4 py-2">
                      {currentUser?.role === "admin" ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleEdit(c); 
                            }}
                            className="h-8 w-8 flex items-center justify-center border border-primary rounded-md hover:scale-105 hover:bg-primary transition-all"
                            title="ویرایش"
                          >
                            <FaEdit className="text-primary" />
                          </button>
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDelete(c.id); 
                            }}
                            className="h-8 w-8 flex items-center justify-center border border-red-500 rounded-md hover:scale-105 hover:bg-red-50 transition-all"
                            title="حذف"
                          >
                            <FaTrash className="text-red-500" />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 text-gray-500">
                    هیچ مشتری‌ای وجود ندارد
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-lg w-[500px] max-w-[90%] max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-4">
              {editingId ? "ویرایش مشتری" : "افزودن مشتری جدید"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  نام کامل <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="نام کامل را وارد کنید"
                  value={form.fullname}
                  onChange={(e) =>
                    setForm({ ...form, fullname: e.target.value })
                  }
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  شماره تماس
                </label>
                <input
                  placeholder="شماره تماس را وارد کنید"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm({ ...form, phoneNumber: e.target.value })
                  }
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  آدرس
                </label>
                <textarea
                  placeholder="آدرس را وارد کنید"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  rows="2"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  بخش / دپارتمان
                </label>
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  disabled={loadingDepartments}
                >
                  <option value="">انتخاب بخش...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} {dept.isActive ? "" : "(غیرفعال)"}
                    </option>
                  ))}
                </select>
                {loadingDepartments && (
                  <p className="text-xs text-gray-500 mt-1">در حال بارگذاری بخش‌ها...</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">فعال</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
              >
                لغو
              </button>
              <button
                type="submit"
                disabled={submitting || loadingDepartments}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary900 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed min-w-[100px]"
              >
                {submitting ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[400px] max-w-[90%]">
            <h3 className="text-lg font-bold mb-4">جزئیات مشتری</h3>
            
            <div className="space-y-3">
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">شناسه:</span>
                <span className="font-medium">{selectedCustomer.id}</span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">نام کامل:</span>
                <span className="font-medium">{selectedCustomer.fullname}</span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">شماره تماس:</span>
                <span className="font-medium">{selectedCustomer.phoneNumber || "—"}</span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">آدرس:</span>
                <span className="font-medium">{selectedCustomer.address || "—"}</span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">بخش:</span>
                <span className="font-medium">{getDepartmentName(selectedCustomer.department)}</span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">وضعیت:</span>
                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                  selectedCustomer.isActive 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {selectedCustomer.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>
              
              <div className="border-b pb-2">
                <span className="text-sm text-gray-500 block">تاریخ ایجاد:</span>
                <span className="font-medium">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;