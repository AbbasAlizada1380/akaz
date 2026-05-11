import express from "express";
import {
  createStockExist,
  getAllStockExist,
  getStockExistById,
  updateStockExist,
  deleteStockExist,
  getStockExistByDepartmentId  // <-- import new controller
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
   Get by Department ID (must come before /:id to avoid conflict)
========================= */
StockExistRoute.get("/department/:departmentId", getStockExistByDepartmentId);

/* =========================
   Get One by ID
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