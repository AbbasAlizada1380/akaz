import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentsByUserHolding,
  getBenefitsByDepartmentId
} from "../Controllers/DepartmentController.js";

const DepartmentRoute = express.Router();

// Create
DepartmentRoute.post("/", createDepartment);

// Get all (with optional ?active=true)
DepartmentRoute.get("/", getAllDepartments);

// Get departments by user holding (specific route, placed before /:id)
DepartmentRoute.get("/user/:userId", getDepartmentsByUserHolding);

// Get benefits for a specific department (by department ID)
DepartmentRoute.get("/:departmentId/benefits", getBenefitsByDepartmentId);

// Get one by ID
DepartmentRoute.get("/:id", getDepartmentById);

// Update
DepartmentRoute.put("/:id", updateDepartment);

// Delete
DepartmentRoute.delete("/:id", deleteDepartment);

export default DepartmentRoute;