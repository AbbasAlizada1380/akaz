import express from "express";
import {
  createNonStaff,
  getNonStaffs,
  getNonStaffById,
  updateNonStaff,
  deleteNonStaff
} from "../../Controllers/Debt/NonStaffController.js";

const nonstaffRouter = express.Router();

// Create a new non‑staff debtor
nonstaffRouter.post("/", createNonStaff);

// Get all non‑staff debtors (with optional search)
nonstaffRouter.get("/", getNonStaffs);

// Get a single non‑staff debtor by ID
nonstaffRouter.get("/:id", getNonStaffById);

// Update a non‑staff debtor
nonstaffRouter.put("/:id", updateNonStaff);

// Delete a non‑staff debtor
nonstaffRouter.delete("/:id", deleteNonStaff);

export default nonstaffRouter;