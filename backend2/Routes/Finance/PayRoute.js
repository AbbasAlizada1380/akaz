import express from "express";
import {
  createPay,
  getAllPays,
  getSinglePay,
  updatePay,
  deletePay,
  getPaysByDateRange   // <-- NEW import
} from "../../Controllers/Finance/PayController.js";

const PayRoute = express.Router();

PayRoute.post("/", createPay);
PayRoute.get("/", getAllPays);
PayRoute.get("/date-range", getPaysByDateRange);   // <-- NEW route (must come before "/:id")
PayRoute.get("/:id", getSinglePay);
PayRoute.put("/:id", updatePay);
PayRoute.delete("/:id", deletePay);

export default PayRoute;