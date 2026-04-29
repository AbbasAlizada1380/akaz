import express from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "../../Controllers/Finance/DepartmentTransactionController.js";

const DepartmentTransactionRouter = express.Router();

DepartmentTransactionRouter.post("/", createTransaction);
DepartmentTransactionRouter.get("/", getAllTransactions);
DepartmentTransactionRouter.get("/:id", getTransactionById);
DepartmentTransactionRouter.put("/:id", updateTransaction);
DepartmentTransactionRouter.delete("/:id", deleteTransaction);

export default DepartmentTransactionRouter;