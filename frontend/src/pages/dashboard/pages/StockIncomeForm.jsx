// components/StockIncomeForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const StockIncomeForm = ({ onSuccess, departments, sellers, exists }) => {
    const [sellerMode, setSellerMode] = useState("existing");
    const [sellerId, setSellerId] = useState("");
    const [newSeller, setNewSeller] = useState("");
    const [globalDepartmentId, setGlobalDepartmentId] = useState("");
    const [globalExpense, setGlobalExpense] = useState("");
    const [paidAmount, setPaidAmount] = useState("");
    const [factorMode, setFactorMode] = useState("stock"); // "stock" or "pending" - controls entire factor
    
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

    // Filter existing products based on selected global department
    const filteredExists = useMemo(() => {
        if (!globalDepartmentId) {
            return exists;
        }
        return exists.filter(ex => String(ex.departmentId) === String(globalDepartmentId));
    }, [exists, globalDepartmentId]);

    // Calculate total cost without expense
    const computeTotalCostWithoutExpense = () => {
        let total = 0;
        for (const row of rows) {
            const amount = parseFloat(row.amount) || 0;
            const netUnit = parseFloat(row.net_unite_price) || 0;
            total += amount * netUnit;
        }
        return total;
    };

    // Calculate total expense from all rows
    const computeTotalExpense = () => {
        let total = 0;
        for (const row of rows) {
            total += parseFloat(row.expense) || 0;
        }
        return total;
    };

    const totalCostWithoutExpense = computeTotalCostWithoutExpense();
    const totalExpense = computeTotalExpense();
    const totalCost = totalCostWithoutExpense + totalExpense;

    // Distribute global expense proportionally
    const distributeExpenseProportionally = (expenseAmount) => {
        const totalWithoutExpense = computeTotalCostWithoutExpense();
        
        if (totalWithoutExpense === 0 || !expenseAmount || parseFloat(expenseAmount) === 0) {
            setRows(prevRows => 
                prevRows.map(row => ({ ...row, expense: "0" }))
            );
            return;
        }

        const expenseNum = parseFloat(expenseAmount);
        const newRows = rows.map(row => {
            const rowCost = (parseFloat(row.amount) || 0) * (parseFloat(row.net_unite_price) || 0);
            const proportion = rowCost / totalWithoutExpense;
            const proportionalExpense = expenseNum * proportion;
            return { ...row, expense: proportionalExpense.toFixed(2) };
        });
        setRows(newRows);
    };

    const handleGlobalExpenseChange = (e) => {
        const value = e.target.value;
        setGlobalExpense(value);
        if (value && !isNaN(parseFloat(value))) {
            distributeExpenseProportionally(value);
        } else {
            setRows(prevRows => prevRows.map(row => ({ ...row, expense: "0" })));
        }
    };

    // Recalculate expenses when rows change
    useEffect(() => {
        if (globalExpense && !isNaN(parseFloat(globalExpense)) && parseFloat(globalExpense) > 0) {
            distributeExpenseProportionally(globalExpense);
        }
    }, [rows.length]);

    useEffect(() => {
        if (globalExpense && !isNaN(parseFloat(globalExpense)) && parseFloat(globalExpense) > 0) {
            const timer = setTimeout(() => {
                distributeExpenseProportionally(globalExpense);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [rows.map(row => row.amount + row.net_unite_price).join(',')]);

    useEffect(() => {
        if (!paidAmount || paidAmount === "") setPaidAmount(totalCost.toString());
    }, [totalCost]);

    // Sync global department to all rows that are "new product"
    useEffect(() => {
        setRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.existId) {
                    return { ...row, department: globalDepartmentId };
                }
                return row;
            })
        );
    }, [globalDepartmentId]);

    useEffect(() => {
        setRows(prevRows =>
            prevRows.map(row => {
                if (row.existId && globalDepartmentId) {
                    const productExists = filteredExists.some(ex => String(ex.id) === String(row.existId));
                    if (!productExists) {
                        return {
                            ...row,
                            existId: "",
                            newExist: "",
                            department: globalDepartmentId,
                            expense: "0"
                        };
                    }
                }
                return row;
            })
        );
    }, [globalDepartmentId, filteredExists]);

    const addRow = () => {
        setRows([
            ...rows,
            {
                existId: "",
                newExist: "",
                department: globalDepartmentId,
                type: "quantity",
                amount: "",
                net_unite_price: "",
                sell_price: "",
                expense: "0",
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

        if (field === "existId") {
            newRows[index].existId = value;
            if (value) {
                newRows[index].newExist = "";
                const selectedProduct = filteredExists.find((ex) => String(ex.id) === String(value));
                newRows[index].department = selectedProduct?.departmentId || "";
            } else {
                newRows[index].department = globalDepartmentId;
            }
        } else if (field === "expense") {
            newRows[index].expense = value;
        } else {
            newRows[index][field] = value;
        }
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
            seller: sellerMode === "existing" ? { id: sellerId } : { name: newSeller.trim() },
            mode: factorMode, // "stock" or "pending" - applies to all items
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
                        expense: parseFloat(row.expense) || 0,
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
                        expense: parseFloat(row.expense) || 0,
                    };
                }
            }),
            paidAmount: paid,
            departmentId: globalDepartmentId || null,
        };

        try {
            await axios.post(`${BASE_URL}/stockIncome`, payload);
            alert("All data saved successfully");
            // Reset form
            setRows([{
                existId: "",
                newExist: "",
                department: "",
                type: "quantity",
                amount: "",
                net_unite_price: "",
                sell_price: "",
                expense: "0",
            }]);
            setSellerMode("existing");
            setSellerId("");
            setNewSeller("");
            setPaidAmount("");
            setGlobalDepartmentId("");
            setGlobalExpense("");
            setFactorMode("stock");
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            alert("Error saving batch data. Check console.");
        }
    };

    const getDepartmentName = (deptId) => {
        const dept = departments.find((d) => String(d.id) === String(deptId));
        return dept ? dept.name : "";
    };

    return (
        <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            {/* Seller Section */}
            <div className="px-6 py-6 sm:px-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h2>
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
                            <span className="ml-2 text-sm text-gray-700">Existing Seller</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                value="new"
                                checked={sellerMode === "new"}
                                onChange={() => setSellerMode("new")}
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">New Seller</span>
                        </label>
                    </div>

                    {sellerMode === "existing" && (
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Seller *</label>
                            <select
                                value={sellerId}
                                onChange={(e) => setSellerId(e.target.value)}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                            >
                                <option value="">Select a seller</option>
                                {sellers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.fullname}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {sellerMode === "new" && (
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Seller Name *</label>
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

            {/* Factor Mode Section */}
            <div className="px-6 py-6 sm:px-8 bg-blue-50">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Factor Mode</h2>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                value="stock"
                                checked={factorMode === "stock"}
                                onChange={() => setFactorMode("stock")}
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <span className="font-medium text-green-600">Add to Stock</span>
                                <span className="text-xs text-gray-500 block">Products will be added to inventory immediately</span>
                            </span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                value="pending"
                                checked={factorMode === "pending"}
                                onChange={() => setFactorMode("pending")}
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <span className="font-medium text-yellow-600">Pending</span>
                                <span className="text-xs text-gray-500 block">Products will be stored as pending (awaiting approval)</span>
                            </span>
                        </label>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        {factorMode === "stock" ? (
                            <span className="text-green-600">✓ All items in this factor will be added to stock immediately</span>
                        ) : (
                            <span className="text-yellow-600">⏳ All items in this factor will be marked as pending and require approval</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Items Section */}
            <div className="px-6 py-6 sm:px-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Stock Items</h2>
                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-cyan-700 bg-cyan-100 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition"
                    >
                        + Add Row
                    </button>
                </div>

                {/* Global controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Global Department *
                        </label>
                        <select
                            value={globalDepartmentId}
                            onChange={(e) => setGlobalDepartmentId(e.target.value)}
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                        >
                            <option value="">Select a department</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            This department will be used for new products and filters existing products.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Global Expense (distributed proportionally)
                        </label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Enter total expense"
                            value={globalExpense}
                            onChange={handleGlobalExpenseChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Expense will be distributed based on item cost proportion.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Product</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Unit Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Remove</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((row, idx) => {
                                let departmentDisplay = "";
                                if (row.existId) {
                                    const product = filteredExists.find((ex) => String(ex.id) === String(row.existId));
                                    departmentDisplay = product?.department?.name || getDepartmentName(product?.departmentId) || "—";
                                } else {
                                    departmentDisplay = getDepartmentName(row.department) || "—";
                                }
                                return (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-center text-gray-500">
                                            {idx + 1}
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={row.existId}
                                                onChange={(e) => handleRowChange(idx, "existId", e.target.value)}
                                                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                            >
                                                <option value="">Select product</option>
                                                {filteredExists.map((ex) => (
                                                    <option key={ex.id} value={ex.id}>
                                                        {ex.name} ({ex.department?.name || getDepartmentName(ex.departmentId)})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                placeholder="Product name"
                                                value={row.newExist}
                                                onChange={(e) => handleRowChange(idx, "newExist", e.target.value)}
                                                disabled={!!row.existId}
                                                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 disabled:bg-gray-100 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded">
                                                {departmentDisplay || "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={row.type}
                                                onChange={(e) => handleRowChange(idx, "type", e.target.value)}
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
                                                onChange={(e) => handleRowChange(idx, "amount", e.target.value)}
                                                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Net unit price"
                                                value={row.net_unite_price}
                                                onChange={(e) => handleRowChange(idx, "net_unite_price", e.target.value)}
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Sell price"
                                                value={row.sell_price}
                                                onChange={(e) => handleRowChange(idx, "sell_price", e.target.value)}
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Expense"
                                                value={row.expense}
                                                onChange={(e) => handleRowChange(idx, "expense", e.target.value)}
                                                disabled={!!globalExpense && parseFloat(globalExpense) > 0}
                                                className={`block w-28 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm ${
                                                    (globalExpense && parseFloat(globalExpense) > 0) ? 'bg-gray-100' : ''
                                                }`}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Section */}
            <div className="px-6 py-6 sm:px-8 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Payment to Seller</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-700">Total Cost (without expense)</p>
                        <p className="text-2xl font-bold text-gray-700">{totalCostWithoutExpense.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">(Amount × Net Unit Price)</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">Total Expense</p>
                        <p className="text-2xl font-bold text-cyan-600">{totalExpense.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">Sum of all row expenses</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">Total Cost</p>
                        <p className="text-2xl font-bold text-cyan-700">{totalCost.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">(Cost + Expense)</p>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount to Seller *</label>
                    <input
                        type="number"
                        step="any"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Amount actually paid (can be partial)</p>
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
    );
};

export default StockIncomeForm;