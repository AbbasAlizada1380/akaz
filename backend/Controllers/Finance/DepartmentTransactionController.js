import { DepartmentTransaction, Department, sequelize } from "../../Models/index.js";

const updateDepartmentHolding = async (depId, userId, changeAmount, transaction) => {
  const department = await Department.findByPk(depId, { transaction });
  if (!department) throw new Error("Department not found");

  let holding = department.holding;
  if (!holding) holding = {};
  if (typeof holding === "string") {
    try { holding = JSON.parse(holding); } catch (e) { holding = {}; }
  }
  if (Array.isArray(holding)) throw new Error("Holding must be an object");

  const userIdStr = String(userId);
  const currentShare = parseFloat(holding[userIdStr]) || 0;
  const newShare = currentShare + changeAmount;
  // 🔥 CRITICAL: create a new object (not mutate the existing one)
  const newHolding = { ...holding, [userIdStr]: newShare };
  if (newShare === 0) delete newHolding[userIdStr];

  await department.update({ holding: newHolding }, { transaction });
  return department;
};

/* =========================
   CREATE Transaction
   ========================= */
export const createTransaction = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { depId, amount, is_deposit, userId } = req.body;

    // Validation
    if (!depId || !userId || amount === undefined) {
      await dbTransaction.rollback();
      return res.status(400).json({ message: "depId, userId and amount are required" });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      await dbTransaction.rollback();
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Ensure department exists
    const department = await Department.findByPk(depId, { transaction: dbTransaction });
    if (!department) {
      await dbTransaction.rollback();
      return res.status(404).json({ message: "Department not found" });
    }

    // Adjust holding
    const changeAmount = is_deposit ? numericAmount : -numericAmount;
    await updateDepartmentHolding(depId, userId, changeAmount, dbTransaction);

    // Create transaction record
    const transactionRecord = await DepartmentTransaction.create(
      {
        depId: parseInt(depId),
        amount: numericAmount,
        is_deposit: is_deposit,
        userId: parseInt(userId),
      },
      { transaction: dbTransaction }
    );

    // Update department's deposit/withdraw array
    const field = transactionRecord.is_deposit ? "deposit" : "withdraw";
    let currentArray = department[field];
    if (!currentArray) currentArray = [];
    if (typeof currentArray === "string") {
      try { currentArray = JSON.parse(currentArray); } catch (e) { currentArray = []; }
    }
    if (!Array.isArray(currentArray)) currentArray = [];
    currentArray.push(transactionRecord.id);
    await department.update({ [field]: currentArray }, { transaction: dbTransaction });

    await dbTransaction.commit();

    const created = await DepartmentTransaction.findByPk(transactionRecord.id, {
      include: [{ model: Department, as: "department" }],
    });

    res.status(201).json({
      success: true,
      data: created,
      message: "Transaction created and linked to department successfully",
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   READ ALL (with pagination & filtering, including userId)
   ========================= */
export const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, depId, userId, type } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (depId) where.depId = parseInt(depId);
    if (userId) where.userId = parseInt(userId);
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

/* =========================
   READ ONE
   ========================= */
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await DepartmentTransaction.findByPk(id, {
      include: [{ model: Department, as: "department" }],
    });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   UPDATE Transaction
   ========================= */
export const updateTransaction = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { depId, amount, is_deposit, userId } = req.body;

    const oldTransaction = await DepartmentTransaction.findByPk(id, { transaction: dbTransaction });
    if (!oldTransaction) {
      await dbTransaction.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Revert original effect on holding
    const oldChange = oldTransaction.is_deposit ? oldTransaction.amount : -oldTransaction.amount;
    await updateDepartmentHolding(oldTransaction.depId, oldTransaction.userId, -oldChange, dbTransaction);

    // Remove old transaction ID from department's deposit/withdraw array
    const oldDept = await Department.findByPk(oldTransaction.depId, { transaction: dbTransaction });
    if (oldDept) {
      const field = oldTransaction.is_deposit ? "deposit" : "withdraw";
      let arr = oldDept[field];
      if (typeof arr === "string") arr = JSON.parse(arr);
      if (Array.isArray(arr)) {
        const newArr = arr.filter(tid => tid !== oldTransaction.id);
        await oldDept.update({ [field]: newArr }, { transaction: dbTransaction });
      }
    }

    // Apply new values
    const newDepId = depId !== undefined ? parseInt(depId) : oldTransaction.depId;
    const newUserId = userId !== undefined ? parseInt(userId) : oldTransaction.userId;
    const newAmount = amount !== undefined ? parseFloat(amount) : oldTransaction.amount;
    const newIsDeposit = is_deposit !== undefined ? is_deposit : oldTransaction.is_deposit;

    if (isNaN(newAmount) || newAmount <= 0) {
      await dbTransaction.rollback();
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Apply new effect on holding
    const newChange = newIsDeposit ? newAmount : -newAmount;
    await updateDepartmentHolding(newDepId, newUserId, newChange, dbTransaction);

    // Update transaction record
    oldTransaction.depId = newDepId;
    oldTransaction.userId = newUserId;
    oldTransaction.amount = newAmount;
    oldTransaction.is_deposit = newIsDeposit;
    await oldTransaction.save({ transaction: dbTransaction });

    // Add transaction ID to new department's deposit/withdraw array
    const newDept = await Department.findByPk(newDepId, { transaction: dbTransaction });
    if (newDept) {
      const field = newIsDeposit ? "deposit" : "withdraw";
      let arr = newDept[field];
      if (typeof arr === "string") arr = JSON.parse(arr);
      if (!Array.isArray(arr)) arr = [];
      if (!arr.includes(oldTransaction.id)) {
        arr.push(oldTransaction.id);
        await newDept.update({ [field]: arr }, { transaction: dbTransaction });
      }
    }

    await dbTransaction.commit();

    const updated = await DepartmentTransaction.findByPk(id, {
      include: [{ model: Department, as: "department" }],
    });
    res.status(200).json({
      success: true,
      data: updated,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

/* =========================
   DELETE Transaction
   ========================= */
export const deleteTransaction = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const transaction = await DepartmentTransaction.findByPk(id, { transaction: dbTransaction });
    if (!transaction) {
      await dbTransaction.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Revert holding change
    const change = transaction.is_deposit ? transaction.amount : -transaction.amount;
    await updateDepartmentHolding(transaction.depId, transaction.userId, -change, dbTransaction);

    // Remove transaction ID from department's deposit/withdraw array
    const department = await Department.findByPk(transaction.depId, { transaction: dbTransaction });
    if (department) {
      const field = transaction.is_deposit ? "deposit" : "withdraw";
      let arr = department[field];
      if (typeof arr === "string") arr = JSON.parse(arr);
      if (Array.isArray(arr)) {
        const newArr = arr.filter(tid => tid !== transaction.id);
        await department.update({ [field]: newArr }, { transaction: dbTransaction });
      }
    }

    await transaction.destroy({ transaction: dbTransaction });
    await dbTransaction.commit();

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};