import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentsByUserHolding,  // import new controller
} from "../Controllers/DepartmentController.js";

const DepartmentRoute = express.Router();

// Create
DepartmentRoute.post("/", createDepartment);

// Get all (with optional ?active=true)
DepartmentRoute.get("/", getAllDepartments);

// Get departments by user holding (specific route, placed before /:id)
DepartmentRoute.get("/user/:userId", getDepartmentsByUserHolding);

// Get one by ID
DepartmentRoute.get("/:id", getDepartmentById);

// Update
DepartmentRoute.put("/:id", updateDepartment);

// Delete
DepartmentRoute.delete("/:id", deleteDepartment);

export default DepartmentRoute;