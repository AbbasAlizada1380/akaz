import { useState } from "react";
import { FaUsers, FaUserTie, FaStore, FaChartBar } from "react-icons/fa";
import { useSelector } from "react-redux";
import SellerManagement from "./SellerManagement.jsx";
import Customers from "./Customers.jsx";

const BusinessManagement = () => {
  const [activeTab, setActiveTab] = useState("customers");

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSellers: 0,
    activeCustomers: 0,
    activeSellers: 0,
  });

  const { currentUser } = useSelector((state) => state.user);
  const isAdmin = currentUser?.role === "admin";

  const tabs = [
    {
      id: "customers",
      name: "Customer Management",
      icon: FaUsers,
      component: Customers,
      description: "Manage customer information",
    },
    {
      id: "sellers",
      name: "Seller Management",
      icon: FaUserTie,
      component: SellerManagement,
      description: "Manage seller information",
    },
  ];

  const CurrentComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || Customers;

  const getTabClasses = (tabId) => {
    const isActive = activeTab === tabId;

    return isActive
      ? "bg-primary text-white border-primary shadow-md"
      : "bg-white text-gray-700 border-gray-300 hover:bg-primary/10 hover:border-primary";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary/10">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-xl shadow-lg">
                <FaStore className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Business Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage customers and sellers
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <FaUsers className="text-primary" />
                <div>
                  <span className="text-sm text-gray-600">Customers:</span>
                  <span className="ml-1 font-bold text-primary">
                    {stats.totalCustomers}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <FaUserTie className="text-primary" />
                <div>
                  <span className="text-sm text-gray-600">Sellers:</span>
                  <span className="ml-1 font-bold text-primary">
                    {stats.totalSellers}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 border-b border-gray-200 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-t-lg border-b-2 transition-all duration-200 font-medium ${getTabClasses(
                    tab.id
                  )}`}
                >
                  <Icon
                    className={`text-lg ${
                      isActive ? "text-white" : "text-primary"
                    }`}
                  />
                  <span>{tab.name}</span>

                  {tab.id === "customers" &&
                    stats.totalCustomers > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          isActive
                            ? "bg-white text-primary"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {stats.totalCustomers}
                      </span>
                    )}

                  {tab.id === "sellers" &&
                    stats.totalSellers > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          isActive
                            ? "bg-white text-primary"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {stats.totalSellers}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="container mx-auto px-4 py-6">
        {/* Active Tab Info */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4 border-l-4 border-primary">
          <div className="flex items-center gap-3">
            {activeTab === "customers" ? (
              <FaUsers className="text-primary text-xl" />
            ) : (
              <FaUserTie className="text-primary text-xl" />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {tabs.find((t) => t.id === activeTab)?.name}
              </h2>
              <p className="text-sm text-gray-600">
                {tabs.find((t) => t.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <CurrentComponent
            key={activeTab}
            onStatsUpdate={(newStats) => {
              setStats((prev) => ({ ...prev, ...newStats }));
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-8 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm text-gray-600">
          <div>{new Date().toLocaleDateString("en-US")}</div>
          <div>
            {activeTab === "customers"
              ? "Customer Management"
              : "Seller Management"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessManagement;