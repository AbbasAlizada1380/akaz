import React, { useState, useEffect } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const ProfileModal = ({ isOpen, onClose, currentUser }) => {
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    newPassword: "",
    rePassword: "",
    oldPassword: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        fullname: currentUser.fullname || "",
        email: currentUser.email || "",
        newPassword: "",
        rePassword: "",
        oldPassword: "",
      });
    }
  }, [currentUser, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { fullname, email, newPassword, rePassword, oldPassword } = formData;

    if (newPassword && newPassword !== rePassword) {
      toast.error("New passwords do not match", {
        position: "top-right",
      });
      return;
    }

    if (!oldPassword) {
      toast.error("Current password is required", {
        position: "top-right",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.patch(
        `${BASE_URL}/users/${currentUser.id}`,
        {
          fullname,
          email,
          currentPassword: oldPassword,
          newPassword,
        },
        { withCredentials: true }
      );

      toast.success(
        response.data.message || "Profile updated successfully",
        {
          position: "top-right",
        }
      );

      setTimeout(onClose, 1500);
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        error.response?.data?.message || "Error updating profile",
        {
          position: "top-right",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative
                   border border-gray-200 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full
                     text-gray-600 hover:text-gray-900 hover:bg-gray-200
                     transition-all duration-200"
        >
          <FaTimes />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Edit Profile
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="fullname"
              value={formData.fullname}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500
                         transition-all duration-200"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500
                         transition-all duration-200"
              placeholder="Enter your email"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500
                         transition-all duration-200"
              placeholder="Enter new password"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="rePassword"
              value={formData.rePassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500
                         transition-all duration-200"
              placeholder="Re-enter new password"
            />
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500
                         transition-all duration-200"
              placeholder="Enter current password"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                         hover:bg-gray-300 transition-all duration-200"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg
                         hover:bg-orange-700 transition-all duration-200
                         font-medium flex items-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;