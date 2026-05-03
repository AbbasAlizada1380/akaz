import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../pagination/Pagination.jsx";
import FactorManager from "./factorList.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function StockIncomePage() {
    const [activeTab, setActiveTab] = useState("stockIncome"); // "stockIncome" or "factors"

    const [sellers, setSellers] = useState([]);
    const [exists, setExists] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sellerMode, setSellerMode] = useState("existing");
    const [sellerId, setSellerId] = useState("");
    const [newSeller, setNewSeller] = useState("");
    const [factorRefreshKey, setFactorRefreshKey] = useState(0);

    const [rows, setRows] = useState([
        { existId: "", newExist: "", department: "", type: "quantity", amount: "", net_unite_price: "", sell_price: "", expense: "" }
    ]);

    // Payment state
    const [paidAmount, setPaidAmount] = useState("");

    // Pagination state (for stock incomes)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 20;

    // ================= COMPUTE TOTAL COST =================
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
        if (!paidAmount || paidAmount === "") {
            setPaidAmount(totalCost.toString());
        }
    }, [totalCost]);

    // ================= FETCH MASTER DATA =================
    const fetchMasterData = async () => {
        try {
            const [sRes, eRes, dRes] = await Promise.all([
                axios.get(`${BASE_URL}/seller`),
                axios.get(`${BASE_URL}/stockExist`),
                axios.get(`${BASE_URL}/department`)
            ]);
            setSellers(sRes.data.data || []);
            setExists(eRes.data.data || []);
            setDepartments(dRes.data.data || []);
        } catch (err) {
            console.error("Error fetching master data:", err);
        }
    };

    // ================= FETCH PAGINATED INCOMES =================
    const fetchIncomes = async (page = 1) => {
        try {
            const res = await axios.get(`${BASE_URL}/stockincome`, {
                params: { page, limit }
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
        if (activeTab === "stockIncome") {
            fetchIncomes(currentPage);
        }
    }, [currentPage, activeTab]);

    // ================= ROW HANDLERS =================
    const addRow = () => {
        setRows([...rows, { existId: "", newExist: "", department: "", type: "quantity", amount: "", net_unite_price: "", sell_price: "", expense: "" }]);
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
            alert("Please enter a seller name");
            return;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.existId && !row.newExist.trim()) {
                alert(`Row ${i + 1}: Please select an existing product or enter a new product name.`);
                return;
            }
            if (!row.existId && row.newExist.trim() && !row.department) {
                alert(`Row ${i + 1}: Please select a department for the new product.`);
                return;
            }
            if (!row.amount || !row.net_unite_price || !row.sell_price) {
                alert(`Row ${i + 1}: Amount, Net Unit Price and Sell Price are required.`);
                return;
            }
        }

        const paid = parseFloat(paidAmount);
        if (isNaN(paid) || paid < 0) {
            alert("Please enter a valid paid amount (0 or positive)");
            return;
        }

        const payload = {
            seller: sellerMode === "existing" ? { id: sellerId } : { name: newSeller.trim() },
            items: rows.map(row => {
                if (row.existId) {
                    const fullExist = exists.find(ex => String(ex.id) === String(row.existId));
                    if (!fullExist) throw new Error(`Exist with id ${row.existId} not found`);
                    return {
                        exist: fullExist,
                        type: row.type,
                        amount: parseFloat(row.amount),
                        net_unite_price: parseFloat(row.net_unite_price),
                        sell_price: parseFloat(row.sell_price),
                        expense: row.expense ? parseFloat(row.expense) : 0
                    };
                } else {
                    return {
                        exist: {
                            name: row.newExist.trim(),
                            department: row.department
                        },
                        type: row.type,
                        amount: parseFloat(row.amount),
                        net_unite_price: parseFloat(row.net_unite_price),
                        sell_price: parseFloat(row.sell_price),
                        expense: row.expense ? parseFloat(row.expense) : 0
                    };
                }
            }),
            paidAmount: paid
        };

        try {
            await axios.post(`${BASE_URL}/stockIncome`, payload);
            alert("All data saved successfully (batch)");
            setRows([{ existId: "", newExist: "", department: "", type: "quantity", amount: "", net_unite_price: "", sell_price: "", expense: "" }]);
            setSellerMode("existing");
            setSellerId("");
            setNewSeller("");
            setPaidAmount("");
            setCurrentPage(1);
            fetchMasterData();
            setFactorRefreshKey(prev => prev + 1);
            if (activeTab === "stockIncome") fetchIncomes(1);
        } catch (err) {
            console.error(err);
            alert("Error saving batch data. Check console.");
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                    Stock Income
                </h1>



                {/* Form and Stock Income Table (existing content) */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Seller Card (unchanged) */}
                    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Seller Information</h2>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-sm font-medium text-gray-600 mb-1">Seller Type</label>
                                <select
                                    value={sellerMode}
                                    onChange={(e) => setSellerMode(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                >
                                    <option value="existing">Existing Seller</option>
                                    <option value="new">New Seller</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[220px]">
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    {sellerMode === "existing" ? "Select Seller" : "New Seller Name"}
                                </label>
                                {sellerMode === "existing" ? (
                                    <select
                                        value={sellerId}
                                        onChange={(e) => setSellerId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="">Select Seller</option>
                                        {sellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.fullname}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Enter seller name"
                                        value={newSeller}
                                        onChange={(e) => setNewSeller(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Rows (unchanged) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-700">Stock Items</h2>
                            <button
                                type="button"
                                onClick={addRow}
                                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition flex items-center gap-1"
                            >
                                + Add Row
                            </button>
                        </div>

                        {rows.map((row, idx) => (
                            <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-3 items-end">
                                    {/* ... rows fields (same as original) ... */}
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Exist</label>
                                        <select
                                            value={row.existId}
                                            onChange={(e) => {
                                                handleRowChange(idx, "existId", e.target.value);
                                                if (e.target.value) {
                                                    handleRowChange(idx, "newExist", "");
                                                    handleRowChange(idx, "department", "");
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">Select Exist</option>
                                            {exists.map(ex => (
                                                <option key={ex.id} value={ex.id}>
                                                    {ex.name} ({ex.department?.name || "No Dept"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">New Exist</label>
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={row.newExist}
                                            onChange={(e) => handleRowChange(idx, "newExist", e.target.value)}
                                            disabled={!!row.existId}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                                        <select
                                            value={row.department}
                                            onChange={(e) => handleRowChange(idx, "department", e.target.value)}
                                            disabled={!!row.existId}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                                        >
                                            <option value="">Select Dept</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                        <select
                                            value={row.type}
                                            onChange={(e) => handleRowChange(idx, "type", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="quantity">Quantity</option>
                                            <option value="length">Length</option>
                                            <option value="weight">Weight</option>
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={row.amount}
                                            onChange={(e) => handleRowChange(idx, "amount", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Net Unit Price</label>
                                        <input
                                            type="number"
                                            placeholder="Net Unit Price"
                                            value={row.net_unite_price}
                                            onChange={(e) => handleRowChange(idx, "net_unite_price", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Sell Price</label>
                                        <input
                                            type="number"
                                            placeholder="Sell Price"
                                            value={row.sell_price}
                                            onChange={(e) => handleRowChange(idx, "sell_price", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Expense</label>
                                        <input
                                            type="number"
                                            placeholder="Expense"
                                            value={row.expense}
                                            onChange={(e) => handleRowChange(idx, "expense", e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(idx)}
                                            className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600 transition"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payment Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Payment to Seller</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (calculated)</label>
                                <div className="text-2xl font-bold text-primary">{totalCost.toFixed(2)} ₮</div>
                                <p className="text-xs text-gray-500 mt-1">Amount * Net Unit Price + Expense</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (to Seller) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Amount actually paid to the seller (can be partial)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-primary text-white px-6 py-2 rounded-md shadow-md hover:bg-primary-dark transition font-medium"
                        >
                            Submit Batch
                        </button>
                    </div>
                </form>
                {/* Tab Bar */}
                <div className="mb-6 flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("stockIncome")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${activeTab === "stockIncome"
                            ? "bg-primary text-white shadow-lg"
                            : "text-gray-600 hover:text-primary hover:bg-gray-100"
                            }`}
                    >
                        Stock Incomes
                    </button>
                    <button
                        onClick={() => setActiveTab("factors")}
                        className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg ${activeTab === "factors"
                            ? "bg-primary text-white shadow-lg"
                            : "text-gray-600 hover:text-primary hover:bg-gray-100"
                            }`}
                    >
                        Seller Factors
                    </button>
                </div>
                {activeTab === "stockIncome" ? (
                    <>
                        {/* Stock Incomes Table */}
                        <div className="mt-10 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                            <div className="flex justify-between items-center p-5 pb-2">
                                <h2 className="text-lg font-semibold text-gray-700">Recent Stock Incomes</h2>
                                <span className="text-sm text-gray-500">Total: {totalRecords} records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exist</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Unit Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {incomes.map(inc => (
                                            <tr key={inc.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-2 text-sm text-gray-800">{inc.seller?.fullname || inc.seller?.name}</td>
                                                <td className="px-4 py-2 text-sm text-gray-800">
                                                    {inc.stock?.name || `Product ID: ${inc.existId}`}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{inc.type}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{inc.amount}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{inc.net_unite_price}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{inc.sell_price}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600">{inc.expense}</td>
                                            </tr>
                                        ))}
                                        {incomes.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-8 text-center text-gray-400">No income records yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <FactorManager refreshKey={factorRefreshKey} />
                )}
            </div>
        </div>
    );
}