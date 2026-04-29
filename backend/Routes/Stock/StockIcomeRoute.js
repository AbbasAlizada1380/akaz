import express from "express";
import {
  getAllStockIncome,
  getStockIncomeById,
  updateStockIncome,
  deleteStockIncome,
  getStockIncomeByDateRange,
  createBatchStockIncome,      // <-- NEW import
} from "../../Controllers/Stock/StockIncomeController.js";

const StockIncomeRoute = express.Router();

StockIncomeRoute.post("/", createBatchStockIncome);
StockIncomeRoute.get("/", getAllStockIncome);
StockIncomeRoute.get("/date_range", getStockIncomeByDateRange);  // <-- NEW route (must be before "/:id")
StockIncomeRoute.get("/:id", getStockIncomeById);
StockIncomeRoute.put("/:id", updateStockIncome);
StockIncomeRoute.delete("/:id", deleteStockIncome);

export default StockIncomeRoute;