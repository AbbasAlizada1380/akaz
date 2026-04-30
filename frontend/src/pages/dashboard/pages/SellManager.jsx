// SellManager.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BillsList from "./BillsList";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
  // Data from API
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bills list refresh key
  const [billsKey, setBillsKey] = useState(0);

  // Form state
  const [customerType, setCustomerType] = useState("existing");
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [items, setItems] = useState([
    { id: Date.now(), productId: "", productName: "", amount: "", unitPrice: "", total: 0 },
  ]);
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

  const overallTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // Fetch customers and products on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [customersRes, productsRes] = await Promise.all([
          axios.get(`${BASE_URL}/customer`),
          axios.get(`${BASE_URL}/stockExist`),
        ]);
        setCustomers(customersRes.data.customers);

        let productsData = [];
        if (productsRes.data.success) {
          productsData = Array.isArray(productsRes.data.data)
            ? productsRes.data.data
            : [];
        } else {
          throw new Error(productsRes.data.message || "Failed to fetch products");
        }
        setProducts(productsData);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), productId: "", productName: "", amount: "", unitPrice: "", total: 0 },
    ]);
  };

  const removeItem = (id) => {
    if (items.length === 1) {
      setSubmitMessage({ type: "error", text: "At least one product is required" });
      return;
    }
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "amount" || field === "unitPrice") {
          const amount = parseFloat(updated.amount) || 0;
          const unitPrice = parseFloat(updated.unitPrice) || 0;
          updated.total = amount * unitPrice;
        }
        return updated;
      })
    );
  };

  const handleProductSelect = (itemId, productId) => {
    const selectedProduct = products.find((p) => p.id === parseInt(productId));
    if (selectedProduct) {
      const defaultPrice = selectedProduct.sell_price || selectedProduct.unit_price || 0;
      updateItem(itemId, "productId", productId);
      updateItem(itemId, "productName", selectedProduct.name);
      updateItem(itemId, "unitPrice", defaultPrice);
    } else {
      updateItem(itemId, "productId", productId);
      updateItem(itemId, "productName", "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage({ type: "", text: "" });

    if (customerType === "existing" && !customerId) {
      setSubmitMessage({ type: "error", text: "Please select an existing customer" });
      return;
    }
    if (customerType === "new" && (!newCustomerName || newCustomerName.trim() === "")) {
      setSubmitMessage({ type: "error", text: "Please enter the new customer's name" });
      return;
    }

    if (
      items.some(
        (item) =>
          !item.productId ||
          !item.amount ||
          parseFloat(item.amount) <= 0 ||
          !item.unitPrice ||
          parseFloat(item.unitPrice) <= 0
      )
    ) {
      setSubmitMessage({
        type: "error",
        text: "Each item must have a product, positive quantity, and unit price",
      });
      return;
    }

    const receiptAmount = parseFloat(receipt) || 0;
    if (receiptAmount < 0) {
      setSubmitMessage({ type: "error", text: "Receipt cannot be negative" });
      return;
    }

    const payload = {
      items: items.map((item) => ({
        existId: parseInt(item.productId),
        amount: parseFloat(item.amount),
        unit_price: parseFloat(item.unitPrice),
        total: item.total,
      })),
      receipt: receiptAmount,
      notes: notes || null,
    };

    if (customerType === "existing") {
      payload.customerId = parseInt(customerId);
    } else {
      payload.newCustomerName = newCustomerName.trim();
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${BASE_URL}/sells`, payload);
      const data = res.data;
      setSubmitMessage({
        type: "success",
        text: `Sale recorded! Bill #${data.bill.billNumber || data.bill.id} - Remaining: ${data.bill.remainingAmount}`,
      });
      // Reset form
      setCustomerId("");
      setNewCustomerName("");
      setCustomerType("existing");
      setItems([
        { id: Date.now(), productId: "", productName: "", amount: "", unitPrice: "", total: 0 },
      ]);
      setReceipt("");
      setNotes("");
      // Refresh products
      const refreshRes = await axios.get(`${BASE_URL}/stockExist`);
      if (refreshRes.data.success) {
        setProducts(refreshRes.data.data);
      }
      // Refresh customers if new was added
      if (customerType === "new") {
        const customersRes = await axios.get(`${BASE_URL}/customer`);
        setCustomers(customersRes.data.customers);
      }
      // Force BillsList to re‑fetch
      setBillsKey((prev) => prev + 1);
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err.response?.data?.error || err.message || "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading sale data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">New Sale (Invoice)</h1>
          <p className="mt-2 text-sm text-gray-600">Create a new invoice for a customer</p>
        </div>

        {/* Main form card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            {/* Customer section */}
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

            {/* Items table section */}
            <div className="px-6 py-6 sm:px-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Products & Quantities</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product *
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity *
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price *
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(item.id, e.target.value)}
                            required
                            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (stock: {p.amount})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="any"
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
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                            placeholder="Price"
                            required
                            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {item.total.toFixed(2)}
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
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-bold text-gray-900">
                        Total Invoice:
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{overallTotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
              >
                + Add Another Product
              </button>
            </div>

            {/* Payment & Notes section */}
            <div className="px-6 py-6 sm:px-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment & Notes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt (amount paid)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={receipt}
                      onChange={(e) => setReceipt(e.target.value)}
                      placeholder="0.00"
                      className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Remaining balance: </span>
                    <span
                      className={`text-lg font-bold ${remaind > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {remaind.toFixed(2)}
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
                className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Recording Sale..." : `Record Sale (${items.length} product(s))`}
              </button>
            </div>
          </form>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Invoices</h2>
          <BillsList key={billsKey} />
        </div>
      </div>
    </div>
  );
};

export default SellManager;