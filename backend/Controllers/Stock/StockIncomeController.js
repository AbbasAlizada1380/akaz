// controllers/stockIncomeController.js
import { Department, Seller, StockIncome } from '../../Models/Association.js';
import StockExist from "../../Models/Stock/stockExist.js";
import sequelize from "../../dbconnection.js";

export const getAllStockIncome = async (req, res) => {
  try {
    const incomes = await StockIncome.findAll({
      include: [
        {
          model: Department,
          as: "department",
          attributes: ['id', 'name', 'holding', 'isActive'] // Select only needed fields
        },
        {
          model: Seller,
          as: "seller",
          attributes: ['id', 'fullname', 'phoneNumber', 'address'] // Select only needed fields
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Transform the data if needed
    const transformedIncomes = incomes.map(income => ({
      ...income.toJSON(),
      departmentName: income.department?.name,
      sellerName: income.seller?.fullname
    }));

    res.json(transformedIncomes);
  } catch (error) {
    console.error('Error fetching stock incomes:', error);
    res.status(500).json({
      message: "Failed to fetch stock incomes",
      error: error.message
    });
  }
};

// Get single stock income with associations
export const getStockIncomeById = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await StockIncome.findByPk(id, {
      include: [
        {
          model: Department,
          as: "department"
        },
        {
          model: Seller,
          as: "seller"
        },
      ],
    });

    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    res.json(income);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



export const createStockIncome = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const income = await StockIncome.create(req.body, { transaction });

    const departmentId = income.departmentId;

    // Find StockExist record for this department
    let stockExist = await StockExist.findOne({
      where: { departmentId },
      transaction,
    });

    // If department record does not exist → create one
    if (!stockExist) {
      stockExist = await StockExist.create(
        {
          departmentId,
          allStockIds: [income.id],
          soldStockIds: [],
          remainingStockIds: [income.id],
        },
        { transaction }
      );
    } else {
      // Update existing arrays
      const allStockIds = stockExist.allStockIds || [];
      const remainingStockIds = stockExist.remainingStockIds || [];

      allStockIds.push(income.id);
      remainingStockIds.push(income.id);

      await stockExist.update(
        {
          allStockIds,
          remainingStockIds,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch created income with associations
    const newIncome = await StockIncome.findByPk(income.id, {
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
    });

    res.status(201).json(newIncome);
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Update stock income
export const updateStockIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await StockIncome.findByPk(id);

    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    await income.update(req.body);

    // Fetch updated record with associations
    const updatedIncome = await StockIncome.findByPk(id, {
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
    });

    res.json(updatedIncome);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete stock income
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
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};