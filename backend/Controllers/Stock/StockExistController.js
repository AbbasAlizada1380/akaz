import StockExist from "../../Models/Stock/StockExist.js";
import Department from "../../Models/Department.js";
/* =========================
   Create StockExist
========================= */
export const createStockExist = async (req, res) => {
  try {
    const stockExist = await StockExist.create(req.body);
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
    const stocks = await StockExist.findAll({
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"], // فقط فیلدهای مهم
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(stocks);
  } catch (error) {
    console.error("Error fetching stock exist:", error);
    res.status(500).json({
      message: "Failed to fetch stock exist",
      error: error.message,
    });
  }
};


/* =========================
   Get One StockExist
========================= */
export const getStockExistById = async (req, res) => {
  try {
    const stock = await StockExist.findByPk(req.params.id);

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

    await stock.update(req.body);

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