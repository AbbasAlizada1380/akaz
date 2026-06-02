import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentsByUserHolding,
  getBenefitsByDepartmentAndDate,
  getBenefitsWithFilters,
  getDepartmentCounts,
  getDepartmentDetails            // <-- import the new controller
} from "../Controllers/DepartmentController.js";

const DepartmentRoute = express.Router();

// Create
DepartmentRoute.post("/", createDepartment);

// Get all (with optional ?active=true)
DepartmentRoute.get("/", getAllDepartments);

// Get departments by user holding (specific route, placed before /:id)
DepartmentRoute.get("/user/:userId", getDepartmentsByUserHolding);

// Get benefits for a specific department (by department ID)
DepartmentRoute.get("/:departmentId/benefits", getBenefitsByDepartmentAndDate);
DepartmentRoute.get("/report", getBenefitsWithFilters);  // supports all query params

// Get counts for withdraw, deposit, realizedBenefit, etc.
DepartmentRoute.get("/:departmentId/counts", getDepartmentCounts);

// NEW: Get detailed records (withdraws, deposits, realizedBenefits, existingStocks, pays)
DepartmentRoute.get("/:departmentId/details", getDepartmentDetails);

// Get one by ID (must be last, after all specific :departmentId routes)
DepartmentRoute.get("/:id", getDepartmentById);

// Update
DepartmentRoute.put("/:id", updateDepartment);

// Delete
DepartmentRoute.delete("/:id", deleteDepartment);

export default DepartmentRoute;