import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { createUser, getUsers } from "../services/UserServices";
import { LuUsers } from "react-icons/lu";

const AddUser = () => {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [roles] = useState([{ id: 1, name: "reception" }]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res || []);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error Fetching Users",
        text: "There was a problem retrieving the user list.",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Passwords Do Not Match",
        text: "Please make sure both passwords are identical.",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const newUser = await createUser({
        fullname: form.fullname,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `User ${newUser.fullname} has been created successfully.`,
        timer: 3000,
        showConfirmButton: false,
      });

      setForm({
        fullname: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });

      fetchUsers();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "User Creation Failed",
        text:
          err.response?.data?.message ||
          err.message ||
          "Something went wrong.",
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [
    "all",
    ...new Set(users.map((user) => user.role).filter((role) => role)),
  ];

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">
            Add new users and manage access permissions
          </p>
        </div>

        {/* Add User Form */}
        <div className="bg-gray-100 max-w-4xl mx-auto rounded-lg shadow-lg p-6 border">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-cyan-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Add New User
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-5">

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullname"
                  value={form.fullname}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-cyan-800 focus:outline-none"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-cyan-800 focus:outline-none"
                  placeholder="example@email.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-cyan-800 focus:outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-cyan-800 focus:outline-none"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              {/* Role */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  User Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-cyan-800 focus:outline-none"
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-cyan-800 px-6 py-3 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-all"
              >
                Add User
              </button>
            </div>
          </form>
        </div>

        {/* Users List */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LuUsers size={24} className="text-cyan-800" />
              <h2 className="text-xl font-bold">Users List</h2>
              <span className="bg-blue-100 text-cyan-800 text-sm px-3 py-1 rounded-full">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>

            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-cyan-800 text-white rounded-lg hover:bg-cyan-700"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-10 w-10 border-b-2 border-cyan-800 rounded-full"></div>
            </div>
          ) : (
            <div className="overflow-hidden border rounded-lg">
              <table className="w-full">
                <thead className="bg-cyan-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">#</th>
                    <th className="px-6 py-4 text-left">Full Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{index + 1}</td>
                        <td className="px-6 py-4 font-medium">{user.fullname}</td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs bg-cyan-800 text-white">
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        No users found
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
  );
};

export default AddUser;