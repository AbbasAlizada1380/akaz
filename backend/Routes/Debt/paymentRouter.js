import express from "express";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentsByDebtId,
  getPaymentsByDateRange   // new controller
} from "../../Controllers/Debt/paymentController.js";

const paymentRouter = express.Router();

// Create a new payment
paymentRouter.post("/", createPayment);

// Get all payments (with optional debtId filter - paginated)
paymentRouter.get("/", getPayments);

// Get payments by date range (with optional department filter)
paymentRouter.get("/date-range", getPaymentsByDateRange);

// Get all payments for a specific debt (no pagination, full history)
paymentRouter.get("/debt/:debtId", getPaymentsByDebtId);

// Get a single payment by ID
paymentRouter.get("/:id", getPaymentById);

// Update a payment
paymentRouter.put("/:id", updatePayment);

// Delete a payment
paymentRouter.delete("/:id", deletePayment);

export default paymentRouter;