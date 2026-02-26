import React, { useState, useEffect, useRef } from "react";
import {
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaUser,
  FaChevronDown,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { useSelector, useDispatch } from "react-redux";
import { signOutSuccess } from "../../state/userSlice/userSlice";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProfileModal from "./ProfileModal";
import moment from "moment";

const Navbar = () => {
  const [dateInfo, setDateInfo] = useState({
    day: "",
    dateNumber: "",
    month: "",
    year: "",
    time: "",
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [notifications] = useState([]);

  const profileDropdownRef = useRef(null);
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const updateDate = () => {
      const now = moment();

      setDateInfo({
        day: now.format("dddd"),
        dateNumber: now.format("D"),
        month: now.format("MMMM"),
        year: now.format("YYYY"),
        time: now.format("HH:mm"),
      });
    };

    updateDate();
    const timer = setInterval(updateDate, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(signOutSuccess());
    setIsProfileDropdownOpen(false);
    navigate("/sign-in");
  };

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const getInitials = (firstName = "", lastName = "") => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const notificationCount = notifications.length;

  return (
    <>
      <nav className="bg-white text-gray-800 py-2 shadow-sm px-6 grid grid-cols-3 border-b border-gray-200 sticky top-0 z-40">
        
        {/* Left Section - Brand */}
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-300 rounded-xl shadow-lg">
              <MdDashboard size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-800">
                ZANJERA OMID
              </h1>
              <p className="text-xs text-gray-500">
                Management Information System
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Date */}
        <div className="hidden md:flex items-center justify-center">
          <div className="text-center flex items-center gap-x-3">
            <p className="text-xl font-bold text-orange-400">
              {dateInfo.day}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {dateInfo.dateNumber} {dateInfo.month} {dateInfo.year}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center justify-end gap-4">

          {/* Notifications */}
          <div className="relative">
            <button className="relative p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200">
              <FaBell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Dropdown */}
          <div ref={profileDropdownRef} className="relative">
            <button
              className="flex items-center gap-3 bg-white hover:bg-gray-50 rounded-2xl px-3 py-2 transition-all duration-200 border hover:border-orange-200"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              {currentUser?.profile_picture ? (
                <img
                  src={currentUser.profile_picture}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : currentUser?.first_name || currentUser?.last_name ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(currentUser.first_name, currentUser.last_name)}
                </div>
              ) : (
                <FaUserCircle className="text-3xl text-gray-400" />
              )}

              <div className="hidden lg:block text-right">
                <p className="text-sm font-semibold text-gray-800">
                  {currentUser
                    ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`
                    : "Loading..."}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {currentUser?.role || "User"}
                </p>
              </div>

              <FaChevronDown
                className={`text-gray-400 transition-transform duration-200 ${
                  isProfileDropdownOpen ? "rotate-180" : ""
                }`}
                size={12}
              />
            </button>

            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 z-50 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100"
                >
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {currentUser?.first_name} {currentUser?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUser?.email}
                    </p>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={handleOpenProfileModal}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 rounded-xl transition-all duration-200"
                    >
                      <FaUser className="mr-3 text-gray-500" />
                      Profile
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <FaSignOutAlt className="mr-3 text-red-500" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        currentUser={currentUser}
      />
    </>
  );
};

export default Navbar;