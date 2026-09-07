import { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaCheck, FaSpinner, FaPlus, FaEye, FaSync, FaTimes } from "react-icons/fa";
import { useSelector } from "react-redux";
import SalaryDateDownload from "./report/salaryDateDownload";
import Pagination from "../pagination/Pagination";

const BASE_URL = import.meta.env.VITE_BASE_URL;


// --- Solar Hijri helpers ---
function getSolarHijriYear() {
  const now = new Date();
  const year = now.getFullYear();
  const equinox = new Date(year, 2, 20);
  const isAfterEquinox = now >= equinox;
  return year - (isAfterEquinox ? 621 : 622);
}

function getSolarHijriMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 2, 20);
  let diff = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  if (diff < 0) {
    const prevStart = new Date(year - 1, 2, 20);
    diff = Math.floor((now - prevStart) / (24 * 60 * 60 * 1000));
  }
  const daysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
  let month = 0;
  let day = diff;
  for (let i = 0; i < daysInMonth.length; i++) {
    if (day < daysInMonth[i]) {
      month = i + 1;
      break;
    }
    day -= daysInMonth[i];
  }
  if (month === 0) month = 12;
  return month;
}

const monthNames = [
  "Hamal", "Sawr", "Jawza", "Saratan", "Asad", "Sunbula",
  "Mizan", "Aqrab", "Qaws", "Jadi", "Dalw", "Hut"
];

const initialForm = {
  month: getSolarHijriMonth(),
  year: getSolarHijriYear(),
  salaries: [],
};


