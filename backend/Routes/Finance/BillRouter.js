import express from "express";
import {
  getAllBills,
  getBillById,
  getBillsByDateRange,
  getBillsByCustomer,
  updateBill,          // ✅ added import for update
} from "../../Controllers/Finance/BillController.js";

const BillRouter = express.Router();

// GET routes
BillRouter.get("/bills", getAllBills);
BillRouter.get("/bills/:id", getBillById);
BillRouter.get("/bills/date-range", getBillsByDateRange);
BillRouter.get("/customers/:customerId/bills", getBillsByCustomer);

// PUT route – update an existing bill
BillRouter.put("/bills/:id", updateBill);

export default BillRouter;