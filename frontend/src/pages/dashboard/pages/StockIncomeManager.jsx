// StockIncomePage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import StockIncomeForm from "./StockIncomeForm.jsx";
import StockIncomeTable from "./StockIncomeTable.jsx";
import FactorManager from "./factorList.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function StockIncomePage() {
    const [activeTab, setActiveTab] = useState("stockIncome");
    const [sellers, setSellers] = useState([]);
    const [exists, setExists] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [factorRefreshKey, setFactorRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 20;

    const fetchMasterData = async () => {
        try {
            const [sRes, eRes, dRes] = await Promise.all([
                axios.get(`${BASE_URL}/seller/active`),
                axios.get(`${BASE_URL}/stockExist`),
                axios.get(`${BASE_URL}/department`),
            ]);
            setSellers(sRes.data.data || []);
            setExists(eRes.data.data || []);
            setDepartments(dRes.data.data || []);
        } catch (err) {
            console.error("Error fetching master data:", err);
        }
    };

    const fetchIncomes = async (page = 1) => {
        try {
            const res = await axios.get(`${BASE_URL}/stockincome`, {
                params: { page, limit },
            });
            setIncomes(res.data.stockIncomes || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalRecords(res.data.pagination?.totalItems || 0);
        } catch (err) {
            console.error("Error fetching incomes:", err);
            setIncomes([]);
            setTotalPages(1);
            setTotalRecords(0);
        }
    };

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        if (activeTab === "stockIncome") fetchIncomes(currentPage);
    }, [currentPage, activeTab]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
    };

    const handleFormSuccess = () => {
        setFactorRefreshKey((prev) => prev + 1);
        fetchIncomes(1);
        setCurrentPage(1);
        fetchMasterData();
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Stock Income Management
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Record incoming stock from sellers, calculate costs, and track invoices
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <StockIncomeForm 
                        onSuccess={handleFormSuccess}
                        departments={departments}
                        sellers={sellers}
                        exists={exists}
                    />
                </div>

                {/* Tabs */}
                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("stockIncome")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                            activeTab === "stockIncome"
                                ? "bg-cyan-600 text-white shadow-lg"
                                : "text-gray-600 hover:text-cyan-600 hover:bg-gray-100"
                        }`}
                    >
                        Stock Incomes
                    </button>
                    <button
                        onClick={() => setActiveTab("factors")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${
                            activeTab === "factors"
                                ? "bg-cyan-600 text-white shadow-lg"
                                : "text-gray-600 hover:text-cyan-600 hover:bg-gray-100"
                        }`}
                    >
                        Seller Factors
                    </button>
                </div>

                {/* Stock Incomes Table */}
                {activeTab === "stockIncome" ? (
                    <StockIncomeTable
                        incomes={incomes}
                        totalRecords={totalRecords}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <FactorManager refreshKey={factorRefreshKey} />
                    </div>
                )}
            </div>
        </div>
    );
}