import { useState } from "react";
import SalaryLists from "./SalaryLists";
import StaffManager from "./StaffManager";

const Salary = () => {
  const [activeTab, setActiveTab] = useState("salary");

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Salary &amp; Staff Management
                </h1>
                <p className="text-white/80 mt-1 text-sm md:text-base">
                  Manage salary lists, attendance, and staff records
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">
                System Online
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Salary List Tab */}
            <button
              className={`group relative flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "salary"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
              onClick={() => setActiveTab("salary")}
            >
              <div
                className={`p-2 rounded-lg ${
                  activeTab === "salary" ? "bg-white/20" : "bg-primary/10"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    activeTab === "salary" ? "text-white" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Salary List</span>
              {activeTab === "salary" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Staff Manager Tab */}
            <button
              className={`group relative flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "staff"
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
              onClick={() => setActiveTab("staff")}
            >
              <div
                className={`p-2 rounded-lg ${
                  activeTab === "staff" ? "bg-white/20" : "bg-primary/10"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    activeTab === "staff" ? "text-white" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Staff Management</span>
              {activeTab === "staff" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>
          </div>

          {/* Tab Indicator Line */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>

        {/* Active Tab Content */}
        <div className="px-4 md:px-6 pb-6 md:pb-8">
          <div className="transition-all duration-500 ease-in-out">
            {activeTab === "salary" && (
              <div className="animate-fadeIn">
                <SalaryLists />
              </div>
            )}
            {activeTab === "staff" && (
              <div className="animate-fadeIn">
                <StaffManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;