import StockExist from "../../Models/Stock/StockExist.js";
import Department from "../../Models/Department.js";

import StockIncome from "../../Models/Stock/StockIncome.js";

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

export const getAllStockExist = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch paginated StockExist records with department include
    const { count, rows } = await StockExist.findAndCountAll({
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    // For each StockExist, fetch its associated StockIncome records
    const result = [];
    for (const stock of rows) {
      const allStockIds = stock.allStockIds || [];

      const stockIncomes = await StockIncome.findAll({
        where: {
          id: allStockIds,
        },
      });

      result.push({
        ...stock.toJSON(),
        stockIncomes,
      });
    }

    // Pagination metadata
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: result,
      pagination: {
        totalItems: count,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
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