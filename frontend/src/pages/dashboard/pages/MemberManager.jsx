import React, { useEffect, useState } from "react";
import axios from "axios";
import { LuUsers } from "react-icons/lu";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const MemberManagement = () => {
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState({
        name: "",
        description: "",
        isActive: true,
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // ✅ Fetch Members
    const fetchMembers = async () => {
        try {
            const { data } = await axios.get(`${BASE_URL}/member`);
            setMembers(data.data || []);
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    // ✅ Handle Input Change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    // ✅ Submit (Create / Update)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            alert("Name is required");
            return;
        }

        try {
            setLoading(true);

            if (editingId) {
                await axios.put(`${BASE_URL}/member/${editingId}`, form);
            } else {
                await axios.post(`${BASE_URL}/member`, form);
            }

            resetForm();
            fetchMembers();
        } catch (error) {
            console.error("Error saving member:", error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Edit
    const handleEdit = (member) => {
        setForm({
            name: member.name,
            description: member.description || "",
            isActive: member.isActive,
        });
        setEditingId(member.id);
    };

    // ✅ Delete
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete?")) return;

        try {
            await axios.delete(`${BASE_URL}/member/${id}`);
            fetchMembers();
        } catch (error) {
            console.error("Error deleting member:", error);
        }
    };

    // ✅ Reset Form
    const resetForm = () => {
        setForm({
            name: "",
            description: "",
            isActive: true,
        });
        setEditingId(null);
    };

    // Filter members based on search term and status filter
    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" && member.isActive) ||
            (statusFilter === "inactive" && !member.isActive);
        return matchesSearch && matchesStatus;
    });

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
    };

    return (
        <div className=" bg-white py-8">
            <div className="mr-4 ml-4 mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold   mb-2">
                        Member Management
                    </h1>
                    <p className="text-secondary">Add new members and manage organization members</p>
                </div>

                <div className="">
                    {/* Left Column - Add Member Form */}
                    <div className="bg-white mx-auto rounded-lg shadow-lg p-6 transition-all duration-300 border border-gray-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LuUsers size={24} className=" " />
                            </div>
                            <h2 className="text-xl font-bold  ">
                                {editingId ? "Edit Member" : "Add New Member"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-5">
                                {/* Member Name */}
                                <div className="relative group col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-secondary mb-2">
                                        Member Name
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-all duration-200 bg-gray-50 text-secondary"
                                            placeholder="Enter member name"
                                            required
                                        />
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="relative group col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-secondary mb-2">
                                        Description
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-all duration-200 bg-gray-50 text-secondary"
                                            placeholder="Enter description"
                                        />
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 6h16M4 12h16M4 18h7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Status */}
                                <div className="relative group col-span-2">
                                    <div className="flex items-center h-12">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="isActive"
                                                checked={form.isActive}
                                                onChange={handleChange}
                                                className="w-5 h-5   border-gray-300 rounded focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-secondary">Active Member</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-center">
                                <button
                                    type="submit"
                                    disabled={loading}
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
                                            <svg
                                                className="w-5 h-5 text-secondary"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                />
                                            </svg>
                                            {editingId ? 'Update Member' : 'Add Member'}
                                        </>
                                    )}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="ml-3 px-5 py-3 border border-gray-300 rounded-xl text-secondary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary font-medium transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Right Column - Members List */}
                    <div className="mt-5 rounded-md transition-all duration-300">
                       
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className=" border border-gray-200 rounded-lg">
                                <table className="w-full">
                                    <thead className="bg-primary">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-secondary border-b border-primary/20">
                                                ID
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-secondary border-b border-primary/20">
                                                Name
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-secondary border-b border-primary/20">
                                                Description
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-secondary border-b border-primary/20">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-secondary border-b border-primary/20">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredMembers.length > 0 ? (
                                            filteredMembers.map((member) => (
                                                <tr
                                                    key={member.id}
                                                    className="hover:bg-gray-50 bg-white transition-colors duration-150"
                                                >
                                                    <td className="px-6 py-4 text-left text-sm text-secondary">
                                                        #{member.id}
                                                    </td>
                                                    <td className="px-6 py-4 text-left text-sm   font-medium">
                                                        {member.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-left text-sm text-secondary">
                                                        {member.description || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${member.isActive
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-secondary'
                                                            }`}>
                                                            {member.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => handleEdit(member)}
                                                                className="  hover: /80 flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                                </svg>
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(member.id)}
                                                                className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                                </svg>
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="border-b">
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <div className="text-secondary text-sm">
                                                        <svg
                                                            className="w-12 h-12 mx-auto text-gray-300 mb-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                                            />
                                                        </svg>
                                                        {searchTerm || statusFilter !== "all"
                                                            ? "No members match your search criteria"
                                                            : "No members found"}
                                                    </div>
                                                    {(searchTerm || statusFilter !== "all") && (
                                                        <button
                                                            onClick={clearFilters}
                                                            className="mt-2 px-4 py-2   hover: /80 text-sm font-medium"
                                                        >
                                                            Clear Filters
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberManagement;