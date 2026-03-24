import { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaSpinner } from "react-icons/fa";
import { useSelector } from "react-redux";
import SalaryDateDownload from "./report/salaryDateDownload";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const initialForm = {
  staffId: "",
  receipt: 0,
  attendance: {
    Saturday: { attendance: false, overtime: 0 },
    Sunday: { attendance: false, overtime: 0 },
    Monday: { attendance: false, overtime: 0 },
    Tuesday: { attendance: false, overtime: 0 },
    Wednesday: { attendance: false, overtime: 0 },
    Thursday: { attendance: false, overtime: 0 },
  },
};

const SalaryManagement = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [staffs, setStaffs] = useState([]);
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState({
    staffs: true,
    records: true,
    initial: true
  });

  // ---------------- FETCH DATA ----------------
  const fetchStaff = async () => {
    setLoading(prev => ({ ...prev, staffs: true }));
    try {
      const res = await axios.get(`${BASE_URL}/staff`);
      setStaffs(res.data.staffs || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setStaffs([]);
    } finally {
      setLoading(prev => ({ ...prev, staffs: false }));
    }
  };

  const fetchAttendance = async () => {
    setLoading(prev => ({ ...prev, records: true }));
    try {
      const res = await axios.get(`${BASE_URL}/attendance`);
      setRecords(res.data || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setRecords([]);
    } finally {
      setLoading(prev => ({ ...prev, records: false, initial: false }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchStaff(), fetchAttendance()]);
    };
    fetchData();
  }, []);

  // ---------------- HANDLE INPUT ----------------
  const handleAttendanceChange = (day, field, value) => {
    setForm(prev => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [day]: {
          ...prev.attendance[day],
          [field]: field === "attendance" ? value : Number(value),
        },
      },
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${BASE_URL}/attendance/${editingId}`, {
          attendance: form.attendance,
          receipt: form.receipt,
        });
      } else {
        await axios.post(`${BASE_URL}/attendance`, form);
      }

      await fetchAttendance();

      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);

    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- EDIT ----------------
  const handleEdit = record => {
    setEditingId(record.id);
    setForm({
      staffId: record.staffId,
      receipt: record.receipt || 0,
      attendance: record.attendance,
    });
    setShowForm(!showForm)
  };

  // ---------------- DELETE ----------------
  const handleDelete = async id => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await axios.delete(`${BASE_URL}/attendance/${id}`);
      await fetchAttendance();
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const daysOrder = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const englishDays = {
    Saturday: "Saturday",
    Sunday: "Sunday",
    Monday: "Monday",
    Tuesday: "Tuesday",
    Wednesday: "Wednesday",
    Thursday: "Thursday"
  };

  // Initial loading state
  if (loading.initial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-6">
        <FaSpinner className="text-5xl text-primary-800 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Attendance Data</h2>
        <p className="text-gray-600">Please wait a moment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Attendance Management</h1>
        <p className="text-gray-600">Record and manage staff attendance and salaries</p>

        {editingId && (
          <div className="mt-4 p-4 border border-yellow-400 rounded-xl max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <FaEdit className="h-5 w-5" />
              <span className="font-semibold">Editing mode – Record #{editingId}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-center mb-6">
        <button
          onClick={() => {
            setForm(initialForm);
            setEditingId(null);
            setShowForm(prev => !prev);
          }}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:from-primary-900 hover:to-primary-700 transition font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
          disabled={loading.staffs}
        >
          {loading.staffs ? (
            <>
              <FaSpinner className="animate-spin" />
              Loading staff list...
            </>
          ) : (
            showForm ? "Close Form" : "New Attendance Record"
          )}
        </button>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Form Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Attendance" : "New Attendance Record"}
              </h2>
              <p className="text-sm text-white/80">
                {editingId ? "Edit attendance details" : "Record attendance for a staff member"}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Staff Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> Select Staff Member
                  </label>
                  {loading.staffs ? (
                    <div className="flex items-center justify-center h-12 bg-gray-100 rounded-lg">
                      <FaSpinner className="animate-spin text-gray-400 mr-2" />
                      <span className="text-gray-500">Loading staff list...</span>
                    </div>
                  ) : (
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition disabled:opacity-50"
                      value={form.staffId}
                      onChange={e => setForm({ ...form, staffId: e.target.value })}
                      required
                      disabled={loading.staffs}
                    >
                      <option value="">Select Staff Member</option>
                      {Array.isArray(staffs) &&
                        staffs.map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} - {staff.fatherName}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Attendance Days Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daysOrder.map(day => (
                    <div key={day} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700">{englishDays[day]}</h3>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="hidden peer"
                              checked={form.attendance[day].attendance}
                              onChange={e =>
                                handleAttendanceChange(day, "attendance", e.target.checked)
                              }
                              disabled={submitting}
                            />
                            <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${form.attendance[day].attendance ? 'bg-green-500' : 'bg-gray-300'} ${submitting ? 'opacity-50' : ''}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${form.attendance[day].attendance ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-sm text-gray-600">
                              {form.attendance[day].attendance ? <FaCheck className="text-green-500" /> : <FaTimes className="text-gray-400" />}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Overtime (hours)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition disabled:opacity-50"
                            value={form.attendance[day].overtime}
                            onChange={e =>
                              handleAttendanceChange(day, "overtime", e.target.value)
                            }
                            disabled={!form.attendance[day].attendance || submitting}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            hrs
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-4 border-t border-gray-200">

                  {/* Total & Receipt Section */}
                  {editingId && (
                    <div className="flex flex-col md:flex-row gap-4 flex-1">

                      {/* Total Display */}
                      <div className="bg-gray-100 p-4 rounded-lg flex flex-col justify-center items-start">
                        <label className="text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                        <span className="text-lg font-bold text-emerald-700">
                          {records.find(r => r.id === editingId)?.total || 0} AFN
                        </span>
                      </div>

                      {/* Receipt Input */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount Paid (Receipt)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={records.find(r => r.id === editingId)?.total || undefined}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition disabled:opacity-50"
                          value={form.receipt}
                          onChange={e =>
                            setForm({ ...form, receipt: Number(e.target.value) })
                          }
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(initialForm);
                          setEditingId(null);
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                        disabled={submitting}
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-6 py-3 rounded-lg font-medium shadow-md transition flex items-center gap-2
    ${submitting
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-primary-800 to-primary-600 hover:from-primary-900 hover:to-primary-700 text-white"
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
                          {editingId ? "Save Changes" : "Save Attendance"}
                        </>
                      )}
                    </button>

                  </div>
                </div>

              </form>
            </div>
          </div>)}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Attendance Records</h2>
              </div>
            </div>
            {loading.records && (
              <div className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full">
                <FaSpinner className="animate-spin" />
                Loading...
              </div>
            )}
          </div>
          <div>
            <SalaryDateDownload/>
          </div>
        </div>

        {/* Table Content */}
        {loading.records ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FaSpinner className="text-4xl text-primary-800 animate-spin mb-4" />
            <p className="text-gray-600">Loading attendance records...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-primary-50 text-primary-800">
                <tr>
                  <th className="p-3 border-b font-semibold">#</th>
                  <th className="p-3 border-b font-semibold">Staff Member</th>
                  <th className="p-3 border-b font-semibold">Days Present</th>
                  <th className="p-3 border-b font-semibold">Total Overtime (hrs)</th>
                  <th className="p-3 border-b font-semibold">Overtime Pay</th>
                  <th className="p-3 border-b font-semibold">Base Salary</th>
                  <th className="p-3 border-b font-semibold">Total</th>
                  <th className="p-3 border-b font-semibold">Paid</th>
                  <th className="p-3 border-b font-semibold">Date</th>
                  <th className="p-3 border-b font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-gray-500 text-lg">No records found</p>
                        <p className="text-gray-400 text-sm mt-1">Add a new attendance record to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => {
                    const attendanceDays = Object.values(record.attendance || {}).filter(day => day.attendance).length;
                    const totalOvertime = Object.values(record.attendance || {}).reduce((sum, day) => sum + (day.overtime || 0), 0);

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                      >
                        <td className="p-3 text-gray-600">{record.id}</td>
                        <td className="p-3">
                          <div className="text-center">
                            <div className="font-medium text-gray-800">{record.Staff?.name}</div>
                            <div className="text-sm text-gray-500">{record.Staff?.fatherName}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {attendanceDays} day{attendanceDays !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                            {totalOvertime.toFixed(1)} hr{totalOvertime !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-center">
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                              {(record.overtime || 0)} AFN total
                            </span>
                            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
                              {record.overtime && totalOvertime ?
                                (record.overtime / totalOvertime) : 0} AFN / hr
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                            {(record.salary || 0)} AFN
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                            {(record.total || 0)} AFN
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                            {(record.receipt || 0)} AFN
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-3 py-1 ">
                            {record.createdAt ?
                              new Date(record.createdAt).toLocaleDateString('en-US')
                              : '—'
                            }
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-2 text-primary-700 hover:bg-primary-50 rounded-lg transition disabled:opacity-50"
                              title="Edit"
                              disabled={submitting || loading.records}
                            >
                              <FaEdit />
                            </button>
                            {currentUser.role == "admin" && (
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                title="Delete"
                                disabled={loading.records}
                              >
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
        )}
      </div>
    </div>
  );
};

export default SalaryManagement;