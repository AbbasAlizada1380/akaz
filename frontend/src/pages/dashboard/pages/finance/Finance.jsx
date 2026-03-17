import { useState } from "react";
import Receive from "./Receive";
import Pay from "./Pay";
import ExistingStock from "../ExistingStock";
import Report from "./Report";

const Finance = () => {
  const [activeTab, setActiveTab] = useState("receive");

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header Section */}
        <div className="bg-primary p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10">
                  </path>
                </svg>
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-black">
                  Finance Management
                </h1>
              </div>

            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Receive */}
            <button
              className={`group flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${activeTab === "receive"
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              onClick={() => setActiveTab("receive")}
            >
              <div className={`p-2 rounded-lg ${activeTab === "receive" ? "bg-white/20" : "bg-primary/10"}`}>
                <svg className={`w-5 h-5 ${activeTab === "receive" ? "text-black" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <span className="text-sm md:text-base">Receive</span>

              {activeTab === "receive" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Pay */}
            <button
              className={`group flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${activeTab === "pay"
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              onClick={() => setActiveTab("pay")}
            >
              <div className={`p-2 rounded-lg ${activeTab === "pay" ? "bg-white/20" : "bg-primary/10"}`}>
                <svg className={`w-5 h-5 ${activeTab === "pay" ? "text-black" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <span className="text-sm md:text-base">Pay</span>

              {activeTab === "pay" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

            {/* Report */}
            <button
              className={`group flex-1 sm:flex-none flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 relative ${activeTab === "report"
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              onClick={() => setActiveTab("report")}
            >
              <div className={`p-2 rounded-lg ${activeTab === "report" ? "bg-white/20" : "bg-primary/10"}`}>
                <svg className={`w-5 h-5 ${activeTab === "report" ? "text-black" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6m4 6V7m4 10V4M5 21h14" />
                </svg>
              </div>
              <span className="text-sm md:text-base">Report</span>

              {activeTab === "report" && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-t-lg"></div>
              )}
            </button>

          </div>

          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>


        {/* Tab Content */}
        <div className="px-4 md:px-6 pb-6 md:pb-8">
          {activeTab === "receive" && (
            <div className="animate-fadeIn">
              <Receive />
            </div>
          )}

          {activeTab === "pay" && (
            <div className="animate-fadeIn">
              <Pay />
            </div>
          )}
          {activeTab === "report" && (
            <div className="animate-fadeIn">
              <Report />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Finance;