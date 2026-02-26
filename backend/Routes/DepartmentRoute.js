import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../Controllers/DepartmentController.js";

const DepartmentRoute = express.Router();

// Create
DepartmentRoute.post("/", createDepartment);

// Get all (with optional ?active=true)
DepartmentRoute.get("/", getAllDepartments);

// Get one
DepartmentRoute.get("/:id", getDepartmentById);

// Update
DepartmentRoute.put("/:id", updateDepartment);

// Delete
DepartmentRoute.delete("/:id", deleteDepartment);

export default DepartmentRoute;