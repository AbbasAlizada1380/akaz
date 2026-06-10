// In your ExpenseRoute.js
import express from "express";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByDateRange,
  getExpensesByMonth,  // Add this
  getDepartmentExpenseSummary,
  bulkUpdateCalculated,
} from "../Controllers/ExpenseController.js";

const ExpenseRoute = express.Router();

// Create a new expense
ExpenseRoute.post("/", createExpense);

// Get all expenses (with optional pagination and filtering)
ExpenseRoute.get("/", getExpenses);

// Get expenses by date range (supports both from/to and startDate/endDate)
ExpenseRoute.get("/date-range", getExpensesByDateRange);

// Get expenses by month
ExpenseRoute.get("/by-month", getExpensesByMonth);  // Add this

// Get department expense summary
ExpenseRoute.get("/department/:departmentId/summary", getDepartmentExpenseSummary);

// Bulk update calculated status
ExpenseRoute.patch("/bulk-update", bulkUpdateCalculated);

// Get a single expense by ID (must be after specific routes to avoid conflicts)
ExpenseRoute.get("/:id", getExpenseById);

// Update an expense
ExpenseRoute.put("/:id", updateExpense);

// Delete an expense
ExpenseRoute.delete("/:id", deleteExpense);

export default ExpenseRoute;