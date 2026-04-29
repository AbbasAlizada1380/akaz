import { DepartmentTransaction, Department } from "../../Models/index.js";

// ========== CREATE ==========
export const createTransaction = async (req, res) => {
  try {
    const { depId, amount, is_deposit } = req.body;

    // Validation
    if (!depId || amount === undefined || amount === null) {
      return res.status(400).json({ message: "depId and amount are required" });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Check if department exists
    const department = await Department.findByPk(depId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const transaction = await DepartmentTransaction.create({
      depId: parseInt(depId),
      amount: parseFloat(amount),
      is_deposit: is_deposit !== undefined ? is_deposit : true,
    });

    // Return transaction with department info
    const created = await DepartmentTransaction.findByPk(transaction.id, {
      include: [{ model: Department, as: "department" }],
    });

    res.status(201).json({
      success: true,
      data: created,
      message: "Transaction created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ========== READ ALL (with pagination & filtering) ==========
export const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, depId, type } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (depId) where.depId = parseInt(depId);
    if (type === "deposit") where.is_deposit = true;
    if (type === "withdraw") where.is_deposit = false;

    const { count, rows } = await DepartmentTransaction.findAndCountAll({
      where,
      include: [{ model: Department, as: "department" }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ========== READ ONE ==========
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await DepartmentTransaction.findByPk(id, {
      include: [{ model: Department, as: "department" }],
    });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ========== UPDATE ==========
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { depId, amount, is_deposit } = req.body;

    const transaction = await DepartmentTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Validate department if changed
    if (depId && depId !== transaction.depId) {
      const department = await Department.findByPk(depId);
      if (!department) {
        return res.status(404).json({ message: "New department not found" });
      }
      transaction.depId = parseInt(depId);
    }

    if (amount !== undefined) {
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      transaction.amount = parseFloat(amount);
    }

    if (is_deposit !== undefined) {
      transaction.is_deposit = is_deposit;
    }

    await transaction.save();

    const updated = await DepartmentTransaction.findByPk(id, {
      include: [{ model: Department, as: "department" }],
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ========== DELETE ==========
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await DepartmentTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await transaction.destroy();

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};