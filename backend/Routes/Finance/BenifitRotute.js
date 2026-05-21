import express from "express";
import {
  createBenefit,
  getAllBenefits,
  getBenefitById,
  updateBenefit,
  deleteBenefit,
} from "../../Controllers/Finance/BenifitController.js"; // adjust path as needed

const BenifitRoute = express.Router();

BenifitRoute.post("/", createBenefit);          // POST /api/benefits
BenifitRoute.get("/", getAllBenefits);          // GET  /api/benefits
BenifitRoute.get("/:id", getBenefitById);       // GET  /api/benefits/:id
BenifitRoute.put("/:id", updateBenefit);        // PUT  /api/benefits/:id
BenifitRoute.delete("/:id", deleteBenefit);     // DELETE /api/benefits/:id

export default BenifitRoute;