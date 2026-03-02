import express from "express";
import {
  createStockIncome,
  getAllStockIncome,
  getStockIncomeById,
  updateStockIncome,
  deleteStockIncome,
} from "../../Controllers/Stock/StockIncomeController.js";

const StockIncomeRoute = express.Router();

StockIncomeRoute.post("/", createStockIncome);
StockIncomeRoute.get("/", getAllStockIncome);
StockIncomeRoute.get("/:id", getStockIncomeById);
StockIncomeRoute.put("/:id", updateStockIncome);
StockIncomeRoute.delete("/:id", deleteStockIncome);

export default StockIncomeRoute;