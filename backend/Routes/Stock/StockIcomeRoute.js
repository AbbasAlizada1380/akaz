import express from "express";
import {
  getAllStockIncome,
  getStockIncomeById,
  updateStockIncome,
  deleteStockIncome,
  getStockIncomeByDateRange,
  createBatchStockIncome,
  approvePendingFactor,      // <-- NEW
  rejectPendingFactor,       // <-- NEW
  getPendingFactors,         // <-- NEW
} from "../../Controllers/Stock/StockIncomeController.js";

const StockIncomeRoute = express.Router();

// ==============================
// STOCK INCOME CRUD OPERATIONS
// ==============================

// Create batch stock income (with factor)
StockIncomeRoute.post("/", createBatchStockIncome);

// Get all stock incomes (with pagination)
StockIncomeRoute.get("/", getAllStockIncome);

// Get stock incomes by date range (MUST be before "/:id")
StockIncomeRoute.get("/date_range", getStockIncomeByDateRange);

// Get single stock income by ID
StockIncomeRoute.get("/:id", getStockIncomeById);

// Update stock income
StockIncomeRoute.put("/:id", updateStockIncome);

// Delete stock income
StockIncomeRoute.delete("/:id", deleteStockIncome);

// ==============================
// PENDING FACTOR MANAGEMENT
// ==============================

// Get all pending factors
StockIncomeRoute.get("/pending/factors", getPendingFactors);

// Approve a pending factor (add to stock)
StockIncomeRoute.post("/factor/:factorId/approve", approvePendingFactor);

// Reject a pending factor (delete records)
StockIncomeRoute.post("/factor/:factorId/reject", rejectPendingFactor);

export default StockIncomeRoute;  