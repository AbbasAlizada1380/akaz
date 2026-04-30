import express from "express";
import {
  getAllBills,
  getBillById,
  getBillsByDateRange,
  getBillsByCustomer,
} from "../Controllers/Stock/BillController.js"; // adjust path

const BillRouter = express.Router();

BillRouter.get("/bills", getAllBills);
BillRouter.get("/bills/:id", getBillById);
BillRouter.get("/bills/date-range", getBillsByDateRange);
BillRouter.get("/customers/:customerId/bills", getBillsByCustomer);

export default BillRouter;