import Sell from "../../Models/Stock/Sells.js";
import StockIncome from "../../Models/Stock/StockIncome.js";
import StockExist from "../../Models/Stock/StockExist.js";
import sequelize from "../../dbconnection.js";
import Customer from "../../Models/Customer/Customers.js"
import { Receive } from "../../Models/Association.js";
import CustomerAccount from "../../Models/Customer/CustomerAccount.js"; // adjust import path

export const createSell = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { stockIncome, customer, amount, unitPrice, received } = req.body;

    // --- Validation (unchanged) ---
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

    // --- Extract customer ID (unchanged) ---
    let customerId;
    if (typeof customer === 'object' && customer !== null) {
      if (!customer.id) {
        await transaction.rollback();
        return res.status(400).json({ message: "Customer object must contain an id" });
      }
      customerId = customer.id;
    } else {
      customerId = parseInt(customer, 10);
      if (isNaN(customerId)) {
        await transaction.rollback();
        return res.status(400).json({ message: "Customer must be a valid ID or an object with id" });
      }
    }

    // --- Fetch stock (unchanged) ---
    const stock = await StockIncome.findByPk(stockIncome, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "StockIncome not found" });
    }

    if (parseFloat(stock.quantity) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Not enough stock. Available: ${stock.quantity}`,
      });
    }

    // --- Calculate financials (unchanged) ---
    const total = parseFloat(amount) * parseFloat(unitPrice);
    const receivedAmount = received ? parseFloat(received) : 0;
    const remained = total - receivedAmount;

    // --- Reduce stock (unchanged) ---
    stock.quantity = parseFloat(stock.quantity) - parseFloat(amount);
    stock.soldQuantity = parseFloat(stock.soldQuantity || 0) + parseFloat(amount);
    await stock.save({ transaction });

    // --- Update StockExist (unchanged) ---
    if (stock.quantity === 0) {
      const stockExist = await StockExist.findOne({
        where: { departmentId: stock.departmentId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (stockExist) {
        const stockId = Number(stockIncome);
        stockExist.remainingStockIds = stockExist.remainingStockIds.filter(
          id => Number(id) !== stockId
        );
        if (!stockExist.soldStockIds.map(Number).includes(stockId)) {
          stockExist.soldStockIds = [...stockExist.soldStockIds, stockId];
        }
        await stockExist.save({ transaction });
      }
    }

    // --- Create Sell record ---
    const newSell = await Sell.create(
      {
        stockIncome,
        customer: customerId,
        amount,
        unitPrice,
        total,
        received: receivedAmount,
        remained,
      },
      { transaction }
    );

    // --- Create Receive record if payment exists ---
    let newReceive = null;
    if (receivedAmount > 0) {
      newReceive = await Receive.create(
        {
          customer: customerId,
          amount: receivedAmount,
          description: `Payment received for sale #${newSell.id}`,
        },
        { transaction }
      );
    }

    // --- UPDATE CUSTOMER ACCOUNT (always, using SELL ID) ---
    // Find or create CustomerAccount with lock
    let customerAccount = await CustomerAccount.findOne({
      where: { customerId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // Determine if this sale is fully paid at creation
    const isFullyPaid = remained === 0;

    if (!customerAccount) {
      // Create new account with initial arrays containing the sell ID
      customerAccount = await CustomerAccount.create(
        {
          customerId,
          paid: isFullyPaid ? [newSell.id] : [],
          unpaid: !isFullyPaid ? [newSell.id] : [],
          total: [newSell.id],
        },
        { transaction }
      );
    } else {
      // Existing account – update arrays carefully

      // Ensure we work with real arrays (in case they are stored as JSON strings)
      const currentPaid = Array.isArray(customerAccount.paid) ? [...customerAccount.paid] : [];
      const currentUnpaid = Array.isArray(customerAccount.unpaid) ? [...customerAccount.unpaid] : [];
      const currentTotal = Array.isArray(customerAccount.total) ? [...customerAccount.total] : [];

      // Always add sell ID to total (if not already present)
      if (!currentTotal.includes(newSell.id)) {
        currentTotal.push(newSell.id);
      }

      if (isFullyPaid) {
        // Fully paid sale → belongs in paid array
        if (!currentPaid.includes(newSell.id)) {
          currentPaid.push(newSell.id);
        }
        // Remove from unpaid if it was there (in case of previous partial payments – should not happen for a new sell, but safe)
        const unpaidIndex = currentUnpaid.indexOf(newSell.id);
        if (unpaidIndex > -1) {
          currentUnpaid.splice(unpaidIndex, 1);
        }
      } else {
        // Partially paid or unpaid sale → belongs in unpaid array
        if (!currentUnpaid.includes(newSell.id)) {
          currentUnpaid.push(newSell.id);
        }
        // Remove from paid if it was there (shouldn't happen, but safe)
        const paidIndex = currentPaid.indexOf(newSell.id);
        if (paidIndex > -1) {
          currentPaid.splice(paidIndex, 1);
        }
      }

      // Save updated arrays
      await customerAccount.update(
        {
          paid: currentPaid,
          unpaid: currentUnpaid,
          total: currentTotal,
        },
        { transaction }
      );
    }

    // --- Commit transaction ---
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



export const returnSell = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { unitPrice, quantity, refundedMoney, returnSell } = req.body;
    console.log(unitPrice, quantity, refundedMoney, returnSell);


    // --- Basic validation ---
    if (!quantity || !refundedMoney || !returnSell?.id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const returnedQty = parseFloat(quantity);
    const refund = parseFloat(refundedMoney);

    if (isNaN(returnedQty) || returnedQty <= 0) {
      return res.status(400).json({ error: 'Returned quantity must be a positive number' });
    }
    if (isNaN(refund) || refund < 0) {
      return res.status(400).json({ error: 'Refunded money must be a non‑negative number' });
    }

    // --- Find the original sell record ---
    const originalSell = await Sell.findByPk(returnSell.id, { transaction });
    if (!originalSell) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Original sell record not found' });
    }

    // --- Check that returned quantity does not exceed original quantity ---
    if (returnedQty > originalSell.quantity) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot return more than the original quantity (${originalSell.quantity})`
      });
    }

    // --- Find the related StockIncome ---
    const stockIncome = await StockIncome.findByPk(originalSell.stockIncome, { transaction });
    if (!stockIncome) {
      await transaction.rollback();
      return res.status(404).json({ error: 'StockIncome record not found' });
    }

    const customerId = parseInt(originalSell.customer, 10);
    if (isNaN(customerId)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid customer ID in sell record' });
    }
    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }


    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }



    const total = returnedQty * unitPrice;

    // Optional: prevent refund exceeding the total value of returned items
    if (refund > total) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Refunded quantity (${refund}) cannot exceed the value of returned items (${total})`
      });
    }

    const received = refund;
    const remained = total - received;

    // --- 1. Create the new return sell record ---
    const newReturnSell = await Sell.create({
      stockIncome: originalSell.stockIncome,
      customer: originalSell.customer,
      amount: returnedQty,
      unitPrice: unitPrice,
      total: total,
      received: received,
      remained: remained,
      is_returned: true, // marks this as a return transaction
    }, { transaction });


    // --- 2. Add the new sell's ID to the customer account's `returned` array ---
    // --- Find or create the CustomerAccount for this customer ---
    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: customer.id },
      transaction
    });

    if (!customerAccount) {
      // Create a new account with empty arrays
      customerAccount = await CustomerAccount.create({
        customerId: customer.id,
        paid: [],
        unpaid: [],
        total: [],
        returned: []
      }, { transaction });
    }
    else {
      // --- Now add the new return sell ID to the returned array ---
      const currentReturned = customerAccount.returned || [];
      currentReturned.push(newReturnSell.id);
      await customerAccount.update({ returned: currentReturned }, { transaction });

    }
    // --- 3. Update StockIncome: decrease soldQuantity by the returned amount ---
    // (assuming soldQuantity tracks how many have been sold)
    const newSoldQuantity = stockIncome.soldQuantity - returnedQty;
    if (newSoldQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Return would make sold quantity negative' });
    }
    await stockIncome.update({ soldQuantity: newSoldQuantity, quantity: stockIncome.quantity + returnedQty }, { transaction });

    // --- Commit transaction ---
    await transaction.commit();

    // --- Respond with the newly created return sell ---
    res.status(201).json({
      message: 'Return processed successfully',
      returnSell: newReturnSell
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error processing return:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
