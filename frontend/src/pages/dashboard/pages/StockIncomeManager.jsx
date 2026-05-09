import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination.jsx";
import FactorManager from "./factorList.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function StockIncomePage() {
    const [activeTab, setActiveTab] = useState("stockIncome");
    const [sellers, setSellers] = useState([]);
    const [exists, setExists] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sellerMode, setSellerMode] = useState("existing");
    const [sellerId, setSellerId] = useState("");
    const [newSeller, setNewSeller] = useState("");
    const [factorRefreshKey, setFactorRefreshKey] = useState(0);

    const [rows, setRows] = useState([
        {
            existId: "",
            newExist: "",
            department: "",
            type: "quantity",
            amount: "",
            net_unite_price: "",
            sell_price: "",
            expense: "",
        },
    ]);

    const [paidAmount, setPaidAmount] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 20;

    const computeTotalCost = () => {
        let total = 0;
        for (const row of rows) {
            const amount = parseFloat(row.amount) || 0;
            const netUnit = parseFloat(row.net_unite_price) || 0;
            const expense = parseFloat(row.expense) || 0;
            total += amount * netUnit + expense;
        }
        return total;
    };

    const totalCost = computeTotalCost();
    useEffect(() => {
        if (!paidAmount || paidAmount === "") setPaidAmount(totalCost.toString());
    }, [totalCost]);

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

    const addRow = () => {
        setRows([
            ...rows,
            {
                existId: "",
                newExist: "",
                department: "",
                type: "quantity",
                amount: "",
                net_unite_price: "",
                sell_price: "",
                expense: "",
            },
        ]);
    };

    const removeRow = (index) => {
        if (rows.length === 1) {
            alert("At least one item is required");
            return;
        }
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (sellerMode === "existing" && !sellerId) {
            alert("Please select a seller");
            return;
        }
        if (sellerMode === "new" && !newSeller.trim()) {
            alert("Please enter the new seller name");
            return;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.existId && !row.newExist.trim()) {
                alert(`Row ${i + 1}: Please select an existing product or enter a new product name`);
                return;
            }
            if (!row.existId && row.newExist.trim() && !row.department) {
                alert(`Row ${i + 1}: Please select a department for the new product`);
                return;
            }
            if (!row.amount || !row.net_unite_price || !row.sell_price) {
                alert(`Row ${i + 1}: Amount, Net Unit Price and Sell Price are required`);
                return;
            }
        }

        const paid = parseFloat(paidAmount);
        if (isNaN(paid) || paid < 0) {
            alert("Please enter a valid paid amount (0 or positive)");
            return;
        }

        const payload = {
            seller:
                sellerMode === "existing"
                    ? { id: sellerId }
                    : { name: newSeller.trim() },
            items: rows.map((row) => {
                if (row.existId) {
                    const fullExist = exists.find((ex) => String(ex.id) === String(row.existId));
                    if (!fullExist) throw new Error(`Product with id ${row.existId} not found`);
                    return {
                        exist: fullExist,
                        type: row.type,
                        amount: parseFloat(row.amount),
                        net_unite_price: parseFloat(row.net_unite_price),
                        sell_price: parseFloat(row.sell_price),
                        expense: row.expense ? parseFloat(row.expense) : 0,
                    };
                } else {
                    return {
                        exist: {
                            name: row.newExist.trim(),
                            department: row.department,
                        },
                        type: row.type,
                        amount: parseFloat(row.amount),
                        net_unite_price: parseFloat(row.net_unite_price),
                        sell_price: parseFloat(row.sell_price),
                        expense: row.expense ? parseFloat(row.expense) : 0,
                    };
                }
            }),
            paidAmount: paid,
        };

        try {
            await axios.post(`${BASE_URL}/stockIncome`, payload);
            alert("All data saved successfully");
            setRows([
                {
                    existId: "",
                    newExist: "",
                    department: "",
                    type: "quantity",
                    amount: "",
                    net_unite_price: "",
                    sell_price: "",
                    expense: "",
                },
            ]);
            setSellerMode("existing");
            setSellerId("");
            setNewSeller("");
            setPaidAmount("");
            setCurrentPage(1);
            fetchMasterData();
            setFactorRefreshKey((prev) => prev + 1);
            if (activeTab === "stockIncome") fetchIncomes(1);
        } catch (err) {
            console.error(err);
            alert("Error saving batch data. Check console.");
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
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
                    <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
                        {/* Seller Section */}
                        <div className="px-6 py-6 sm:px-8">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">
                                Seller Information
                            </h2>
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            value="existing"
                                            checked={sellerMode === "existing"}
                                            onChange={() => setSellerMode("existing")}
                                            className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Existing Seller
                                        </span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            value="new"
                                            checked={sellerMode === "new"}
                                            onChange={() => setSellerMode("new")}
                                            className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            New Seller
                                        </span>
                                    </label>
                                </div>

                                {sellerMode === "existing" && (
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Select Seller *
                                        </label>
                                        <select
                                            value={sellerId}
                                            onChange={(e) => setSellerId(e.target.value)}
                                            required
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                        >
                                            <option value="">Select a seller</option>
                                            {sellers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.fullname}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {sellerMode === "new" && (
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Seller Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., John Smith"
                                            value={newSeller}
                                            onChange={(e) => setNewSeller(e.target.value)}
                                            required
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="px-6 py-6 sm:px-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-medium text-gray-900">
                                    Stock Items
                                </h2>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cyan-700 bg-cyan-100 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition"
                                >
                                    + Add Row
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Product
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                New Product
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Department
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Amount
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Net Unit Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Sell Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Expense
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                                Remove
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {rows.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={row.existId}
                                                        onChange={(e) => {
                                                            handleRowChange(idx, "existId", e.target.value);
                                                            if (e.target.value) {
                                                                handleRowChange(idx, "newExist", "");
                                                                handleRowChange(idx, "department", "");
                                                            }
                                                        }}
                                                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    >
                                                        <option value="">Select product</option>
                                                        {exists.map((ex) => (
                                                            <option key={ex.id} value={ex.id}>
                                                                {ex.name} ({ex.department?.name || "No department"})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Product name"
                                                        value={row.newExist}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "newExist", e.target.value)
                                                        }
                                                        disabled={!!row.existId}
                                                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:bg-gray-100 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={row.department}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "department", e.target.value)
                                                        }
                                                        disabled={!!row.existId}
                                                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:bg-gray-100 sm:text-sm"
                                                    >
                                                        <option value="">Select department</option>
                                                        {departments.map((dept) => (
                                                            <option key={dept.id} value={dept.id}>
                                                                {dept.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={row.type}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "type", e.target.value)
                                                        }
                                                        className="block w-28 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    >
                                                        <option value="quantity">Quantity</option>
                                                        <option value="length">Length</option>
                                                        <option value="weight">Weight</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Amount"
                                                        value={row.amount}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "amount", e.target.value)
                                                        }
                                                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Net unit price"
                                                        value={row.net_unite_price}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "net_unite_price", e.target.value)
                                                        }
                                                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Sell price"
                                                        value={row.sell_price}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "sell_price", e.target.value)
                                                        }
                                                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Expense"
                                                        value={row.expense}
                                                        onChange={(e) =>
                                                            handleRowChange(idx, "expense", e.target.value)
                                                        }
                                                        className="block w-28 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(idx)}
                                                        className="text-red-600 hover:text-red-800 transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payment Section */}
                        <div className="px-6 py-6 sm:px-8 bg-gray-50">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">
                                Payment to Seller
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Total Cost (calculated)</p>
                                    <p className="text-2xl font-bold text-cyan-700">
                                        {totalCost.toFixed(2)} ₮
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        (Amount × Net Unit Price) + Expense
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Paid Amount to Seller *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value)}
                                        className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Amount actually paid (can be partial)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="px-6 py-6 sm:px-8 flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition"
                            >
                                Save All Rows
                            </button>
                        </div>
                    </form>
                </div>
                {/* Tabs */}
                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("stockIncome")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${activeTab === "stockIncome"
                            ? "bg-cyan-600 text-white shadow-lg"
                            : "text-gray-600 hover:text-cyan-600 hover:bg-gray-100"
                            }`}
                    >
                        Stock Incomes
                    </button>
                    <button
                        onClick={() => setActiveTab("factors")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${activeTab === "factors"
                            ? "bg-cyan-600 text-white shadow-lg"
                            : "text-gray-600 hover:text-cyan-600 hover:bg-gray-100"
                            }`}
                    >
                        Seller Factors
                    </button>
                </div>
                {/* Stock Incomes Table Card */}
                {activeTab === "stockIncome" ? (
                    <>
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-12">
                            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-medium text-gray-900">
                                    Recent Stock Incomes
                                </h2>
                                <span className="text-sm text-gray-500">
                                    Total: {totalRecords} records
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Seller
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Product
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Net Unit Price
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Sell Price
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Expense
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {incomes.map((inc) => (
                                            <tr key={inc.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-3 text-sm text-gray-800">
                                                    {inc.seller?.fullname || inc.seller?.name}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-800">
                                                    {inc.stock?.name || `Product ID: ${inc.existId}`}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{inc.type}</td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{inc.amount}</td>
                                                <td className="px-6 py-3 text-sm text-gray-600">
                                                    {inc.net_unite_price}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{inc.sell_price}</td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{inc.expense}</td>
                                            </tr>
                                        ))}
                                        {incomes.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                                                    No income records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <FactorManager refreshKey={factorRefreshKey} />
                    </div>
                )}
            </div>
        </div>
    );
}