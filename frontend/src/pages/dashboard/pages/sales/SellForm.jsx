// SellForm.jsx
import React, { useState, useEffect } from "react";

const SellForm = ({
    // Customer section
    customerType,
    setCustomerType,
    customerId,
    setCustomerId,
    newCustomerName,
    setNewCustomerName,
    customers,

    // Items section
    items,
    updateItem,
    removeItem,
    addItem,
    allProducts,
    departments,
    applyGlobalDiscount,
    applyGlobalDiscountAmount,

    // Payment & notes
    receipt,
    setReceipt,
    notes,
    setNotes,

    // Computed values
    overallTotal,
    remaind,

    // Submit state
    submitting,
    submitMessage,
    onSubmit,
}) => {
    const [globalDiscountPercent, setGlobalDiscountPercent] = useState("");
    const [globalDiscountAmount, setGlobalDiscountAmount] = useState("");

    // Reset global discount inputs when submission succeeds
    useEffect(() => {
        if (submitMessage.type === "success") {
            setGlobalDiscountPercent("");
            setGlobalDiscountAmount("");
        }
    }, [submitMessage.type]);

    const getFilteredProducts = (departmentId) => {
        if (!departmentId) return allProducts;
        return allProducts.filter(p => p.departmentId === departmentId);
    };

    // Helper to round any number to integer
    const toInt = (val) => Math.round(parseFloat(val) || 0);

    return (
        <form onSubmit={onSubmit} className="divide-y divide-gray-200">
            {/* Customer section (unchanged) */}
            <div className="px-6 py-6 sm:px-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-4">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                value="existing"
                                checked={customerType === "existing"}
                                onChange={() => setCustomerType("existing")}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Existing Customer</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                value="new"
                                checked={customerType === "new"}
                                onChange={() => setCustomerType("new")}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">New Customer</span>
                        </label>
                    </div>

                    {customerType === "existing" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Customer *
                            </label>
                            <select
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                required
                                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="">Select a customer</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.fullname || c.name} (ID: {c.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {customerType === "new" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Customer Name *
                            </label>
                            <input
                                type="text"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="e.g., John Doe"
                                required
                                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Items table with discount (integer money) */}
            <div className="px-6 py-6 sm:px-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Products & Quantities</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department *
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product *
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity *
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Unit Price (integer) *
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Discount %
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subtotal (integer)
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => {
                                const filteredProducts = getFilteredProducts(item.departmentId);
                                // All monetary values are integers (rounded)
                                const amount = parseFloat(item.amount) || 0;
                                const unitPrice = toInt(item.unitPrice);
                                const rawTotal = amount * unitPrice;
                                const discountPercent = parseFloat(item.discountPercent) || 0;
                                const discountAmountInt = Math.round(rawTotal * (discountPercent / 100));
                                const discountedTotalInt = rawTotal - discountAmountInt;
                                return (
                                    <tr key={item.id}>
                                        {/* Department selector */}
                                        <td className="px-4 py-2">
                                            <select
                                                value={item.departmentId || ""}
                                                onChange={(e) => {
                                                    const newDeptId = e.target.value ? parseInt(e.target.value) : null;
                                                    updateItem(item.id, "departmentId", newDeptId);
                                                    updateItem(item.id, "productId", "");
                                                    updateItem(item.id, "productName", "");
                                                }}
                                                required
                                                className="block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            >
                                                <option value="">Select department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* Product selector */}
                                        <td className="px-4 py-2">
                                            <select
                                                value={item.productId}
                                                onChange={(e) => {
                                                    const selectedProduct = filteredProducts.find(p => p.id === parseInt(e.target.value));
                                                    if (selectedProduct) {
                                                        updateItem(item.id, "productId", selectedProduct.id);
                                                        updateItem(item.id, "productName", selectedProduct.name);
                                                        const defaultPrice = selectedProduct.sell_price || selectedProduct.unit_price || 0;
                                                        updateItem(item.id, "unitPrice", toInt(defaultPrice)); // stored as integer
                                                    } else {
                                                        updateItem(item.id, "productId", "");
                                                        updateItem(item.id, "productName", "");
                                                    }
                                                }}
                                                required
                                                disabled={!item.departmentId}
                                                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                                            >
                                                <option value="">{item.departmentId ? "Select product" : "First choose department"}</option>
                                                {filteredProducts.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} (stock: {p.amount})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="1"
                                                value={item.amount}
                                                onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                                                placeholder="Qty"
                                                required
                                                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="1"
                                                value={item.sell_price}
                                                onChange={(e) => updateItem(item.id, "sell_price", toInt(e.target.value))}
                                                placeholder="Price (int)"
                                                required
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                max="100"
                                                value={item.discountPercent || 0}
                                                onChange={(e) => updateItem(item.id, "discountPercent", e.target.value)}
                                                placeholder="0"
                                                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-medium text-gray-900">
                                            {discountedTotalInt}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-600 hover:text-red-800 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan="5" className="px-4 py-3 text-right font-bold text-gray-900">
                                    Total Invoice (after discount):
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-900">{overallTotal}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                >
                    + Add Another Product
                </button>
            </div>

            {/* Payment & Notes section */}
            <div className="px-6 py-6 sm:px-8">
                {/* Global Discount Section */}
                <div className="px-6 py-4 sm:px-8 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-wrap gap-6">
                        {/* Percentage discount */}
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="text-sm font-medium text-gray-700">
                                Global Discount %:
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={globalDiscountPercent}
                                onChange={(e) => setGlobalDiscountPercent(e.target.value)}
                                className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const percent = parseFloat(globalDiscountPercent);
                                    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                                        applyGlobalDiscount(percent);
                                    }
                                }}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                                Apply % Discount
                            </button>
                        </div>

                        {/* Amount discount (integer) */}
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="text-sm font-medium text-gray-700">
                                Global Discount Amount (integer currency):
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={globalDiscountAmount}
                                onChange={(e) => setGlobalDiscountAmount(e.target.value)}
                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const amount = parseInt(globalDiscountAmount, 10);
                                    if (!isNaN(amount) && amount >= 0) {
                                        applyGlobalDiscountAmount(amount);
                                    }
                                }}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                            >
                                Apply Amount Discount
                            </button>
                        </div>
                    </div>
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-4">Payment & Notes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Receipt (amount paid, integer)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={receipt}
                                onChange={(e) => setReceipt(e.target.value)}
                                placeholder="0"
                                className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Remaining balance: </span>
                            <span className={`text-lg font-bold ${remaind > 0 ? "text-red-600" : "text-green-600"}`}>
                                {remaind}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="Additional info..."
                        />
                    </div>
                </div>
            </div>

            {/* Submit section */}
            <div className="px-6 py-6 sm:px-8 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                {submitMessage.text && (
                    <div
                        className={`flex-1 p-3 rounded-md text-sm ${
                            submitMessage.type === "error"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                    >
                        {submitMessage.text}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? "Recording Sale..." : `Record Sale (${items.length} product(s))`}
                </button>
            </div>
        </form>
    );
};

export default SellForm;