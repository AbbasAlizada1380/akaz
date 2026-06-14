import express from "express";
import {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  deleteDebt
} from "../../Controllers/Debt/DebtController.js";

const debtRouter = express.Router();

// Create a new debt
debtRouter.post("/", createDebt);

// Get all debts (with optional filters: departmentId, isActive, startDate, endDate, page, limit)
debtRouter.get("/", getDebts);

// Get a single debt by ID
debtRouter.get("/:id", getDebtById);

// Update a debt
debtRouter.put("/:id", updateDebt);

// Delete a debt
debtRouter.delete("/:id", deleteDebt);

export default debtRouter;