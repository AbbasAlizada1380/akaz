import { Pay, SellerAccount, sequelize, StockIncome } from "../../Models/Association.js";
import { Seller } from "../../Models/Association.js";

export const createPay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { seller, amount, description } = req.body;

    // Validate input
    if (!seller) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // 1. Create the pay record
    const pay = await Pay.create(
      {
        seller,
        amount,
        description: description || `Payment of ${amount} for seller #${seller}`,
      },
      { transaction }
    );

    // 2. Find the seller account
    let sellerAccount = await SellerAccount.findOne({
      where: { sellerId: seller },
      transaction,
    });

    if (!sellerAccount) {
      // If seller account doesn't exist, create one with empty arrays
      sellerAccount = await SellerAccount.create(
        {
          sellerId: seller,
          paid: [],
          unpaid: [],
          total: [],
        },
        { transaction }
      );
      
      await transaction.commit();
      
      return res.status(201).json({
        success: true,
        message: "Payment created successfully (new seller account)",
        data: {
          pay,
          sellerAccount,
        },
      });
    }

    // 3. Get the unpaid array and sort it (smallest ID first)
    const unpaidIds = Array.isArray(sellerAccount.unpaid) 
      ? [...sellerAccount.unpaid].sort((a, b) => a - b) // Sort ascending (smallest first)
      : [];

    if (unpaidIds.length === 0) {
      // No unpaid records to process
      await transaction.commit();
      
      return res.status(201).json({
        success: true,
        message: "Payment created successfully (no unpaid records to process)",
        data: {
          pay,
          sellerAccount,
        },
      });
    }

    // 4. Fetch all unpaid stock incomes for this seller
    const unpaidStockIncomes = await StockIncome.findAll({
      where: {
        id: unpaidIds,
        sellerId: seller,
      },
      order: [['id', 'ASC']], // Order by ID ascending (smallest first)
      transaction,
    });

    let remainingAmount = parseFloat(amount);
    const processedPaidIds = [];
    const remainingUnpaidIds = [];

    // 5. Process each unpaid stock income in order (smallest ID first)
    for (const stockIncome of unpaidStockIncomes) {
      if (remainingAmount <= 0) {
        // No more money to distribute, keep this in unpaid
        remainingUnpaidIds.push(stockIncome.id);
        continue;
      }

      const stockRemaining = parseFloat(stockIncome.remaining) || 0;
      
      if (stockRemaining <= 0) {
        // This stock income has no remaining balance, should it be in unpaid?
        // Move it to paid if it's fully paid
        processedPaidIds.push(stockIncome.id);
        continue;
      }

      if (remainingAmount >= stockRemaining) {
        // Fully pay this stock income
        remainingAmount -= stockRemaining;
        
        // Update stock income to fully paid
        await stockIncome.update(
          {
            received: (parseFloat(stockIncome.received) || 0) + stockRemaining,
            remaining: 0,
          },
          { transaction }
        );
        
        // Mark as paid
        processedPaidIds.push(stockIncome.id);
      } else {
        // Partially pay this stock income
        const newReceived = (parseFloat(stockIncome.received) || 0) + remainingAmount;
        const newRemaining = stockRemaining - remainingAmount;
        
        await stockIncome.update(
          {
            received: newReceived,
            remaining: newRemaining,
          },
          { transaction }
        );
        
        // This stock income remains unpaid (with reduced balance)
        remainingUnpaidIds.push(stockIncome.id);
        remainingAmount = 0;
      }
    }

    // If there are any unpaid stock incomes that weren't processed (beyond those we fetched)
    // Add them to remainingUnpaidIds
    const processedIds = unpaidStockIncomes.map(s => s.id);
    const unprocessedIds = unpaidIds.filter(id => !processedIds.includes(id));
    remainingUnpaidIds.push(...unprocessedIds);

    // 6. Update seller account arrays
    const currentPaid = Array.isArray(sellerAccount.paid) 
      ? [...sellerAccount.paid] 
      : [];
    
    const currentTotal = Array.isArray(sellerAccount.total) 
      ? [...sellerAccount.total] 
      : [];

    // Add newly paid IDs to paid array (avoid duplicates)
    processedPaidIds.forEach(id => {
      if (!currentPaid.includes(id)) {
        currentPaid.push(id);
      }
    });

    // Update seller account with modified arrays
    await sellerAccount.update(
      {
        paid: currentPaid,
        unpaid: remainingUnpaidIds,
        // total remains unchanged
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch updated data for response
    const updatedSellerAccount = await SellerAccount.findOne({
      where: { sellerId: seller },
    });

    // Fetch the updated stock incomes that were affected
    const affectedStockIncomes = await StockIncome.findAll({
      where: {
        id: [...processedPaidIds, ...remainingUnpaidIds],
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment created and applied to unpaid records successfully",
      data: {
        pay,
        sellerAccount: updatedSellerAccount,
        paymentDistribution: {
          totalAmount: parseFloat(amount),
          appliedAmount: parseFloat(amount) - remainingAmount,
          remainingAmount: remainingAmount,
          fullyPaidIds: processedPaidIds,
          partiallyPaidIds: remainingUnpaidIds.filter(id => 
            affectedStockIncomes.find(s => s.id === id && parseFloat(s.remaining) > 0)
          ),
          unpaidIds: remainingUnpaidIds,
        },
        affectedStockIncomes,
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};


// ==============================
// Get All Pays (Pagination)
// ==============================
export const getAllPays = async (req, res) => {
  try {
    const { page = 1, limit = 20, seller } = req.query;

    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const offset = (pageNumber - 1) * pageLimit;

    const where = {};
    if (seller) where.seller = seller;

    const { rows, count } = await Pay.findAndCountAll({
      where,
      include: [
        {
          model: Seller,
          as: "sellerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
      limit: pageLimit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      page: pageNumber,
      limit: pageLimit,
      totalRecords: count,
      totalPages: Math.ceil(count / pageLimit),
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};


// ==============================
// Get Single Pay
// ==============================
export const getSinglePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "sellerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};


// ==============================
// Update Pay
// ==============================
export const updatePay = async (req, res) => {
  try {
    const { id } = req.params;
    const { seller, amount, description } = req.body;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.update({
      seller,
      amount,
      description,
    });

    res.json({
      success: true,
      message: "Payment updated successfully",
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: error.message,
    });
  }
};


// ==============================
// Delete Pay
// ==============================
export const deletePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.destroy();

    res.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message,
    });
  }
};