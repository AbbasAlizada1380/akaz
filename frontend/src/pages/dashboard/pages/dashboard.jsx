import React from "react";
import Stakeholderpage from "./stakeholderpage";
import CombinedReport from "./report/CombinedReport";

const Dashboard = () => {
  return (
    <div className=" p-6 bg-gray-50 min-h-screen text-right" dir="rtl">
      {/* Main Dashboard Title */}
      <h1 className=" text-center text-2xl lg:text-3xl font-bold text-gray-800 mb-6">
      Zanjera Omid Management System
      </h1>

      {/* Render the FinancialReports component */}
      <div className="mt-6">
        <CombinedReport/>
        <Stakeholderpage />
        {/* <AnalyticsDashboard /> */}
      </div>
    </div>
  );
};

export default Dashboard;
