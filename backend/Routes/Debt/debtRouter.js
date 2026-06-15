import express from "express";
import {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  deleteDebt,
  getDebtReport   // new controller
} from "../../Controllers/Debt/DebtController.js";

const debtRouter = express.Router();

// Create a new debt
debtRouter.post("/", createDebt);

// Get all debts (with optional filters: departmentId, isActive, startDate, endDate, page, limit)
debtRouter.get("/", getDebts);

// Get debt report (optional departmentId, startDate, endDate, pagination)
debtRouter.get("/report", getDebtReport);   // placed BEFORE /:id to avoid conflict

// Get a single debt by ID
debtRouter.get("/:id", getDebtById);

// Update a debt
debtRouter.put("/:id", updateDebt);

// Delete a debt
debtRouter.delete("/:id", deleteDebt);

export default debtRouter;