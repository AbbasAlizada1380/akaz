// routes/attendance.routes.js
import express from "express";
import {
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
} from "../../../Controllers/staff/salary/attendanceController.js";

const attendanceRoute = express.Router();
attendanceRoute.get("/", getAllAttendance);
attendanceRoute.get("/:id", getAttendanceById);
attendanceRoute.put("/:id", updateAttendance);
attendanceRoute.delete("/:id", deleteAttendance);
export default attendanceRoute;