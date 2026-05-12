// SellManager.jsx (integer money version)
import React, { useState, useEffect } from "react";
import axios from "axios";
import BillsList from "../BillsList";
import SellForm from "./SellForm";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const SellManager = () => {
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

  // overallTotal is the sum of discountedTotal (all integers)
  const overallTotal = items.reduce((sum, item) => sum + (item.discountedTotal || 0), 0);
  const remaind = receipt ? overallTotal - parseFloat(receipt) : overallTotal;

  // Helper: round to nearest integer
  const toInt = (val) => Math.round(parseFloat(val) || 0);



  // Core update function: all monetary values are integers
  const updateItem = (id, field, value) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "departmentId") {
          updated.productId = "";
          updated.productName = "";
          updated.amount = "";
          updated.unitPrice = "";
          updated.discountPercent = 0;
          updated.total = 0;
          updated.discountedTotal = 0;
          return updated;
        }

        const amount = parseFloat(updated.amount) || 0;
        const unitPrice = toInt(updated.unitPrice);
        const discountPercent = parseFloat(updated.discountPercent) || 0;

        const rawTotal = amount * unitPrice;               // integer
        const discountAmount = Math.round(rawTotal * (discountPercent / 100));
        const discountedTotal = rawTotal - discountAmount; // integer

        updated.total = rawTotal;
        updated.discountedTotal = discountedTotal;

        return updated;
      })
    );
  };






  // ... remaind, loading, error, and return (same as before)
  // Pass applyGlobalDiscount and applyGlobalDiscountAmount to SellForm
};