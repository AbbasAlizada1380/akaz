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
      discountPercent: 0,
      discountedTotal: 0,
      total: 0,
    },
  ]);
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);

  // Helper
  const toInt = (val) => Math.round(parseFloat(val) || 0);

  // Derived totals
  const overallTotal = items.reduce((sum, item) => sum + (item.discountedTotal || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // --- Load bill for editing ---
  const loadBillForEdit = async (billId) => {
    setSubmitting(false);
    setSubmitMessage({ type: "", text: "" });
    try {
      const res = await axios.get(`${BASE_URL}/Bill/bills/${billId}`);
      if (!res.data.success) throw new Error("Failed to load bill");
      const { bill, sells } = res.data;

      // Customer
      setCustomerType("existing");
      setCustomerId(bill.customerId?.toString() || "");

      // Receipt and notes
      setReceipt(bill.paidAmount?.toString() || "0");
      setNotes(bill.notes || "");

      // Map sells – ensure numeric types for dropdowns
      const mappedItems = sells.map((sell, index) => ({
        id: Date.now() + index,
        departmentId: sell.departmentId != null ? Number(sell.departmentId) : null,
        productId: sell.exist != null ? Number(sell.exist) : null,
        productName: allProducts.find(p => p.id === Number(sell.exist))?.name || sell.sellStockExist?.name || "",
        amount: sell.amount,
        unitPrice: parseFloat(sell.unit_price),
        discountPercent: parseFloat(sell.discount_percent) || 0,
        total: parseFloat(sell.amount) * parseFloat(sell.unit_price),
        discountedTotal: parseFloat(sell.total) || 0,
      }));

      setItems(mappedItems.length ? mappedItems : [{
        id: Date.now(),
        departmentId: null,
        productId: null,
        productName: "",
        amount: "",
        unitPrice: "",
        discountPercent: 0,
        discountedTotal: 0,
        total: 0,
      }]);

      setEditingBillId(billId);
      setIsEditMode(true);
    } catch (err) {
      setSubmitMessage({ type: "error", text: err.message });
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingBillId(null);
    resetForm();
    setSubmitMessage({ type: "", text: "" });
  };

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

  // --- Item management ---
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
        const unitPrice = toInt(updated.unitPrice);
        const discountPercent = parseFloat(updated.discountPercent) || 0;

        const rawTotal = amount * unitPrice;
        const discountAmount = Math.round(rawTotal * (discountPercent / 100));
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
    setItems(prev =>
      prev.map(item => {
        const amount = parseFloat(item.amount) || 0;
        const unitPrice = toInt(item.unitPrice);
        const rawTotal = amount * unitPrice;
        const discountAmount = Math.round(rawTotal * (percent / 100));
        const discountedTotal = rawTotal - discountAmount;
        return {
          ...item,
          discountPercent: percent,
          total: rawTotal,
          discountedTotal: discountedTotal,
        };
      })
    );
  };

  const applyGlobalDiscountAmount = (totalDiscountAmount) => {
    const totalRaw = items.reduce((sum, item) => sum + (parseFloat(item.amount) * toInt(item.unitPrice) || 0), 0);
    // ALLOW NEGATIVE: We remove the totalRaw <= 0 restriction and Math.max(0, ...)
    if (totalRaw === 0) return; 
    
    const targetTotal = totalRaw - totalDiscountAmount;
    const effectivePercent = ((totalRaw - targetTotal) / totalRaw) * 100;
    
    setItems(prev =>
      prev.map(item => {
        const amount = parseFloat(item.amount) || 0;
        const unitPrice = toInt(item.unitPrice);
        const rawTotal = amount * unitPrice;
        const discountAmount = Math.round(rawTotal * (effectivePercent / 100));
        const discountedTotal = rawTotal - discountAmount;
        return {
          ...item,
          discountPercent: effectivePercent,
          total: rawTotal,
          discountedTotal: discountedTotal,
        };
      })
    );
  };

  // --- Validation ---
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
      // ALLOW NEGATIVE: Removed the <= 0 checks
      if (item.amount === "" || isNaN(parseFloat(item.amount))) {
        setSubmitMessage({ type: "error", text: "Each item must have a valid quantity" });
        return false;
      }
      if (item.unitPrice === "" || isNaN(parseFloat(item.unitPrice))) {
        setSubmitMessage({ type: "error", text: "Each item must have a valid unit price" });
        return false;
      }
      
      const discount = parseFloat(item.discountPercent) || 0;
      // ALLOW NEGATIVE: Changed bounds check from < 0 or > 100 to just disallow > 100 if you still want to prevent massive markdowns, 
      // but since negative makes it a markup, we'll just check for valid number. (I'll allow anything).
      if (isNaN(discount)) {
        setSubmitMessage({ type: "error", text: "Discount % must be a valid number" });
        return false;
      }
    }
    return true;
  };

  const validateReceipt = () => {
    const receiptAmount = parseFloat(receipt) || 0;
    // ALLOW NEGATIVE: Removed the < 0 check
    if (isNaN(receiptAmount)) {
      setSubmitMessage({ type: "error", text: "Receipt must be a valid number" });
      return false;
    }
    return true;
  };

  // --- Build payload (create & update) ---
  const buildPayload = () => {
    const receiptAmount = toInt(receipt);
    const itemsPayload = [];
    let totalRaw = 0;
    let totalDiscountAmount = 0;

    for (const item of items) {
      const amount = parseFloat(item.amount) || 0;
      const unitPrice = toInt(item.unitPrice);
      const discountPercent = parseFloat(item.discountPercent) || 0;
      const rawTotal = amount * unitPrice;
      const discountAmount = Math.round(rawTotal * (discountPercent / 100));
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

    const billDiscountAmount = totalDiscountAmount;
    const billDiscountPercent = totalRaw > 0 ? (totalDiscountAmount / totalRaw) * 100 : 0;

    const payload = {
      items: itemsPayload,
      receipt: receiptAmount,
      notes: notes || null,
      billDiscountPercent: parseFloat(billDiscountPercent.toFixed(2)),
      billDiscountAmount: billDiscountAmount,
    };

    if (customerType === "existing") {
      payload.customerId = parseInt(customerId);
    } else {
      payload.newCustomerName = newCustomerName.trim();
    }

    return payload;
  };

  // --- Reset form ---
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

  // --- Refresh data ---
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

  // --- Submit handler (POST for create, PUT for update) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage({ type: "", text: "" });

    if (!validateCustomer()) return;
    if (!validateItems()) return;
    if (!validateReceipt()) return;

    const payload = buildPayload();

    setSubmitting(true);
    try {
      let res;
      if (isEditMode && editingBillId) {
        // UPDATE
        res = await axios.put(`${BASE_URL}/Bill/bills/${editingBillId}`, payload);
        setSubmitMessage({
          type: "success",
          text: `Bill #${editingBillId} updated successfully!`,
        });
      } else {
        // CREATE
        res = await axios.post(`${BASE_URL}/sells`, payload);
        const data = res.data;
        setSubmitMessage({
          type: "success",
          text: `Sale recorded! Bill #${data.bill.billNumber || data.bill.id} - Remaining: ${data.bill.remainingAmount}`,
        });
      }
      resetForm();
      setIsEditMode(false);
      setEditingBillId(null);
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

  // --- Loading & error ---
  if (loading) return <div className="p-6 text-center text-gray-500">Loading sale data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {isEditMode ? "Edit Invoice" : "New Sale (Invoice)"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEditMode ? `Editing Bill #${editingBillId}` : "Create a new invoice for a customer"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <SellForm
            key={isEditMode ? `edit-${editingBillId}` : 'create'}
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
            applyGlobalDiscountAmount={applyGlobalDiscountAmount}
            isEditMode={isEditMode}
            onCancelEdit={cancelEdit}
          />
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isEditMode ? "All Invoices (editing mode)" : "Recent Invoices"}
          </h2>
          <BillsList key={billsKey} onEditBill={loadBillForEdit} />
        </div>
      </div>
    </div>
  );
};

export default SellManager;