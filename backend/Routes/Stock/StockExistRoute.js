import express from "express";
import {
  createStockExist,
  getAllStockExist,
  getStockExistById,
  updateStockExist,
  deleteStockExist
} from "../../Controllers/Stock/StockExistController.js";

const StockExistRoute = express.Router();

/* =========================
   Create
========================= */
StockExistRoute.post("/", createStockExist);

/* =========================
   Get All
========================= */
StockExistRoute.get("/", getAllStockExist);

/* =========================
   Get One
========================= */
StockExistRoute.get("/:id", getStockExistById);

/* =========================
   Update
========================= */
StockExistRoute.put("/:id", updateStockExist);

/* =========================
   Delete
========================= */
StockExistRoute.delete("/:id", deleteStockExist);

export default StockExistRoute;