// SellManager.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BillsList from "../BillsList";
import SellForm from "./SellForm";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
  // --- State ---
  const [customers, setCustomers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billsKey, setBillsKey] = useState(0);

  const [customerType, setCustomerType] = useState("existing");
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [items, setItems] = useState([
    {
      id: Date.now(),
      departmentId: "",
      productId: "",
      productName: "",
      amount: "",
      unitPrice: "",
      discountPercent: 0,
      discountedTotal: 0,
      total: 0,
    },
  ]);
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

  // Derived values
  const overallTotal = items.reduce((sum, item) => sum + (item.discountedTotal || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // --- Data fetching ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [customersRes, departmentsRes, productsRes] = await Promise.all([
          axios.get(`${BASE_URL}/customer/active`),
          axios.get(`${BASE_URL}/department`),
          axios.get(`${BASE_URL}/stockExist?limit=1000`),
        ]);

        setCustomers(customersRes.data.customers || customersRes.data.data || []);
        const depts = departmentsRes.data.data || departmentsRes.data.departments || departmentsRes.data;
        setDepartments(Array.isArray(depts) ? depts : []);

        let productsData = [];
        if (productsRes.data.success) {
          productsData = Array.isArray(productsRes.data.data) ? productsRes.data.data : [];
        } else {
          throw new Error(productsRes.data.message || "Failed to fetch products");
        }
        setAllProducts(productsData);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- Helpers for items ---
  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        departmentId: "",
        productId: "",
        productName: "",
        amount: "",
        unitPrice: "",
        discountPercent: 0,
        discountedTotal: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (id) => {
    if (items.length === 1) {
      setSubmitMessage({ type: "error", text: "At least one product is required" });
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        const amount = parseFloat(updated.amount) || 0;
        const unitPrice = parseFloat(updated.unitPrice) || 0;
        const discountPercent = parseFloat(updated.discountPercent) || 0;

        const rawTotal = amount * unitPrice;
        const discountAmount = rawTotal * (discountPercent / 100);
        const discountedTotal = rawTotal - discountAmount;

        updated.total = rawTotal;
        updated.discountedTotal = discountedTotal;

        if (field === "departmentId") {
          updated.productId = "";
          updated.productName = "";
          updated.amount = "";
          updated.unitPrice = "";
          updated.discountPercent = 0;
          updated.total = 0;
          updated.discountedTotal = 0;
        }

        return updated;
      })
    );
  };

  const applyGlobalDiscount = (percent) => {
    items.forEach(item => {
      updateItem(item.id, "discountPercent", percent);
    });
  };

  // --- Validation helpers ---
  const validateCustomer = () => {
    if (customerType === "existing" && !customerId) {
      setSubmitMessage({ type: "error", text: "Please select an existing customer" });
      return false;
    }
    if (customerType === "new" && (!newCustomerName || newCustomerName.trim() === "")) {
      setSubmitMessage({ type: "error", text: "Please enter the new customer's name" });
      return false;
    }
    return true;
  };

  const validateItems = () => {
    for (const item of items) {
      if (!item.departmentId) {
        setSubmitMessage({ type: "error", text: "Each item must have a department selected" });
        return false;
      }
      if (!item.productId) {
        setSubmitMessage({ type: "error", text: "Each item must have a product selected" });
        return false;
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        setSubmitMessage({ type: "error", text: "Each item must have a positive quantity" });
        return false;
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) {
        setSubmitMessage({ type: "error", text: "Each item must have a valid unit price" });
        return false;
      }
      const discount = parseFloat(item.discountPercent) || 0;
      if (discount < 0 || discount > 100) {
        setSubmitMessage({ type: "error", text: "Discount % must be between 0 and 100" });
        return false;
      }
    }
    return true;
  };

  const validateReceipt = () => {
    const receiptAmount = parseFloat(receipt) || 0;
    if (receiptAmount < 0) {
      setSubmitMessage({ type: "error", text: "Receipt cannot be negative" });
      return false;
    }
    return true;
  };

  // --- Payload builder ---
  const buildPayload = () => {
    const receiptAmount = parseFloat(receipt) || 0;
    const itemsPayload = [];
    let totalRaw = 0;
    let totalDiscountAmount = 0;

    for (const item of items) {
      const amount = parseFloat(item.amount) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discountPercent = parseFloat(item.discountPercent) || 0;
      const rawTotal = amount * unitPrice;
      const discountAmount = rawTotal * (discountPercent / 100);
      const discountedTotal = rawTotal - discountAmount;

      totalRaw += rawTotal;
      totalDiscountAmount += discountAmount;

      itemsPayload.push({
        existId: parseInt(item.productId),
        amount,
        unit_price: unitPrice,
        departmentId: parseInt(item.departmentId),
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        discounted_total: discountedTotal,
      });
    }

    // Bill-level discount: total discount amount and effective percent
    const billDiscountAmount = totalDiscountAmount;
    const billDiscountPercent = totalRaw > 0 ? (totalDiscountAmount / totalRaw) * 100 : 0;

    const payload = {
      items: itemsPayload,
      receipt: receiptAmount,
      notes: notes || null,
      billDiscountPercent: parseFloat(billDiscountPercent.toFixed(2)),
      billDiscountAmount: parseFloat(billDiscountAmount.toFixed(2)),
    };

    if (customerType === "existing") {
      payload.customerId = parseInt(customerId);
    } else {
      payload.newCustomerName = newCustomerName.trim();
    }

    return payload;
  };

  // --- Form reset after successful submission ---
  const resetForm = () => {
    setCustomerId("");
    setNewCustomerName("");
    setCustomerType("existing");
    setItems([
      {
        id: Date.now(),
        departmentId: "",
        productId: "",
        productName: "",
        amount: "",
        unitPrice: "",
        discountPercent: 0,
        discountedTotal: 0,
        total: 0,
      },
    ]);
    setReceipt("");
    setNotes("");
  };

  const refreshData = async () => {
    const refreshRes = await axios.get(`${BASE_URL}/stockExist`);
    if (refreshRes.data.success) {
      setAllProducts(refreshRes.data.data);
    }
    if (customerType === "new") {
      const customersRes = await axios.get(`${BASE_URL}/customer`);
      setCustomers(customersRes.data.customers || customersRes.data.data || []);
    }
    setBillsKey(prev => prev + 1);
  };

  // --- Main submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage({ type: "", text: "" });

    // Run validations
    if (!validateCustomer()) return;
    if (!validateItems()) return;
    if (!validateReceipt()) return;

    const payload = buildPayload();

    setSubmitting(true);
    try {
      const res = await axios.post(`${BASE_URL}/sells`, payload);
      const data = res.data;
      setSubmitMessage({
        type: "success",
        text: `Sale recorded! Bill #${data.bill.billNumber || data.bill.id} - Remaining: ${data.bill.remainingAmount}`,
      });
      resetForm();
      await refreshData();
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err.response?.data?.error || err.message || "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading and error states ---
  if (loading) return <div className="p-6 text-center text-gray-500">Loading sale data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">New Sale (Invoice)</h1>
          <p className="mt-2 text-sm text-gray-600">Create a new invoice for a customer</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <SellForm
            customerType={customerType}
            setCustomerType={setCustomerType}
            customerId={customerId}
            setCustomerId={setCustomerId}
            newCustomerName={newCustomerName}
            setNewCustomerName={setNewCustomerName}
            customers={customers}
            items={items}
            updateItem={updateItem}
            removeItem={removeItem}
            addItem={addItem}
            allProducts={allProducts}
            departments={departments}
            receipt={receipt}
            setReceipt={setReceipt}
            notes={notes}
            setNotes={setNotes}
            overallTotal={overallTotal}
            remaind={remaind}
            submitting={submitting}
            submitMessage={submitMessage}
            onSubmit={handleSubmit}
            applyGlobalDiscount={applyGlobalDiscount}
          />
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Invoices</h2>
          <BillsList key={billsKey} />
        </div>
      </div>
    </div>
  );
};

export default SellManager;