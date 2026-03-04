// controllers/stockIncomeController.js
import { Department, Seller, StockIncome } from '../../Models/Association.js';

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

// Create stock income
export const createStockIncome = async (req, res) => {
  try {
    const income = await StockIncome.create(req.body);
    
    // Fetch the created record with associations
    const newIncome = await StockIncome.findByPk(income.id, {
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
    });

    res.status(201).json(newIncome);
  } catch (error) {
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