const MonthlySalaryManagement = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [staffs, setStaffs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState({
    staffs: true,
    records: true,
    initial: true,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  const fetchStaff = async () => {
    setLoading((prev) => ({ ...prev, staffs: true }));
    try {
      const res = await axios.get(`${BASE_URL}/staff`, {
        params: { active: true }
      });
      setStaffs(res.data.staffs || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setStaffs([]);
    } finally {
      setLoading((prev) => ({ ...prev, staffs: false }));
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(res.data.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };

  const fetchRecords = async (pageNum = page) => {
    setLoading((prev) => ({ ...prev, records: true }));
    try {
      const res = await axios.get(`${BASE_URL}/attendance`, {
        params: { page: pageNum, limit },
      });
      setRecords(res.data.data || []);
      setTotalRecords(res.data.pagination?.totalRecords || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching payroll summaries:", error);
      setRecords([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading((prev) => ({ ...prev, records: false, initial: false }));
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStaff(), fetchDepartments()]);
      await fetchRecords(1);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading.initial) {
      fetchRecords(page);
    }
  }, [page]);

  const prepareNewForm = () => {
    const salaries = staffs.map((staff) => ({
      staffId: staff.id,
      salary: staff.salary || 0,
      overtime: 0,
      total: staff.salary || 0,
      paid: 0,
    }));
    setForm({
      month: getSolarHijriMonth(),
      year: getSolarHijriYear(),
      salaries,
    });
    setSelectedStaffId('');
  };

  const handleSalaryChange = (index, field, value) => {
    const updated = [...form.salaries];
    const numericValue = Number(value) || 0;
    updated[index][field] = field === "overtime" || field === "paid" ? numericValue : value;

    if (field === "overtime") {
      const salary = updated[index].salary || 0;
      updated[index].total = salary + numericValue;
    }

    setForm({ ...form, salaries: updated });
  };

  const handleAddStaff = () => {
    if (!selectedStaffId) return;
    const staff = staffs.find(s => s.id === Number(selectedStaffId));
    if (!staff) return;
    if (form.salaries.some(s => s.staffId === staff.id)) {
      alert('This staff is already added.');
      return;
    }
    const newEntry = {
      staffId: staff.id,
      salary: staff.salary || 0,
      overtime: 0,
      total: staff.salary || 0,
      paid: 0,
    };
    setForm({
      ...form,
      salaries: [...form.salaries, newEntry],
    });
    setSelectedStaffId('');
  };

  const handleRemoveStaff = (index) => {
    const updated = [...form.salaries];
    updated.splice(index, 1);
    setForm({ ...form, salaries: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (form.salaries.some(s => !s.staffId)) {
      alert("All staff entries must have a valid staffId.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        month: form.month,
        year: form.year,
        salaries: form.salaries.map(s => ({
          staffId: s.staffId,
          salary: s.salary,
          overtime: s.overtime,
          total: s.total,
          paid: s.paid,
        })),
      };

      if (editingId) {
        await axios.put(`${BASE_URL}/attendance/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/attendance`, payload);
      }
      await fetchRecords(page);
      resetForm();
    } catch (error) {
      console.error("Error saving payroll summary:", error);
      alert(error.response?.data?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
    setSelectedStaffId('');
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    const salaries = record.salaries.map(s => ({
      staffId: s.staffId,
      salary: s.salary,
      overtime: s.overtime,
      total: (s.salary || 0) + (s.overtime || 0),
      paid: s.paid,
    }));
    setForm({
      month: record.month,
      year: record.year,
      salaries,
    });
    setShowForm(true);
    setSelectedStaffId('');
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this payroll summary?")) return;
    try {
      await axios.delete(`${BASE_URL}/attendance/${id}`);
      if (records.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await fetchRecords(page);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLoadStaff = async () => {
    await fetchStaff();
    if (showForm && !editingId) {
      prepareNewForm();
    }
  };

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : "Unassigned";
  };

  if (loading.initial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-6">
        <FaSpinner className="text-5xl text-primary-800 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Payroll Data</h2>
        <p className="text-gray-600">Please wait a moment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Monthly Payroll Management</h1>
        <p className="text-gray-600">Create and manage monthly salary summaries</p>
        {editingId && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <FaEdit className="h-5 w-5" />
              <span className="font-semibold">Editing summary #{editingId}</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Form Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => {
            if (!showForm) {
              prepareNewForm();
            }
            setShowForm((prev) => !prev);
            if (showForm) resetForm();
          }}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:from-primary-900 hover:to-primary-700 transition font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
          disabled={loading.staffs}
        >
          {loading.staffs ? (
            <>
              <FaSpinner className="animate-spin" />
              Loading staff...
            </>
          ) : showForm ? (
            "Close Form"
          ) : (
            <>
              <FaPlus /> New Monthly Summary
            </>
          )}
        </button>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-primary text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <FaEdit className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{editingId ? "Edit Payroll Summary" : "New Payroll Summary"}</h2>
                  <p className="text-sm text-white/80">
                    {editingId ? "Update salaries and payments" : "Select month and enter overtime amount for each staff"}
                  </p>
                </div>
              </div>
              {!editingId && (
                <button
                  type="button"
                  onClick={handleLoadStaff}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-2 transition"
                  disabled={loading.staffs}
                >
                  {loading.staffs ? <FaSpinner className="animate-spin" /> : <FaSync />}
                  Load Staff
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Month/Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500"
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                    required
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year (Shamsi)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {/* Add Staff Row */}
              <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Staff</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a staff member</option>
                    {staffs.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} - {staff.fatherName} (Dept: {getDepartmentName(staff.departmentId)})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddStaff}
                  disabled={!selectedStaffId || submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <FaPlus className="h-4 w-4" /> Add
                </button>
                {form.salaries.length === 0 && (
                  <span className="text-sm text-gray-500">No staff added yet.</span>
                )}
              </div>

              {/* Staff Salary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3 text-left">Staff</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Base Salary</th>
                      <th className="p-3 text-left">Overtime (AFN)</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Paid</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.salaries.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-4 text-center text-gray-500">
                          No staff added. Use the dropdown above to add.
                        </td>
                      </tr>
                    )}
                    {form.salaries.map((item, index) => {
                      const staff = staffs.find(s => s.id === item.staffId);
                      const deptName = staff?.departmentId ? getDepartmentName(staff.departmentId) : "Unassigned";
                      return (
                        <tr key={item.staffId || index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3 font-medium">{staff?.name || "Unknown"}</td>
                          <td className="p-3 text-gray-600">{deptName}</td>
                          <td className="p-3">{item.salary} AFN</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="w-20 border border-gray-300 rounded px-2 py-1"
                              value={item.overtime}
                              onChange={(e) => handleSalaryChange(index, "overtime", e.target.value)}
                              disabled={submitting}
                            />
                          </td>
                          <td className="p-3 font-bold text-emerald-700">{item.total} AFN</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              className="w-24 border border-gray-300 rounded px-2 py-1"
                              value={item.paid}
                              onChange={(e) => handleSalaryChange(index, "paid", e.target.value)}
                              disabled={submitting}
                            />
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                              disabled={submitting}
                              title="Remove staff"
                            >
                              <FaTimes className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium" disabled={submitting}>
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || form.salaries.length === 0}
                  className={`px-6 py-3 rounded-lg font-medium shadow-md transition flex items-center gap-2 ${
                    submitting || form.salaries.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary hover:from-primary-900 hover:to-primary-700 text-white"
                  }`}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin h-5 w-5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaCheck />
                      {editingId ? "Update Summary" : "Create Summary"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-primary text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <FaEye className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Payroll Summaries</h2>
                <p className="text-sm text-white/80">Showing {records.length} of {totalRecords} summaries</p>
              </div>
            </div>
            {loading.records && (
              <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full">
                <FaSpinner className="animate-spin" />
                Loading...
              </div>
            )}
          </div>
          <SalaryDateDownload />
        </div>

        {loading.records ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FaSpinner className="text-4xl text-primary-800 animate-spin mb-4" />
            <p className="text-gray-600">Loading payroll summaries...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-primary-50 text-primary-800">
                  <tr>
                    <th className="p-3 border-b font-semibold">#</th>
                    <th className="p-3 border-b font-semibold">Period</th>
                    <th className="p-3 border-b font-semibold">Total Salary</th>
                    <th className="p-3 border-b font-semibold">Total Paid</th>
                    <th className="p-3 border-b font-semibold">Remaining</th>
                    <th className="p-3 border-b font-semibold">Staff Count</th>
                    <th className="p-3 border-b font-semibold">Departments</th>
                    <th className="p-3 border-b font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-500">No payroll summaries found</td>
                    </tr>
                  ) : (
                    records.map((record, idx) => {
                      const staffCount = record.salaries?.length || 0;
                      let total = 0, paid = 0, remaind = 0;
                      record.departmentSummaries?.forEach(ds => {
                        total += ds.department.total || 0;
                        paid += ds.department.received || 0;
                        remaind += ds.department.remained || 0;
                      });
                      return (
                        <tr key={record.id} className="hover:bg-gray-50 border-b last:border-0 transition-colors">
                          <td className="p-3 text-gray-600">{record.id}</td>
                          <td className="p-3 font-medium">{monthNames[record.month - 1]} {record.year}</td>
                          <td className="p-3 text-emerald-700 font-bold">{total} AFN</td>
                          <td className="p-3 text-blue-700 font-bold">{paid} AFN</td>
                          <td className="p-3 text-red-700 font-bold">{remaind} AFN</td>
                          <td className="p-3">{staffCount}</td>
                          <td className="p-3 text-left">
                            {record.departmentSummaries && record.departmentSummaries.length > 0 ? (
                              <div className="space-y-1">
                                {record.departmentSummaries.map((ds, i) => {
                                  const deptName = getDepartmentName(ds.department.id);
                                  return (
                                    <div key={i} className="text-xs">
                                      <span className="font-medium text-gray-800">{deptName}</span>
                                      <div className="text-[10px] text-gray-500">
                                        Total: {ds.department.total} | Paid: {ds.department.received} | Rem: {ds.department.remained}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEdit(record)} className="p-2 text-primary-700 hover:bg-primary-50 rounded-lg transition" title="Edit">
                                <FaEdit />
                              </button>
                              {currentUser.role === "admin" && (
                                <button onClick={() => handleDelete(record.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlySalaryManagement;