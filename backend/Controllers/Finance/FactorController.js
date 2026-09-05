import sequelize from "../../dbconnection.js";
import Factor from "../../Models/Finance/Factor.js";
import Seller from "../../Models/Seller/Seller.js";
import StockIncome from "../../Models/Stock/StockIncome.js";
import StockExist from "../../Models/Stock/StockExist.js"; // ← Add this import
import { Op } from "sequelize";

/* ===============================
   GET ALL FACTORS (with seller, incomes list)
================================ */
export const getAllFactors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Factor.findAndCountAll({
      distinct: true,
      include: [
        {
          model: Seller,
          as: "factorSeller",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    // Fetch income details for each factor
    const factorsWithIncomes = await Promise.all(
      rows.map(async (factor) => {
        let incomeDetails = [];
        if (factor.incomes && factor.incomes.length) {
          incomeDetails = await StockIncome.findAll({
            where: { id: factor.incomes },
            include: [
              {
                model: StockExist,
                as: "stockIncomeStockExist",
                attributes: ["id", "name", "departmentId"],
              },
            ],
            order: [["createdAt", "ASC"]],
          });
        }
        return {
          ...factor.toJSON(),
          incomeDetails,
          isPending: factor.mode === "pending", // Add flag for pending status
        };
      })
    );

    res.json({
      success: true,
      factors: factorsWithIncomes,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in getAllFactors:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch factors", 
      error: error.message 
    });
  }
};

/* ===============================
   GET SINGLE FACTOR BY ID
================================ */
export const getFactorById = async (req, res) => {
  try {
    const { id } = req.params;
    const factor = await Factor.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "factorSeller", // ← CHANGED from "seller" to "factorSeller"
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
    });

    if (!factor) {
      return res.status(404).json({ success: false, message: "Factor not found" });
    }

    // Fetch the actual StockIncome records from the incomes array
    let incomeDetails = [];
    if (factor.incomes && factor.incomes.length) {
      incomeDetails = await StockIncome.findAll({
        where: { id: factor.incomes },
        include: [
          {
            model: StockExist,
            as: "stockIncomeStockExist", // ← Check this alias in your StockIncome model
            attributes: ["id", "name", "departmentId"],
          },
        ],
        order: [["createdAt", "ASC"]],
      });
    }

    res.json({
      success: true,
      factor: {
        ...factor.toJSON(),
        incomeDetails,
      },
    });
  } catch (error) {
    console.error("Error in getFactorById:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

/* ===============================
   GET FACTORS BY DATE RANGE
================================ */
export const getFactorsByDateRange = async (req, res) => {
  const { from, to, sellerId } = req.query;
  if (!from || !to) {
    return res.status(400).json({ 
      success: false, 
      message: "from and to dates are required" 
    });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      createdAt: { [Op.between]: [startDate, endDate] },
    };
    if (sellerId) {
      whereClause.sellerId = sellerId;
    }

    const factors = await Factor.findAll({
      where: whereClause,
      include: [
        {
          model: Seller,
          as: "factorSeller", // ← CHANGED from "seller" to "factorSeller"
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Fetch income details for each factor
    const factorsWithIncomes = await Promise.all(
      factors.map(async (factor) => {
        let incomeDetails = [];
        if (factor.incomes && factor.incomes.length) {
          incomeDetails = await StockIncome.findAll({
            where: { id: factor.incomes },
            include: [
              {
                model: StockExist,
                as: "stockIncomeStockExist",
                attributes: ["id", "name", "departmentId"],
              },
            ],
            order: [["createdAt", "ASC"]],
          });
        }
        return {
          ...factor.toJSON(),
          incomeDetails,
        };
      })
    );

    const totalAmount = factorsWithIncomes.reduce((sum, f) => sum + parseFloat(f.totalAmount), 0);
    const totalPaid = factorsWithIncomes.reduce((sum, f) => sum + parseFloat(f.paidAmount), 0);
    const totalRemaining = totalAmount - totalPaid;

    res.json({
      success: true,
      factors: factorsWithIncomes,
      summary: {
        totalFactors: factorsWithIncomes.length,
        totalAmount,
        totalPaid,
        totalRemaining,
      },
      filters: { from, to, sellerId: sellerId || null },
    });
  } catch (error) {
    console.error("Error in getFactorsByDateRange:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching factors", 
      error: error.message 
    });
  }
};

/* ===============================
   GET FACTORS BY SELLER ID
================================ */
export const getFactorsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const seller = await Seller.findByPk(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const factors = await Factor.findAll({
      where: { sellerId },
      include: [
        {
          model: Seller,
          as: "factorSeller", // ← CHANGED from "seller" to "factorSeller"
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Fetch income details for each factor
    const factorsWithIncomes = await Promise.all(
      factors.map(async (factor) => {
        let incomeDetails = [];
        if (factor.incomes && factor.incomes.length) {
          incomeDetails = await StockIncome.findAll({
            where: { id: factor.incomes },
            include: [
              {
                model: StockExist,
                as: "stockIncomeStockExist",
                attributes: ["id", "name", "departmentId"],
              },
            ],
            order: [["createdAt", "ASC"]],
          });
        }
        return {
          ...factor.toJSON(),
          incomeDetails,
        };
      })
    );

    const totalAmount = factorsWithIncomes.reduce((sum, f) => sum + parseFloat(f.totalAmount), 0);
    const totalPaid = factorsWithIncomes.reduce((sum, f) => sum + parseFloat(f.paidAmount), 0);

    res.json({
      success: true,
      seller: { id: seller.id, fullname: seller.fullname },
      factors: factorsWithIncomes,
      summary: {
        totalFactors: factorsWithIncomes.length,
        totalAmount,
        totalPaid,
        outstandingBalance: totalAmount - totalPaid,
      },
    });
  } catch (error) {
    console.error("Error in getFactorsBySeller:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

/* ===============================
   CREATE A NEW FACTOR
================================ */
export const createFactor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      sellerId,
      incomes, // Array of StockIncome IDs
      totalAmount,
      paidAmount,
      status,
      notes,
      factorNumber,
      discount_percent,
      discounted_amount,
    } = req.body;

    // Validate seller exists
    const seller = await Seller.findByPk(sellerId);
    if (!seller) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    // Validate incomes exist
    let incomeRecords = [];
    if (incomes && incomes.length > 0) {
      incomeRecords = await StockIncome.findAll({
        where: { id: incomes },
        transaction
      });
      
      if (incomeRecords.length !== incomes.length) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          message: "One or more stock incomes not found" 
        });
      }
    }

    // Calculate remaining amount
    const remainingAmount = (totalAmount || 0) - (paidAmount || 0);

    // Create factor
    const factor = await Factor.create({
      factorNumber: factorNumber || `FACTOR-${Date.now()}`,
      sellerId,
      incomes: incomes || [],
      totalAmount: totalAmount || 0,
      paidAmount: paidAmount || 0,
      remainingAmount,
      status: status || (remainingAmount === 0 ? "paid" : remainingAmount < totalAmount ? "partial" : "unpaid"),
      notes,
      discount_percent: discount_percent || 0,
      discounted_amount: discounted_amount || 0,
    }, { transaction });

    await transaction.commit();

    // Fetch the created factor with associations
    const createdFactor = await Factor.findByPk(factor.id, {
      include: [
        {
          model: Seller,
          as: "factorSeller",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Factor created successfully",
      factor: createdFactor,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in createFactor:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create factor", 
      error: error.message 
    });
  }
};

/* ===============================
   UPDATE A FACTOR
================================ */
export const updateFactor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const {
      sellerId,
      incomes,
      totalAmount,
      paidAmount,
      status,
      notes,
      factorNumber,
      discount_percent,
      discounted_amount,
    } = req.body;

    // Find existing factor
    const factor = await Factor.findByPk(id);
    if (!factor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Factor not found" });
    }

    // Validate seller if changed
    if (sellerId) {
      const seller = await Seller.findByPk(sellerId);
      if (!seller) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "Seller not found" });
      }
    }

    // Validate incomes if provided
    if (incomes && incomes.length > 0) {
      const incomeRecords = await StockIncome.findAll({
        where: { id: incomes },
        transaction
      });
      
      if (incomeRecords.length !== incomes.length) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          message: "One or more stock incomes not found" 
        });
      }
    }

    // Calculate remaining amount
    const newTotalAmount = totalAmount || factor.totalAmount;
    const newPaidAmount = paidAmount !== undefined ? paidAmount : factor.paidAmount;
    const remainingAmount = newTotalAmount - newPaidAmount;

    // Update factor
    await factor.update({
      factorNumber: factorNumber || factor.factorNumber,
      sellerId: sellerId || factor.sellerId,
      incomes: incomes || factor.incomes,
      totalAmount: newTotalAmount,
      paidAmount: newPaidAmount,
      remainingAmount,
      status: status || (remainingAmount === 0 ? "paid" : remainingAmount < newTotalAmount ? "partial" : "unpaid"),
      notes: notes !== undefined ? notes : factor.notes,
      discount_percent: discount_percent !== undefined ? discount_percent : factor.discount_percent,
      discounted_amount: discounted_amount !== undefined ? discounted_amount : factor.discounted_amount,
    }, { transaction });

    await transaction.commit();

    // Fetch updated factor with associations
    const updatedFactor = await Factor.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "factorSeller",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Factor updated successfully",
      factor: updatedFactor,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateFactor:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update factor", 
      error: error.message 
    });
  }
};

/* ===============================
   DELETE A FACTOR
================================ */
export const deleteFactor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const factor = await Factor.findByPk(id);
    if (!factor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Factor not found" });
    }

    await factor.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Factor deleted successfully"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteFactor:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete factor", 
      error: error.message 
    });
  }
};