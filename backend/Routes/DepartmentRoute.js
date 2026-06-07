import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentsByUserHolding,
  getUserDepartmentsWithShare,
  getBenefitsByDepartmentAndDate,
  getBenefitsWithFilters,
  getDepartmentCounts,
  getDepartmentDetails
} from "../Controllers/DepartmentController.js";

const DepartmentRoute = express.Router();

// --- Create / Get all ---
DepartmentRoute.post("/", createDepartment);
DepartmentRoute.get("/", getAllDepartments);

// --- User-specific department endpoints ---
DepartmentRoute.get("/user/:userId", getDepartmentsByUserHolding);
DepartmentRoute.get("/user/:userId/share", getUserDepartmentsWithShare);

// --- Report endpoints (must come before generic /:id) ---
// Benefits for a specific department (URL param)
DepartmentRoute.get("/:departmentId/benefits", getBenefitsByDepartmentAndDate);
// Benefits with filters (departmentId optional via query, date range, pagination)
DepartmentRoute.get("/report", getBenefitsWithFilters);

// Department counts & details (specific department, URL param)
DepartmentRoute.get("/:departmentId/counts", getDepartmentCounts);
DepartmentRoute.get("/:departmentId/details", getDepartmentDetails);

// --- CRUD for single department (generic :id – must be LAST) ---
DepartmentRoute.get("/:id", getDepartmentById);
DepartmentRoute.put("/:id", updateDepartment);
DepartmentRoute.delete("/:id", deleteDepartment);

export default DepartmentRoute;