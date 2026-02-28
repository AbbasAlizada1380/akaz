import React, { useEffect, useState } from "react";
import axios from "axios";
import { LuUsers, LuPlus, LuTrash2 } from "react-icons/lu";
import Pagination from "../pagination/Pagination.jsx";
const BASE_URL = import.meta.env.VITE_BASE_URL;

const DepartmentManager = () => {
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10); // items per page
  // Holdings as an array for add/remove functionality
  const [holdings, setHoldings] = useState([]);

  const fetchDepartments = async (page = 1) => {
    try {
      const { data } = await axios.get(
        `${BASE_URL}/department?page=${page}&limit=${limit}`
      );

      setDepartments(data.data || []);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // ✅ New - Fetch from /users
  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/users`);
      setMembers(res.data || []); // because your API returns array directly
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchDepartments(currentPage);
    fetchMembers();
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ✅ Create or Update Department
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Department name is required");
      return;
    }

    // Validate that all holdings have member selected and percentage
    const invalidHoldings = holdings.some(h => !h.memberId || !h.percentage);
    if (invalidHoldings) {
      alert("Please complete all holding entries");
      return;
    }

    // Validate total percentage
    const totalPercentage = holdings.reduce((sum, h) => sum + (Number(h.percentage) || 0), 0);
    if (totalPercentage > 100) {
      alert("Total percentage cannot exceed 100%");
      return;
    }

    try {
      setLoading(true);

      // Convert holdings array to object for API
      const holdingsObject = holdings.reduce((acc, h) => {
        acc[h.memberId] = Number(h.percentage);
        return acc;
      }, {});

      const payload = {
        name,
        isActive,
        holding: holdingsObject,
      };

      if (editingId) {
        await axios.put(`${BASE_URL}/department/${editingId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/department`, payload);
      }

      resetForm();
      fetchDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit Department
  const handleEdit = (dept) => {
    setName(dept.name);
    setIsActive(dept.isActive);

    // Convert holdings object to array for editing
    const holdingsArray = dept.holding
      ? Object.entries(dept.holding).map(([memberId, percentage]) => ({
        id: Date.now() + Math.random() + memberId, // temporary unique id
        memberId: Number(memberId),
        percentage: percentage
      }))
      : [];

    setHoldings(holdingsArray);
    setEditingId(dept.id);
  };

  // ✅ Delete Department
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;

    try {
      await axios.delete(`${BASE_URL}/department/${id}`);
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
    }
  };

  // ✅ Reset Form
  const resetForm = () => {
    setName("");
    setIsActive(true);
    setHoldings([]);
    setEditingId(null);
  };

  // ✅ Add new holding row
  const addHoldingRow = () => {
    setHoldings([
      ...holdings,
      {
        id: Date.now() + Math.random(), // temporary unique id
        memberId: "",
        percentage: ""
      }
    ]);
  };

  // ✅ Remove holding row
  const removeHoldingRow = (id) => {
    setHoldings(holdings.filter(h => h.id !== id));
  };

  // ✅ Handle holding change
  const handleHoldingChange = (id, field, value) => {
    setHoldings(holdings.map(h =>
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  // ✅ Get available members (not already selected in other rows)
  const getAvailableMembers = (currentRowId) => {
    const selectedMemberIds = holdings
      .filter(h => h.id !== currentRowId && h.memberId)
      .map(h => h.memberId);

    return members.filter(m => !selectedMemberIds.includes(m.id));
  };

  // Filtered departments
  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch = dept.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && dept.isActive) ||
      (statusFilter === "inactive" && !dept.isActive);
    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Calculate total percentage
  const totalPercentage = holdings.reduce((sum, h) => sum + (Number(h.percentage) || 0), 0);

  return (
    <div className=" bg-white py-8">
      <div className=" mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold   mb-2">
            Department Management
          </h1>
          <p className="text-secondary">Add new departments and manage existing ones</p>
        </div>

        <div className="gap-8">
          {/* Form */}
          <div className="bg-white mr-4 ml-6 mx-auto rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LuUsers size={24} className=" " />
              </div>
              <h2 className="text-xl font-bold  ">
                {editingId ? "Edit Department" : "Add New Department"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none bg-gray-50 text-secondary"
                  placeholder="Enter department name"
                  required
                />
              </div>

              {/* Active */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5   border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-secondary">Active Department</span>
                </label>
              </div>

              {/* Holdings Section - Addable and Removable */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-secondary">
                      Member Holdings
                    </label>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${totalPercentage > 100
                      ? 'bg-red-100 text-red-600'
                      : totalPercentage === 100
                        ? 'bg-green-100 text-green-600'
                        : totalPercentage > 0
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                      Total: {totalPercentage}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addHoldingRow}
                    className="flex items-center gap-2 px-3 py-2 bg-primary text-secondary rounded-md hover:bg-primary/90 transition-colors duration-200 text-sm"
                  >
                    <LuPlus size={18} />
                    <span>Add Holding</span>
                  </button>
                </div>

                {holdings.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-secondary text-sm mb-2">No holdings defined</p>
                    <button
                      type="button"
                      onClick={addHoldingRow}
                      className="  hover: /80 text-sm font-medium inline-flex items-center gap-1"
                    >
                      <LuPlus size={16} />
                      Add Holding
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holdings.map((holding, index) => (
                      <div
                        key={holding.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                      >
                        {/* Index */}
                        <span className="text-secondary text-sm w-6">{index + 1}.</span>

                        {/* Member Select */}
                        <select
                          value={holding.memberId}
                          onChange={(e) => handleHoldingChange(holding.id, 'memberId', Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none bg-white text-secondary"
                          required
                        >
                          <option value="">Select Member</option>
                          {members.map((member) => {
                            const isAvailable = !holdings.some(
                              h => h.id !== holding.id && h.memberId === member.id
                            );
                            return (
                              <option
                                key={member.id}
                                value={member.id}
                                disabled={!isAvailable && holding.memberId !== member.id}
                                className={!isAvailable && holding.memberId !== member.id ? 'text-gray-400' : ''}
                              >
                                {member.fullname} {!isAvailable && holding.memberId !== member.id ? '(selected)' : ''}
                              </option>
                            );
                          })}
                        </select>

                        {/* Percentage Input */}
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={holding.percentage}
                            onChange={(e) => handleHoldingChange(holding.id, 'percentage', e.target.value)}
                            className="w-full px-3 py-2 pl-7 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none bg-white text-left"
                            placeholder="0"
                            required
                          />
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            %
                          </span>
                        </div>

                        {/* Progress Bar (optional) */}
                        {holding.percentage > 0 && (
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(holding.percentage, 100)}%` }}
                            />
                          </div>
                        )}

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeHoldingRow(holding.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200"
                          title="Remove holding"
                        >
                          <LuTrash2 size={18} />
                        </button>
                      </div>
                    ))}

                    {/* Total percentage warning */}
                    {totalPercentage > 100 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Total percentage cannot exceed 100%
                        </p>
                      </div>
                    )}

                    {totalPercentage < 100 && totalPercentage > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-blue-600 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {100 - totalPercentage}% remaining
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || totalPercentage > 100}
                  className="bg-primary px-5 text-secondary py-3 rounded-xl font-semibold text-lg hover:bg-primary/90 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingId ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <LuUsers size={20} />
                      {editingId ? "Update Department" : "Add Department"}
                    </>
                  )}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-3 border border-gray-300 rounded-xl text-secondary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Departments Table */}
          <div className="mt-5 p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <LuUsers size={24} className=" " />
                </div>
                <h2 className="text-xl font-bold  ">Departments List</h2>
              </div>
            </div>



            {/* Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Member Holdings</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDepartments.length > 0 ? (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-gray-50 bg-white transition-colors duration-150">
                        <td className="px-6 py-4 text-left text-sm text-secondary">#{dept.id}</td>
                        <td className="px-6 py-4 text-left text-sm   font-medium">{dept.name}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${dept.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-secondary"
                              }`}
                          >
                            {dept.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left text-sm">
                          {dept.holding && Object.keys(dept.holding).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(dept.holding).map(([memberId, percent]) => {
                                const member = members.find((m) => m.id === Number(memberId));
                                return (
                                  <span
                                    key={memberId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10   rounded-md text-xs"
                                  >
                                    <span>{member?.fullname || 'Unknown'}:</span>
                                    <span className="font-bold">{percent}%</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEdit(dept)}
                              className="  hover: /80 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(dept.id)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="text-secondary text-sm">
                          <LuUsers size={48} className="mx-auto text-gray-300 mb-3" />
                          {searchTerm || statusFilter !== "all"
                            ? "No departments match your search criteria"
                            : "No departments found"}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>      {(
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DepartmentManager;