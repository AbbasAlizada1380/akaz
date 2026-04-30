import { Op } from "sequelize";
import sequelize from "../../dbconnection.js";
import Sells from "../../Models/Stock/Sells.js";
import Bill from "../../Models/Bill.js";
import StockExist from "../../Models/Stock/StockExist.js";
import Customer from "../../Models/Customer/Customers.js";
import CustomerAccount from "../../Models/Customer/CustomerAccount.js";
import Receive from "../../Models/Finance/Receive.js";
import Return_Pay from "../../Models/Finance/Return_Pay.js";

// Helper to generate a unique bill number
const generateBillNumber = async () => {
  const lastBill = await Bill.findOne({ order: [["createdAt", "DESC"]] });
  const lastNumber = lastBill ? parseInt(lastBill.billNumber.split("-")[1]) : 0;
  const newNumber = (lastNumber + 1).toString().padStart(6, "0");
  return `INV-${newNumber}`;
};

/* ===============================
   CREATE SELL (with Bill & items)
================================ */
export const createSell = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { customerId, newCustomerName, items, receipt, notes } = req.body;

    // --- Validation (unchanged) ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "At least one item is required" });
    }
    if (receipt && receipt < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Receipt cannot be negative" });
    }

    // --- Customer handling (unchanged) ---
    let finalCustomerId;
    if (customerId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({ message: "Customer not found" });
      }
      finalCustomerId = customer.id;
    } else if (newCustomerName) {
      const newCustomer = await Customer.create(
        { fullname: newCustomerName.trim(), isActive: false },
        { transaction }
      );
      finalCustomerId = newCustomer.id;
    } else {
      await transaction.rollback();
      return res.status(400).json({ message: "Either customerId or newCustomerName is required" });
    }

    // --- Validate stock & prepare items (unchanged) ---
    const preparedItems = [];
    let totalAmount = 0;
    for (const item of items) {
      const { existId, amount, unit_price } = item;
      if (!existId || !amount || amount <= 0 || !unit_price || unit_price <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: "Each item must have existId, positive amount and unit_price" });
      }
      const stock = await StockExist.findByPk(existId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) {
        await transaction.rollback();
        return res.status(404).json({ message: `Product with id ${existId} not found` });
      }
      if (stock.amount < amount) {
        await transaction.rollback();
        return res.status(400).json({ message: `Insufficient stock for ${stock.name}. Available: ${stock.amount}` });
      }
      const lineTotal = amount * unit_price;
      totalAmount += lineTotal;
      preparedItems.push({
        existId,
        amount,
        unit_price,
        total: lineTotal,
        stockRecord: stock,
      });
    }

    const receiptAmount = receipt ? parseFloat(receipt) : 0;
    const remainingAmount = totalAmount - receiptAmount;

    // --- Create Bill (unchanged) ---
    const billNumber = await generateBillNumber();
    const bill = await Bill.create(
      {
        billNumber,
        customerId: finalCustomerId,
        date: new Date(),
        totalAmount,
        paidAmount: receiptAmount,
        remainingAmount,
        status: remainingAmount === 0 ? "paid" : receiptAmount > 0 ? "partial" : "unpaid",
        notes: notes || null,
      },
      { transaction }
    );

    // --- Create Sells & update stock (unchanged) ---
    const createdSells = [];
    for (const item of preparedItems) {
      const sell = await Sells.create(
        {
          exist: item.existId,
          amount: item.amount,
          billId: bill.id,
          unit_price: item.unit_price,
          total: item.total,
          receipt: 0,
          remaind: item.total,
        },
        { transaction }
      );
      createdSells.push(sell);
      await item.stockRecord.update(
        { amount: item.stockRecord.amount - item.amount },
        { transaction }
      );
    }

    const sellIds = createdSells.map(s => s.id);
    await bill.update({ sells: sellIds }, { transaction });

    // --- Create Receive record if payment was made ---
    let receiveId = null;
    if (receiptAmount > 0) {
      const receive = await Receive.create(
        {
          customer: finalCustomerId,
          amount: receiptAmount,
          description: `Payment for bill ${billNumber}`,
        },
        { transaction }
      );
      receiveId = receive.id;
    }

    // --- Handle CustomerAccount (fixed to include receive ID) ---
    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: finalCustomerId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const isFullyPaid = remainingAmount === 0;

    if (!customerAccount) {
      // New account: receive array contains the receiveId if payment exists
      customerAccount = await CustomerAccount.create(
        {
          customerId: finalCustomerId,
          paid: isFullyPaid ? sellIds : [],
          unpaid: !isFullyPaid ? sellIds : [],
          total: sellIds,
          receive: receiveId ? [receiveId] : [],
        },
        { transaction }
      );
    } else {
      // Existing account: update arrays safely
      const currentPaid = Array.isArray(customerAccount.paid) ? [...customerAccount.paid] : [];
      const currentUnpaid = Array.isArray(customerAccount.unpaid) ? [...customerAccount.unpaid] : [];
      const currentTotal = Array.isArray(customerAccount.total) ? [...customerAccount.total] : [];
      const currentReceive = Array.isArray(customerAccount.receive) ? [...customerAccount.receive] : [];

      // Add sell IDs to total (avoid duplicates)
      for (const id of sellIds) {
        if (!currentTotal.includes(id)) currentTotal.push(id);
      }

      if (isFullyPaid) {
        for (const id of sellIds) {
          if (!currentPaid.includes(id)) currentPaid.push(id);
          const idx = currentUnpaid.indexOf(id);
          if (idx !== -1) currentUnpaid.splice(idx, 1);
        }
      } else {
        for (const id of sellIds) {
          if (!currentUnpaid.includes(id)) currentUnpaid.push(id);
          const idx = currentPaid.indexOf(id);
          if (idx !== -1) currentPaid.splice(idx, 1);
        }
      }

      // Add receive ID if payment was made
      if (receiveId && !currentReceive.includes(receiveId)) {
        currentReceive.push(receiveId);
      }

      await customerAccount.update(
        {
          paid: currentPaid,
          unpaid: currentUnpaid,
          total: currentTotal,
          receive: currentReceive,
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.status(201).json({
      message: "Sale recorded successfully",
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount,
        paidAmount: receiptAmount,
        remainingAmount,
        status: bill.status,
      },
      sells: createdSells,
      receive: receiveId ? { id: receiveId, amount: receiptAmount } : null,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("CREATE SELL ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ===============================
   GET ALL SELLS (with bill & product)
================================ */
export const getAllSells = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Sells.findAndCountAll({
      include: [
        {
          model: StockExist,
          as: "product",
          attributes: ["id", "name", "departmentId"],
        },
        {
          model: Bill,
          as: "bill",
          attributes: ["id", "billNumber", "date", "totalAmount", "paidAmount", "remainingAmount", "status", "sells"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      sells: rows,
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
    console.error(error);
    res.status(500).json({ message: "Failed to fetch sells" });
  }
};

/* ===============================
   GET SELL BY ID
================================ */
export const getSellById = async (req, res) => {
  try {
    const { id } = req.params;
    const sell = await Sells.findByPk(id, {
      include: [
        { model: StockExist, as: "product" },
        { model: Bill, as: "bill" },
      ],
    });
    if (!sell) return res.status(404).json({ message: "Sell not found" });
    res.json(sell);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ===============================
   UPDATE SELL (requires careful stock & bill adjustment)
================================ */
export const updateSell = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { id } = req.params;
  try {
    const { amount, unit_price } = req.body;
    const sell = await Sells.findByPk(id, { transaction });
    if (!sell) {
      await transaction.rollback();
      return res.status(404).json({ message: "Sell not found" });
    }

    const oldAmount = sell.amount;
    const oldUnitPrice = sell.unit_price;
    const newAmount = amount ?? oldAmount;
    const newUnitPrice = unit_price ?? oldUnitPrice;

    if (newAmount <= 0 || newUnitPrice <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Amount and unit price must be positive" });
    }

    // Update stock (StockExist)
    const stock = await StockExist.findByPk(sell.exist, { transaction, lock: transaction.LOCK.UPDATE });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "Associated product not found" });
    }

    const quantityDiff = newAmount - oldAmount;
    if (quantityDiff > 0 && stock.amount < quantityDiff) {
      await transaction.rollback();
      return res.status(400).json({ message: "Insufficient stock for increase" });
    }

    // Update stock amount
    await stock.update({ amount: stock.amount - quantityDiff }, { transaction });

    // Update sell record
    const newTotal = newAmount * newUnitPrice;
    await sell.update(
      {
        amount: newAmount,
        unit_price: newUnitPrice,
        total: newTotal,
        remaind: newTotal,
      },
      { transaction }
    );

    // Update linked bill totals
    const bill = await Bill.findByPk(sell.billId, { transaction });
    if (bill) {
      const allSells = await Sells.findAll({ where: { billId: bill.id }, transaction });
      const newBillTotal = allSells.reduce((sum, s) => sum + parseFloat(s.total), 0);
      const newRemaining = newBillTotal - bill.paidAmount;
      await bill.update(
        {
          totalAmount: newBillTotal,
          remainingAmount: newRemaining > 0 ? newRemaining : 0,
          status: newRemaining === 0 ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
        },
        { transaction }
      );
    }

    await transaction.commit();
    res.json({ message: "Sell updated successfully", sell: await sell.reload() });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ===============================
   DELETE SELL
================================ */
export const deleteSell = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { id } = req.params;
  try {
    const sell = await Sells.findByPk(id, { transaction });
    if (!sell) {
      await transaction.rollback();
      return res.status(404).json({ message: "Sell not found" });
    }

    // Restore stock
    const stock = await StockExist.findByPk(sell.exist, { transaction });
    if (stock) {
      await stock.update({ amount: stock.amount + sell.amount }, { transaction });
    }

    // Update bill totals and remove sell ID from bill.sells array
    const bill = await Bill.findByPk(sell.billId, { transaction });
    if (bill) {
      // Remove this sell ID from bill.sells
      const updatedSellsArray = (bill.sells || []).filter(sid => sid !== sell.id);
      await bill.update({ sells: updatedSellsArray }, { transaction });

      const allSells = await Sells.findAll({ where: { billId: bill.id }, transaction });
      const remainingSells = allSells.filter(s => s.id !== sell.id);
      const newBillTotal = remainingSells.reduce((sum, s) => sum + parseFloat(s.total), 0);
      const newRemaining = newBillTotal - bill.paidAmount;
      await bill.update(
        {
          totalAmount: newBillTotal,
          remainingAmount: newRemaining > 0 ? newRemaining : 0,
          status: newRemaining === 0 ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
        },
        { transaction }
      );
    }

    // Remove sell ID from CustomerAccount arrays
    const customerAccount = await CustomerAccount.findOne({
      where: { customerId: bill?.customerId },
      transaction,
    });
    if (customerAccount) {
      const filterId = (arr) => arr.filter(i => i !== sell.id);
      await customerAccount.update(
        {
          total: filterId(customerAccount.total),
          paid: filterId(customerAccount.paid),
          unpaid: filterId(customerAccount.unpaid),
        },
        { transaction }
      );
    }

    await sell.destroy({ transaction });
    await transaction.commit();
    res.json({ message: "Sell deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ===============================
   RETURN SELL
================================ */
export const returnSell = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { sellId, quantity, refundedMoney, unitPrice } = req.body;
    if (!sellId || !quantity || quantity <= 0 || !refundedMoney || refundedMoney < 0) {
      return res.status(400).json({ error: "sellId, quantity (>0) and refundedMoney are required" });
    }

    const originalSell = await Sells.findByPk(sellId, { transaction });
    if (!originalSell) {
      await transaction.rollback();
      return res.status(404).json({ error: "Original sell not found" });
    }

    if (quantity > originalSell.amount) {
      await transaction.rollback();
      return res.status(400).json({ error: "Return quantity exceeds sold amount" });
    }

    const stock = await StockExist.findByPk(originalSell.exist, { transaction, lock: transaction.LOCK.UPDATE });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    // Increase stock
    await stock.update({ amount: stock.amount + quantity }, { transaction });

    // Create return sell record
    const returnSell = await Sells.create(
      {
        exist: originalSell.exist,
        amount: quantity,
        billId: originalSell.billId,
        unit_price: unitPrice || originalSell.unit_price,
        total: quantity * (unitPrice || originalSell.unit_price),
        receipt: 0,
        remaind: 0,
        is_returned: true,
      },
      { transaction }
    );

    // Update bill: add return sell ID to sells array and adjust totals
    const bill = await Bill.findByPk(originalSell.billId, { transaction });
    if (bill) {
      // Add return sell ID to bill.sells array
      const currentSells = bill.sells || [];
      if (!currentSells.includes(returnSell.id)) {
        await bill.update({ sells: [...currentSells, returnSell.id] }, { transaction });
      }

      const newTotal = bill.totalAmount - returnSell.total;
      const newRemaining = newTotal - bill.paidAmount;
      await bill.update(
        {
          totalAmount: newTotal,
          remainingAmount: newRemaining > 0 ? newRemaining : 0,
          status: newRemaining === 0 ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid",
        },
        { transaction }
      );
    }

    // Update CustomerAccount: add returnSell.id to `returned` array
    const customerAccount = await CustomerAccount.findOne({
      where: { customerId: bill.customerId },
      transaction,
    });
    if (customerAccount) {
      const returnedArr = [...(customerAccount.returned || []), returnSell.id];
      await customerAccount.update({ returned: returnedArr }, { transaction });
    }

    // If refundedMoney > 0, create Return_Pay record
    if (refundedMoney > 0) {
      const customer = await Customer.findByPk(bill.customerId, { transaction });
      await Return_Pay.create(
        {
          To: customer.fullname,
          amount: refundedMoney,
          description: `Refund for return of sell #${originalSell.id}`,
        },
        { transaction }
      );
    }

    await transaction.commit();
    res.status(201).json({ message: "Return processed", returnSell });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ===============================
   GET SELLS BY DATE RANGE
================================ */
export const getSellsByDateRange = async (req, res) => {
  const { from, to, customerId, departmentId } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: "from and to dates required" });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    const include = [
      { model: StockExist, as: "product", attributes: ["id", "name", "departmentId"] },
      { model: Bill, as: "bill", attributes: ["id", "billNumber", "totalAmount", "paidAmount", "sells"] },
    ];

    if (customerId) {
      include.push({
        model: Bill,
        as: "bill",
        where: { customerId },
      });
    }
    if (departmentId) {
      include[0].where = { departmentId };
    }

    const sells = await Sells.findAll({
      where: whereClause,
      include,
      order: [["createdAt", "DESC"]],
    });

    // Aggregate by bill
    const uniqueBills = new Map();
    for (const s of sells) {
      if (s.bill && !uniqueBills.has(s.bill.id)) uniqueBills.set(s.bill.id, s.bill);
    }
    const totalBillPaid = Array.from(uniqueBills.values()).reduce((sum, b) => sum + b.paidAmount, 0);
    const totalBillAmount = Array.from(uniqueBills.values()).reduce((sum, b) => sum + b.totalAmount, 0);
    const totalRemaining = totalBillAmount - totalBillPaid;

    res.json({
      success: true,
      data: {
        sells,
        totalCount: sells.length,
        totalAmount: totalBillAmount,
        totalReceived: totalBillPaid,
        totalRemained: totalRemaining,
        filters: { from, to, customerId: customerId || null, departmentId: departmentId || null },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching sells", error: error.message });
  }
};