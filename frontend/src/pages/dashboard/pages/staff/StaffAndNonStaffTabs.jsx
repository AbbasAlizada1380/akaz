import { useState } from "react";
import StaffManager from "./StaffManager";
import NonStaffManager from "../../debt/NonStaffManager";
import SalaryManagement from "../SalaryManagement";
import DebtManager from "../../debt/DebtManager";

const StaffAndNonStaffTabs = () => {
  const [activeTab, setActiveTab] = useState("staff");

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="bg-primary p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.281.023-.562.045-.843.066a23.518 23.518 0 00-7.86-3.317 8.991 8.991 0 00-5.697 1.641 8.975 8.975 0 013.33 7.007h6.07z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-black">
                  Staff & Debtors Management
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Staff Tab */}
            <button
              className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${
                activeTab === "staff"
                  ? "text-white bg-primary shadow-lg shadow-primary/20"
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
                    activeTab === "staff" ? "text-black" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0c-.281.023-.562.045-.843.066a23.518 23.518 0 00-7.86-3.317 8.991 8.991 0 00-5.697 1.641 8.975 8.975 0 013.33 7.007h6.07z"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Staff</span>
              {activeTab === "staff" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Salary Tab */}
            <button
              className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${
                activeTab === "salary"
                  ? "text-white bg-primary shadow-lg shadow-primary/20"
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
                    activeTab === "salary" ? "text-black" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Salary</span>
              {activeTab === "salary" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Non‑Staff Debtors Tab */}
            <button
              className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${
                activeTab === "nonstaff"
                  ? "text-white bg-primary shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
              onClick={() => setActiveTab("nonstaff")}
            >
              <div
                className={`p-2 rounded-lg ${
                  activeTab === "nonstaff" ? "bg-white/20" : "bg-primary/10"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    activeTab === "nonstaff" ? "text-black" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2m0-4c1.657 0 3 .895 3 2s-1.343 2-3 2"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Non‑Staff Debtors</span>
              {activeTab === "nonstaff" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Debts Tab */}
            <button
              className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${
                activeTab === "debts"
                  ? "text-white bg-primary shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
              onClick={() => setActiveTab("debts")}
            >
              <div
                className={`p-2 rounded-lg ${
                  activeTab === "debts" ? "bg-white/20" : "bg-primary/10"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    activeTab === "debts" ? "text-black" : "text-primary"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <span className="text-sm md:text-base">Debts</span>
              {activeTab === "debts" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>
          </div>

          {/* Tab Indicator Line */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>

        {/* Active Tab Content with Smooth Transition */}
        <div className="">
          <div className="transition-all duration-500 ease-in-out">
            {activeTab === "staff" && (
              <div className="animate-fadeIn">
                <StaffManager />
              </div>
            )}
            {activeTab === "salary" && (
              <div className="animate-fadeIn">
                <SalaryManagement/>
              </div>
            )}
            {activeTab === "nonstaff" && (
              <div className="animate-fadeIn">
                <NonStaffManager />
              </div>
            )}
            {activeTab === "debts" && (
              <div className="animate-fadeIn">
                <DebtManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAndNonStaffTabs;