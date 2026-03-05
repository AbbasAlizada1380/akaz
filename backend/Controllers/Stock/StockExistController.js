import StockExist from "../../Models/Stock/stockExist.js";

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
      order: [["createdAt", "DESC"]],
    });

    res.json(stocks);
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