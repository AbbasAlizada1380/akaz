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
    // Destructure to separate seller-related fields from rest of the data
    let { sellerId, newSellerName, ...incomeData } = req.body;

    // --- Seller resolution: either use existing sellerId or create a new seller ---
    let finalSellerId = null;

    if (newSellerName) {
      // Create a new seller with the provided name
      const newSeller = await Seller.create(
        { fullname: newSellerName.trim(),
          isActive:true
         }, // adjust field name if your model uses 'name' instead
        { transaction }
      );
      finalSellerId = newSeller.id;
    } else if (sellerId) {
      // Verify that the provided sellerId exists
      const existingSeller = await Seller.findByPk(sellerId, { transaction });
      if (!existingSeller) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Seller not found",
        });
      }
      finalSellerId = sellerId;
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Either sellerId or newSellerName is required",
      });
    }

    // Assign the resolved sellerId to the income data
    incomeData.sellerId = finalSellerId;

    // 1. Create the StockIncome record
    const income = await StockIncome.create(incomeData, { transaction });

    const departmentId = income.departmentId;

    // 2. Update StockExist (department-level tracking)
    let stockExist = await StockExist.findOne({
      where: { departmentId },
      transaction,
    });

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

    // 3. Record payment in Pay table
    await Pay.create(
      {
        amount: income.received || 0,
        seller: income.sellerId,
        description: `Payment for stock income #${income.id} in department ${departmentId}`,
      },
      { transaction }
    );

    // 4. Update SellerAccount (financial tracking for the seller)
    let sellerAccount = await SellerAccount.findOne({
      where: { sellerId: income.sellerId },
      transaction,
    });

    const isFullyPaid = income.received >= (income.total || 0);

    if (!sellerAccount) {
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
      // Safely parse arrays
      const currentPaid = Array.isArray(sellerAccount.paid) ? [...sellerAccount.paid] : [];
      const currentUnpaid = Array.isArray(sellerAccount.unpaid) ? [...sellerAccount.unpaid] : [];
      const currentTotal = Array.isArray(sellerAccount.total) ? [...sellerAccount.total] : [];

      if (!currentTotal.includes(income.id)) {
        currentTotal.push(income.id);
      }

      if (isFullyPaid) {
        if (!currentPaid.includes(income.id)) {
          currentPaid.push(income.id);
        }
        const unpaidIndex = currentUnpaid.indexOf(income.id);
        if (unpaidIndex > -1) {
          currentUnpaid.splice(unpaidIndex, 1);
        }
      } else {
        if (!currentUnpaid.includes(income.id)) {
          currentUnpaid.push(income.id);
        }
        const paidIndex = currentPaid.indexOf(income.id);
        if (paidIndex > -1) {
          currentPaid.splice(paidIndex, 1);
        }
      }

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

    // Fetch the newly created stock income with its associations
    const newIncome = await StockIncome.findByPk(income.id, {
      include: [
        { model: Department, as: "department" },
        { model: Seller, as: "seller" },
      ],
    });

    const updatedSellerAccount = await SellerAccount.findOne({
      where: { sellerId: income.sellerId },
    });

    res.status(201).json({
      success: true,
      message: "Stock income created successfully",
      data: {
        stockIncome: newIncome,
        sellerAccount: updatedSellerAccount,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating stock income:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const undoCreateStockIncome = async (req, res) => {
  const { id } = req.params; // expects the stock income ID in the URL, e.g. /api/stock-income/:id/undo
  const transaction = await sequelize.transaction();

  try {
    // 1. Find the stock income to be undone
    const income = await StockIncome.findByPk(id, { transaction });
    if (!income) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Stock income not found' });
    }

    const { departmentId, sellerId, received = 0 } = income;

    // 2. Update StockExist: remove the income ID from allStockIds and remainingStockIds
    const stockExist = await StockExist.findOne({ where: { departmentId }, transaction });
    if (stockExist) {
      const allStockIds = (stockExist.allStockIds || []).filter(stockId => stockId !== income.id);
      const remainingStockIds = (stockExist.remainingStockIds || []).filter(stockId => stockId !== income.id);
      await stockExist.update({ allStockIds, remainingStockIds }, { transaction });
    }

    // 3. Delete the associated Pay record(s)
    // The original controller creates a Pay with description containing "stock income #{id}"
    const payRecords = await Pay.findAll({
      where: {
        amount: received,
        seller: sellerId,
        description: { [Op.like]: `%stock income #${income.id}%` }
      },
      transaction
    });
    for (const pay of payRecords) {
      await pay.destroy({ transaction });
    }

    // 4. Update SellerAccount: remove income ID from paid, unpaid, and total arrays
    const sellerAccount = await SellerAccount.findOne({ where: { sellerId }, transaction });
    if (sellerAccount) {
      const paid = (sellerAccount.paid || []).filter(id => id !== income.id);
      const unpaid = (sellerAccount.unpaid || []).filter(id => id !== income.id);
      const total = (sellerAccount.total || []).filter(id => id !== income.id);
      await sellerAccount.update({ paid, unpaid, total }, { transaction });
    }

    // 5. Delete the stock income record itself
    await income.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Stock income undone successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error undoing stock income:', error);
    res.status(500).json({ success: false, message: error.message });
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

/* =========================
   TOGGLE SELLER STATUS (ACTIVE/INACTIVE)
========================= */
export const toggleSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findByPk(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // Toggle the isActive status
    const newStatus = !seller.isActive;
    await seller.update({ isActive: newStatus });

    return res.status(200).json({
      success: true,
      message: `Seller ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: seller,
    });
  } catch (error) {
    console.error("Toggle Seller Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while toggling seller status",
    });
  }
};