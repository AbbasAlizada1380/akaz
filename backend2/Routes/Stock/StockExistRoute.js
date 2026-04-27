import express from "express";
import {
   createStock,
   getAllStocks,
   getStockById,
   updateStock,
   deleteStock,
} from "../../Controllers/Stock/StockExistController.js"; // adjust path as needed

const stockexistRouter = express.Router();

stockexistRouter.post("/", createStock);
stockexistRouter.get("/", getAllStocks);
stockexistRouter.get("/:id", getStockById);
stockexistRouter.put("/:id", updateStock);
stockexistRouter.delete("/:id", deleteStock);

export default stockexistRouter;