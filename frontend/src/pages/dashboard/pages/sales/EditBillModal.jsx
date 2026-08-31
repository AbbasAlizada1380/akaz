import React, { useState, useEffect } from "react";
import axios from "axios";
import SellForm from "./SellForm";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const EditBillModal = ({ billId, onClose, onUpdate }) => {
  // --- Data fetching states ---
  const [customers, setCustomers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- Form states ---
  const [customerType, setCustomerType] = useState("existing");
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState(""); // not used in edit
  const [items, setItems] = useState([]);
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

  // Helper: round to nearest integer
  const toInt = (val) => Math.round(parseFloat(val) || 0);

  // Derived totals
  const overallTotal = items.reduce((sum, item) => sum + (item.discountedTotal || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // --- Fetch initial data (customers, departments, products) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [customersRes, departmentsRes, productsRes] = await Promise.all([
          axios.get(`${BASE_URL}/customer/active`),
          axios.get(`${BASE_URL}/department`),
          axios.get(`${BASE_URL}/stockExist?limit=1000`),
        ]);
        setCustomers(customersRes.data.customers || customersRes.data.data || []);
        const depts = departmentsRes.data.data || departmentsRes.data.departments || departmentsRes.data;
        setDepartments(Array.isArray(depts) ? depts : []);
        const products = productsRes.data.success ? (Array.isArray(productsRes.data.data) ? productsRes.data.data : []) : [];
        setAllProducts(products);
      } catch (err) {
        setSubmitMessage({ type: "error", text: "Failed to load required data" });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // --- Fetch bill details once data is ready ---
  useEffect(() => {
    if (loadingData || !billId) return;

    const fetchBill = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/Bill/bills/${billId}`);
        if (!res.data.success) throw new Error(res.data.message || "Failed to fetch bill");
        const { bill, sells } = res.data;

        // Set customer
        if (bill.customerId) {
          setCustomerType("existing");
          setCustomerId(bill.customerId);
        } else {
          // Fallback: treat as new customer (unlikely)
          setCustomerType("new");
          setNewCustomerName(bill.customerName || "");
        }

        setReceipt(bill.paidAmount?.toString() || "0");
        setNotes(bill.notes || "");

        // Map sells to items
        const mappedItems = sells.map((sell) => {
          const product = allProducts.find((p) => p.id === sell.existId);
          return {
            id: Date.now() + Math.random(), // temporary unique id
            departmentId: product?.departmentId || "",
            productId: sell.existId,
            productName: product?.name || "",
            amount: sell.amount,
            unitPrice: sell.unit_price,
            discountPercent: sell.discount_percent || 0,
            discountedTotal: sell.discounted_total || 0,
            total: sell.total || 0,
          };
        });
        setItems(mappedItems);
      } catch (err) {
        setSubmitMessage({ type: "error", text: err.message });
      }
    };

    fetchBill();
  }, [billId, loadingData, allProducts]);

  // --- Item management functions ---
  const addItem = () => {
    setItems((prev) => [
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
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
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
    setItems((prev) =>
      prev.map((item) => {
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
    if (totalRaw <= 0) return;
    const targetTotal = Math.max(0, totalRaw - totalDiscountAmount);
    const effectivePercent = ((totalRaw - targetTotal) / totalRaw) * 100;
    setItems((prev) =>
      prev.map((item) => {
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

  // --- Build payload for update ---
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

    const billDiscountPercent = totalRaw > 0 ? (totalDiscountAmount / totalRaw) * 100 : 0;

    const payload = {
      items: itemsPayload,
      receipt: receiptAmount,
      notes: notes || null,
      billDiscountPercent: parseFloat(billDiscountPercent.toFixed(2)),
      billDiscountAmount: totalDiscountAmount,
      customerId: parseInt(customerId),
    };

    return payload;
  };

  // --- Submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage({ type: "", text: "" });

    if (!validateCustomer()) return;
    if (!validateItems()) return;
    if (!validateReceipt()) return;

    const payload = buildPayload();

    setSubmitting(true);
    try {
      await axios.put(`${BASE_URL}/Bill/bills/${billId}`, payload);
      setSubmitMessage({ type: "success", text: "Bill updated successfully!" });
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onUpdate(); // refresh list
        onClose();
      }, 1000);
    } catch (err) {
      setSubmitMessage({
        type: "error",
        text: err.response?.data?.error || err.message || "Update failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading state ---
  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">Loading bill data...</div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Edit Bill #{billId}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

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
          applyGlobalDiscountAmount={applyGlobalDiscountAmount}
          isEdit={true} // optional prop to change button text
        />
      </div>
    </div>
  );
};

export default EditBillModal;