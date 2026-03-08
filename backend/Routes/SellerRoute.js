import express from "express";
import {
  createSeller,
  getAllSellers,
  getSellerById,
  updateSeller,
  deleteSeller,
  getSellersWithUnpaidStockIncome,
} from "../Controllers/Seller/SellerController.js";

const SellerRoute = express.Router();

SellerRoute.post("/", createSeller);
SellerRoute.get("/dept", getSellersWithUnpaidStockIncome);
SellerRoute.get("/", getAllSellers);
SellerRoute.get("/:id", getSellerById);
SellerRoute.put("/:id", updateSeller);
SellerRoute.delete("/:id", deleteSeller);

export default SellerRoute;