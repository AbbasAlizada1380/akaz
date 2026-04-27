import StockExist from "../../Models/Stock/StockExist.js";
import  Department  from "../../Models/Department.js"; // adjust import based on your project

// ========== CREATE ==========
export const createStock = async (req, res) => {
  try {
    const { name, department, Amount, sell_price, unite_price } = req.body;

    // Basic validation
    if (!name || !department || Amount === undefined || !sell_price || !unite_price) {
      return res.status(400).json({ message: "All fields are required: name, department, Amount, sell_price, unite_price" });
    }

    // Check if department exists (optional but recommended)
    if (Department) {
      const deptExists = await Department.findByPk(department);
      if (!deptExists) {
        return res.status(400).json({ message: "Department not found" });
      }
    }

    const newStock = await StockExist.create({
      name,
      department,
      Amount,
      sell_price,
      unite_price,
    });

    res.status(201).json(newStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== READ ALL ==========
export const getAllStocks = async (req, res) => {
  try {
    const stocks = await StockExist.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== READ ONE ==========
export const getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await StockExist.findByPk(id);
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }
    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== UPDATE ==========
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, Amount, sell_price, unite_price } = req.body;

    const stock = await StockExist.findByPk(id);
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    // Update only fields that are provided
    if (name !== undefined) stock.name = name;
    if (department !== undefined) {
      // Optionally verify department exists
      if (Department) {
        const deptExists = await Department.findByPk(department);
        if (!deptExists) {
          return res.status(400).json({ message: "New department not found" });
        }
      }
      stock.department = department;
    }
    if (Amount !== undefined) stock.Amount = Amount;
    if (sell_price !== undefined) stock.sell_price = sell_price;
    if (unite_price !== undefined) stock.unite_price = unite_price;

    await stock.save();

    res.status(200).json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ========== DELETE ==========
export const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await StockExist.findByPk(id);
    if (!stock) {
      return res.status(404).json({ message: "Stock record not found" });
    }

    await stock.destroy();
    res.status(200).json({ message: "Stock record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};