import Sell from "../../Models/Stock/Sells.js";
import StockIncome from "../../Models/Stock/StockIncome.js";
import sequelize from "../../dbconnection.js";
import Customer from "../../Models/Customers.js"

/* =================================
   CREATE SELL
================================= */
export const createSell = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { stockIncome, customer, amount, unitPrice, received } = req.body;

    if (!stockIncome) {
      return res.status(400).json({ message: "StockIncome ID is required" });
    }

    if (!customer) {
      return res.status(400).json({ message: "Customer is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (!unitPrice || unitPrice < 0) {
      return res.status(400).json({ message: "Unit price is required" });
    }

    const stock = await StockIncome.findByPk(stockIncome, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "StockIncome not found" });
    }

    /* ========= USE quantity NOT amount ========= */

    if (parseFloat(stock.quantity) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Not enough stock. Available: ${stock.quantity}`,
      });
    }

    const total = parseFloat(amount) * parseFloat(unitPrice);
    const receivedAmount = received ? parseFloat(received) : 0;
    const remained = total - receivedAmount;

    /* ========= Reduce Stock Quantity ========= */
    stock.quantity = parseFloat(stock.quantity) - parseFloat(amount);

    /* Optional: track soldQuantity */
    stock.soldQuantity =
      parseFloat(stock.soldQuantity || 0) + parseFloat(amount);

    await stock.save({ transaction });

    const newSell = await Sell.create(
      {
        stockIncome,
        customer,
        amount,
        unitPrice,
        total,
        received: receivedAmount,
        remained,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      message: "Sell created and stock updated successfully",
      data: newSell,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("SELL ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


/* =================================
   GET ALL SELLS
================================= */
export const getAllSells = async (req, res) => {
  try {
    const sells = await Sell.findAll({
      include: [
        { model: StockIncome, as: "stock" }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(sells);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch sells" });
  }
};


/* =================================
   GET SELL BY ID
================================= */
export const getSellById = async (req, res) => {
  try {
    const { id } = req.params;

    const sell = await Sell.findByPk(id, {
      include: [
        {
          model: StockIncome,
          as: "stock",
        },
      ],
    });

    if (!sell) {
      return res.status(404).json({ message: "Sell not found" });
    }

    res.json(sell);

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


/* =================================
   UPDATE SELL
================================= */
export const updateSell = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { id } = req.params;

  try {
    const { stockIncome, customer, amount, unitPrice, received } = req.body;

    /* ========= Find Existing Sell ========= */
    const existingSell = await Sell.findByPk(id, { transaction });
    if (!existingSell) {
      await transaction.rollback();
      return res.status(404).json({ message: "Sell record not found" });
    }

    /* ========= Find Related Stock ========= */
    const stock = await StockIncome.findByPk(stockIncome || existingSell.stockIncome, { transaction });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "StockIncome not found" });
    }

    /* ========= Calculate Quantity Difference ========= */
    const oldAmount = existingSell.amount;
    const newAmount = amount || oldAmount;
    const quantityDifference = newAmount - oldAmount;

    // If increasing quantity, check if enough stock available
    if (quantityDifference > 0 && stock.quantity < quantityDifference) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Insufficient stock quantity for update",
        availableQuantity: stock.quantity,
        requiredAdditional: quantityDifference
      });
    }

    /* ========= Calculations ========= */
    const total = parseFloat(newAmount) * parseFloat(unitPrice || existingSell.unitPrice);
    const receivedAmount = received !== undefined ? parseFloat(received) : existingSell.received;
    const remained = total - receivedAmount;

    /* ========= Update Sell Record ========= */
    await existingSell.update(
      {
        stockIncome: stockIncome || existingSell.stockIncome,
        customer: customer || existingSell.customer,
        amount: newAmount,
        unitPrice: unitPrice || existingSell.unitPrice,
        total,
        received: receivedAmount,
        remained,
      },
      { transaction }
    );

    /* ========= Update Stock Income Quantity ========= */
    const newStockQuantity = stock.quantity - quantityDifference;

    // Recalculate stock totals
    const stockTotal = newStockQuantity * parseFloat(stock.unitPrice);
    const stockRemaining = stockTotal - (parseFloat(stock.received) || 0);

    await stock.update(
      {
        quantity: newStockQuantity,
        total: stockTotal,
        remaining: stockRemaining > 0 ? stockRemaining : 0,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      message: "Sell updated successfully",
      data: {
        sell: existingSell,
        stockUpdate: {
          id: stock.id,
          name: stock.name,
          quantityChange: -quantityDifference,
          newQuantity: stock.quantity
        }
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateSell:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* =================================
   DELETE SELL
================================= */
export const deleteSell = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { id } = req.params;

  try {
    /* ========= Find Sell Record ========= */
    const sell = await Sell.findByPk(id, { transaction });
    if (!sell) {
      await transaction.rollback();
      return res.status(404).json({ message: "Sell record not found" });
    }

    /* ========= Find Related Stock ========= */
    const stock = await StockIncome.findByPk(sell.stockIncome, { transaction });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "Associated StockIncome not found" });
    }

    /* ========= Restore Stock Quantity ========= */
    const restoredQuantity = stock.quantity + sell.amount;

    // Recalculate stock totals
    const stockTotal = restoredQuantity * parseFloat(stock.unitPrice);
    const stockRemaining = stockTotal - (parseFloat(stock.received) || 0);

    await stock.update(
      {
        quantity: restoredQuantity,
        total: stockTotal,
        remaining: stockRemaining > 0 ? stockRemaining : 0,
      },
      { transaction }
    );

    /* ========= Delete Sell Record ========= */
    await sell.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Sell deleted successfully",
      data: {
        restoredStock: {
          id: stock.id,
          name: stock.name,
          restoredQuantity: sell.amount,
          newQuantity: stock.quantity
        }
      },
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteSell:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};