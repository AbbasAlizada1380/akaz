import express from "express";
import {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendancesByDateRange,
  getDepartmentAttendanceSummary,  // <-- new import
} from "../../Controllers/Staff/AttendenceController.js";

const AttendenceRoute = express.Router();

// Payroll summary CRUD
AttendenceRoute.post("/", createAttendance);                         // Create
AttendenceRoute.get("/", getAttendances);                            // List with filters
AttendenceRoute.get("/date-range", getAttendancesByDateRange);       // By month/year range
AttendenceRoute.get("/:id", getAttendanceById);                      // Get one
AttendenceRoute.put("/:id", updateAttendance);                       // Update
AttendenceRoute.delete("/:id", deleteAttendance);                    // Delete

// Department‑specific summary (aggregated across periods)
AttendenceRoute.get("/department/:departmentId/summary", getDepartmentAttendanceSummary);

export default AttendenceRoute;