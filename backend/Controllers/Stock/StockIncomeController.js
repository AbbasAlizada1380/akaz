// controllers/stockIncomeController.js
import Pay from "../../Models/Finance/Pay.js"
import { Department, Seller, SellerAccount, StockIncome } from '../../Models/Association.js';
import StockExist from "../../Models/Stock/StockExist.js";
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
    // 1. Add a record in StockIncome model
    const income = await StockIncome.create(req.body, { transaction });

    const departmentId = income.departmentId;

    // 2. Add its ids to the table StockExist
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
      const allStockIds = [...(stockExist.allStockIds || []), income.id];
      const remainingStockIds = [...(stockExist.remainingStockIds || []), income.id];

      await stockExist.update(
        {
          allStockIds,
          remainingStockIds,
        },
        { transaction }
      );
    }

    // 3. Add a record of pay to have a record of pay too
    await Pay.create(
      {
        amount: income.received || 0,
        seller: income.sellerId,
        description: `Payment for stock income #${income.id} in department ${departmentId}`,
      },
      { transaction }
    );

    // 4. Handle SellerAccount - push ID to total, and to paid/unpaid based on payment status
    let sellerAccount = await SellerAccount.findOne({
      where: { sellerId: income.sellerId },
      transaction,
    });

    // Calculate if the stock income is fully paid
    const isFullyPaid = income.received >= (income.total || 0);

    if (!sellerAccount) {
      // If seller account doesn't exist, create a new one with the appropriate arrays
      sellerAccount = await SellerAccount.create(
        {
          sellerId: income.sellerId,
          paid: isFullyPaid ? [income.id] : [],
          unpaid: !isFullyPaid ? [income.id] : [],
          total: [income.id],
        },
        { transaction }
      );
    } else {
      // If seller account exists, update the existing arrays

      // Parse the JSON arrays properly - ensure they are actual arrays
      const currentPaid = Array.isArray(sellerAccount.paid) ? [...sellerAccount.paid] : [];
      const currentUnpaid = Array.isArray(sellerAccount.unpaid) ? [...sellerAccount.unpaid] : [];
      const currentTotal = Array.isArray(sellerAccount.total) ? [...sellerAccount.total] : [];

      // Add income ID to total array (always)
      if (!currentTotal.includes(income.id)) {
        currentTotal.push(income.id);
      }

      // Add ID to appropriate array based on payment status
      if (isFullyPaid) {
        // Fully paid - add to paid array if not already there
        if (!currentPaid.includes(income.id)) {
          currentPaid.push(income.id);
        }
        // Remove from unpaid if it was there (for safety)
        const unpaidIndex = currentUnpaid.indexOf(income.id);
        if (unpaidIndex > -1) {
          currentUnpaid.splice(unpaidIndex, 1);
        }
      } else {
        // Partially paid or unpaid - add to unpaid array if not already there
        if (!currentUnpaid.includes(income.id)) {
          currentUnpaid.push(income.id);
        }
        // Remove from paid if it was there (for safety)
        const paidIndex = currentPaid.indexOf(income.id);
        if (paidIndex > -1) {
          currentPaid.splice(paidIndex, 1);
        }
      }

      // Update seller account with modified arrays
      await sellerAccount.update(
        {
          paid: currentPaid,
          unpaid: currentUnpaid,
          total: currentTotal,
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

    // Also fetch the updated seller account to include in response
    const updatedSellerAccount = await SellerAccount.findOne({
      where: { sellerId: income.sellerId }
    });

    res.status(201).json({
      success: true,
      message: "Stock income created successfully",
      data: {
        stockIncome: newIncome,
        sellerAccount: updatedSellerAccount
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating stock income:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
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