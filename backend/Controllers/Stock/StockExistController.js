import StockExist from "../../Models/Stock/StockExist.js";
import Department from "../../Models/Department.js";
import { Op } from "sequelize";
/* =========================
   Create StockExist
========================= */
export const createStockExist = async (req, res) => {
  try {
    const { name, departmentId, amount, sell_price, unit_price } = req.body;

    const stockExist = await StockExist.create({
      name,
      departmentId,
      amount,
      sell_price,
      unit_price,
    });

    res.status(201).json(stockExist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   Get All StockExist
========================= */
export const getAllStockExist = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await StockExist.findAndCountAll({
      include: [
        {
          model: Department,
          as: "stockExistDepartment", // Changed from "department" to "stockExistDepartment"
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   Get One StockExist
========================= */
export const getStockExistById = async (req, res) => {
  try {
    const stock = await StockExist.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!stock) {
      return res.status(404).json({ message: "StockExist not found" });
    }

    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   Update StockExist
========================= */
export const updateStockExist = async (req, res) => {
  try {
    const stock = await StockExist.findByPk(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: "StockExist not found" });
    }

    const { name, departmentId, amount, sell_price, unit_price } = req.body;

    await stock.update({
      name,
      departmentId,
      amount,
      sell_price,
      unit_price,
    });

    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   Delete StockExist
========================= */
export const deleteStockExist = async (req, res) => {
  try {
    const stock = await StockExist.findByPk(req.params.id);

    if (!stock) {
      return res.status(404).json({ message: "StockExist not found" });
    }

    await stock.destroy();

    res.json({ message: "StockExist deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   Get StockExist by Department ID
========================= */
export const getStockExistByDepartmentId = async (req, res) => {
  try {
    const { departmentId } = req.params; // or req.query, adjust based on your route

    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }

    const stockExists = await StockExist.findAll({
      where: { departmentId },
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: stockExists.length,
      data: stockExists,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};