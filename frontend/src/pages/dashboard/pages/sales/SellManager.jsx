// SellManager.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import BillsList from "../BillsList";
import SellForm from "./SellForm";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
  const [customers, setCustomers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allProducts, setAllProducts] = useState([]);   // store all products once
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billsKey, setBillsKey] = useState(0);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null); // null = All
  // Form state
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
      total: 0,
    },
  ]);
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

  const overallTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // Fetch departments and all products on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [customersRes, departmentsRes, productsRes] = await Promise.all([
          axios.get(`${BASE_URL}/customer/active`),
          axios.get(`${BASE_URL}/department`),
          axios.get(`${BASE_URL}/stockExist?limit=1000`), // fetch all products once
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

  // Items management
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        departmentId: "",
        productId: "",
        productName: "",
        amount: "",
        unitPrice: "",
        total: 0,
      },
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
        // Recalculate total if amount or unitPrice changed
        if (field === "amount" || field === "unitPrice") {
          const amount = parseFloat(updated.amount) || 0;
          const unitPrice = parseFloat(updated.unitPrice) || 0;
          updated.total = amount * unitPrice;
        }
        // If department changes, also clear product fields
        if (field === "departmentId") {
          updated.productId = "";
          updated.productName = "";
          updated.total = 0; // reset total as product is cleared
        }
        return updated;
      })
    );
  };

  // Submit handler (unchanged logic, uses items with departmentId)
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

    // Validation: each item must have department, product, amount>0, unitPrice>0
    for (const item of items) {
      if (!item.departmentId) {
        setSubmitMessage({ type: "error", text: "Each item must have a department selected" });
        return;
      }
      if (!item.productId) {
        setSubmitMessage({ type: "error", text: "Each item must have a product selected" });
        return;
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        setSubmitMessage({ type: "error", text: "Each item must have a positive quantity" });
        return;
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) {
        setSubmitMessage({ type: "error", text: "Each item must have a valid unit price" });
        return;
      }
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
        departmentId: parseInt(item.departmentId),
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
        {
          id: Date.now(),
          departmentId: "",
          productId: "",
          productName: "",
          amount: "",
          unitPrice: "",
          total: 0,
        },
      ]);
      setReceipt("");
      setNotes("");
      // Refresh products (stock amounts may have changed)
      const refreshRes = await axios.get(`${BASE_URL}/stockExist`);
      if (refreshRes.data.success) {
        setAllProducts(refreshRes.data.data);
      }
      // Refresh customers if a new one was added
      if (customerType === "new") {
        const customersRes = await axios.get(`${BASE_URL}/customer`);
        setCustomers(customersRes.data.customers || customersRes.data.data || []);
      }
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
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">New Sale (Invoice)</h1>
          <p className="mt-2 text-sm text-gray-600">Create a new invoice for a customer</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <SellForm
            // Customer
            customerType={customerType}
            setCustomerType={setCustomerType}
            customerId={customerId}
            setCustomerId={setCustomerId}
            newCustomerName={newCustomerName}
            setNewCustomerName={setNewCustomerName}
            customers={customers}
            // Items
            items={items}
            updateItem={updateItem}
            removeItem={removeItem}
            addItem={addItem}
            allProducts={allProducts}
            departments={departments}
            // Payment & notes
            receipt={receipt}
            setReceipt={setReceipt}
            notes={notes}
            setNotes={setNotes}
            // Computed
            overallTotal={overallTotal}
            remaind={remaind}
            // Submit
            submitting={submitting}
            submitMessage={submitMessage}
            onSubmit={handleSubmit}
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