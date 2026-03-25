import express from "express";
import {
  createSeller,
  getAllSellers,
  getSellerById,
  updateSeller,
  deleteSeller,
  getSellersWithUnpaidStockIncome,
} from "../../Controllers/Seller/SellerController.js";
import { toggleSellerStatus } from "../../Controllers/Stock/StockIncomeController.js";

const SellerRoute = express.Router();

SellerRoute.post("/", createSeller);
SellerRoute.get("/dept", getSellersWithUnpaidStockIncome);
SellerRoute.get("/", getAllSellers);
SellerRoute.get("/:id", getSellerById);
SellerRoute.put("/:id", updateSeller);
SellerRoute.delete("/:id", deleteSeller);
SellerRoute.patch("/:id/toggle-status", toggleSellerStatus);

export default SellerRoute;