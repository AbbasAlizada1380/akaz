import express from "express";
import {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
} from "../Controllers/MemberController.js";

const MemberRoute = express.Router();

// Create
MemberRoute.post("/", createMember);

// Get All
MemberRoute.get("/", getAllMembers);

// Get One
MemberRoute.get("/:id", getMemberById);

// Update
MemberRoute.put("/:id", updateMember);

// Delete
MemberRoute.delete("/:id", deleteMember);

export default MemberRoute;