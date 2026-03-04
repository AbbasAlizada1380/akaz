import express from "express";
import {
    createSell,
    getAllSells,
    getSellById,
    updateSell,
    deleteSell,
} from "../../Controllers/Stock/SellsController.js";

const SellsRoute = express.Router();

/* ===============================
   Sells Routes
================================ */

// Create
SellsRoute.post("/create", createSell);

// Get All
SellsRoute.get("/", getAllSells);

// Get By ID
SellsRoute.get("/:id", getSellById);

// Update
SellsRoute.put("/:id", updateSell);

// Delete
SellsRoute.delete("/:id", deleteSell);

export default SellsRoute;