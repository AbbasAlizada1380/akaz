import StockIncome from "../../Models/Stock/StockIncome.js";
import Department from "../../Models/Department.js";
import Seller from "../../Models/Seller.js";

/* =========================
   CREATE Stock Income
========================= */
export const createStockIncome = async (req, res) => {
  try {
    const {
      name,
      type,
      quantity,
      unitPrice,
      received,
      specifications,
      departmentId,
      sellerId,
    } = req.body;

    if (!name || !departmentId || !sellerId) {
      return res.status(400).json({
        message: "Name, Department and Seller are required",
      });
    }

    const total = quantity * unitPrice;
    const remaining = total - (received || 0);

    const newIncome = await StockIncome.create({
      name,
      type,
      quantity,
      unitPrice,
      total,
      received,
      remaining,
      specifications,
      departmentId,
      sellerId,
    });

    res.status(201).json({
      message: "Stock income created successfully",
      data: newIncome,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET ALL
========================= */
export const getAllStockIncome = async (req, res) => {
  try {
    const incomes = await StockIncome.findAll({
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET BY ID
========================= */
export const getStockIncomeById = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await StockIncome.findByPk(id, {
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
    });

    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    res.json(income);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   UPDATE
========================= */
export const updateStockIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await StockIncome.findByPk(id);
    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    const {
      name,
      type,
      quantity,
      unitPrice,
      received,
      specifications,
      departmentId,
      sellerId,
    } = req.body;

    const total = quantity * unitPrice;
    const remaining = total - (received || 0);

    await income.update({
      name,
      type,
      quantity,
      unitPrice,
      total,
      received,
      remaining,
      specifications,
      departmentId,
      sellerId,
    });

    res.json({
      message: "Stock income updated successfully",
      data: income,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   DELETE
========================= */
export const deleteStockIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await StockIncome.findByPk(id);
    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    await income.destroy();

    res.json({ message: "Stock income deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};