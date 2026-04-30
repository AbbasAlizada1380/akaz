import express from "express";
import {
    createSell,
    getAllSells,
    getSellById,
    updateSell,
    deleteSell,
    returnSell,
    getSellsByDateRange,   // <-- import the new controller
} from "../../Controllers/Stock/SellsController.js";

const SellsRoute = express.Router();

/* ===============================
   Sells Routes
================================ */

// Create
SellsRoute.post("/", createSell);
SellsRoute.post("/return", returnSell);

// Get All
SellsRoute.get("/", getAllSells);

// Get by date range (with optional customer/department filters)
SellsRoute.get("/date-range", getSellsByDateRange);

// Get By ID
SellsRoute.get("/:id", getSellById);

// Update
SellsRoute.put("/:id", updateSell);

// Delete
SellsRoute.delete("/:id", deleteSell);

export default SellsRoute;