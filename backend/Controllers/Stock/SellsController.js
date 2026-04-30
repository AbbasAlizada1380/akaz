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

export const createSell = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { customerId, newCustomerName, items, receipt, notes } = req.body;

    // --- Validation ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "At least one item is required" });
    }
    if (receipt && receipt < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Receipt cannot be negative" });
    }

    // --- Customer handling ---
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

    // --- Prepare items & validate stock ---
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
        departmentId: stock.departmentId,
        stockRecord: stock,
      });
    }

    const receiptAmount = receipt ? parseFloat(receipt) : 0;
    const effectiveReceipt = Math.min(receiptAmount, totalAmount);
    const remainingAmount = totalAmount - effectiveReceipt;

    // --- Allocate receipt to each sell (starting from first item) ---
    let remainingReceipt = effectiveReceipt;
    const sellsData = [];
    for (const item of preparedItems) {
      const lineTotal = item.total;
      let allocatedReceipt = 0;
      if (remainingReceipt > 0) {
        allocatedReceipt = Math.min(remainingReceipt, lineTotal);
        remainingReceipt -= allocatedReceipt;
      }
      const remaind = lineTotal - allocatedReceipt;
      sellsData.push({
        existId: item.existId,
        amount: item.amount,
        unit_price: item.unit_price,
        total: lineTotal,
        receipt: allocatedReceipt,
        remaind: remaind,
        departmentId: item.departmentId,
        stockRecord: item.stockRecord,
      });
    }

    // --- Create Bill ---
    const billNumber = await generateBillNumber();
    const bill = await Bill.create(
      {
        billNumber,
        customerId: finalCustomerId,
        date: new Date(),
        totalAmount,
        paidAmount: effectiveReceipt,
        remainingAmount,
        status: remainingAmount === 0 ? "paid" : effectiveReceipt > 0 ? "partial" : "unpaid",
        notes: notes || null,
      },
      { transaction }
    );

    // --- Create Sells, update stock, and collect data for CustomerAccount ---
    const createdSells = [];
    const allSellsByDept = {};
    const paidSellsByDept = {};
    const unpaidSellsByDept = {};

    for (const sellInfo of sellsData) {
      const sell = await Sells.create(
        {
          exist: sellInfo.existId,
          amount: sellInfo.amount,
          billId: bill.id,
          unit_price: sellInfo.unit_price,
          total: sellInfo.total,
          receipt: sellInfo.receipt,
          remaind: sellInfo.remaind,
          departmentId: sellInfo.departmentId,
        },
        { transaction }
      );
      createdSells.push(sell);

      // Update stock
      await sellInfo.stockRecord.update(
        { amount: sellInfo.stockRecord.amount - sellInfo.amount },
        { transaction }
      );

      const deptId = sellInfo.departmentId;

      if (!allSellsByDept[deptId]) allSellsByDept[deptId] = [];
      allSellsByDept[deptId].push(sell.id);

      if (sellInfo.remaind === 0) {
        if (!paidSellsByDept[deptId]) paidSellsByDept[deptId] = [];
        paidSellsByDept[deptId].push(sell.id);
      } else {
        if (!unpaidSellsByDept[deptId]) unpaidSellsByDept[deptId] = [];
        unpaidSellsByDept[deptId].push(sell.id);
      }
    }

    const sellIds = createdSells.map(s => s.id);
    await bill.update({ sells: sellIds }, { transaction });

    // --- Create Receive record if payment was made ---
    let receiveId = null;
    if (effectiveReceipt > 0) {
      const receive = await Receive.create(
        {
          customer: finalCustomerId,
          amount: effectiveReceipt,
          description: `Payment for bill ${billNumber}`,
        },
        { transaction }
      );
      receiveId = receive.id;
    }

    // --- Update CustomerAccount (including the receive ID) ---
    await updateCustomerAccountAdvanced({
      customerId: finalCustomerId,
      allSellsByDept,
      paidSellsByDept,
      unpaidSellsByDept,
      receiveIds: receiveId ? [receiveId] : [],   // <-- NEW: pass array of receive IDs
      transaction,
    });

    await transaction.commit();

    res.status(201).json({
      message: "Sale recorded successfully",
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount,
        paidAmount: effectiveReceipt,
        remainingAmount,
        status: bill.status,
      },
      sells: createdSells.map(s => ({
        id: s.id,
        total: s.total,
        receipt: s.receipt,
        remaind: s.remaind,
        departmentId: s.departmentId,
      })),
      receive: receiveId ? { id: receiveId, amount: effectiveReceipt } : null,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("CREATE SELL ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function updateCustomerAccountAdvanced({
  customerId,
  allSellsByDept,
  paidSellsByDept,
  unpaidSellsByDept,
  receiveIds = [],   // array of receive IDs to append
  transaction,
}) {
  let account = await CustomerAccount.findOne({
    where: { customerId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!account) {
    account = await CustomerAccount.create(
      {
        customerId,
        total: {},
        paid: {},
        unpaid: {},
        receive: [],   // initialize as empty array
      },
      { transaction }
    );
  }

  // Helper to merge arrays (append new IDs)
  const mergeArrays = (existingObj, additions) => {
    const newObj = { ...existingObj };
    for (const [deptId, ids] of Object.entries(additions)) {
      if (!newObj[deptId]) newObj[deptId] = [];
      newObj[deptId] = [...newObj[deptId], ...ids];
    }
    return newObj;
  };

  // Helper to merge a simple array (for receive field)
  const mergeReceiveArray = (existingArray, newIds) => {
    return [...(existingArray || []), ...newIds];
  };

  const updatedTotal = mergeArrays(account.total || {}, allSellsByDept);
  const updatedPaid = mergeArrays(account.paid || {}, paidSellsByDept);
  const updatedUnpaid = mergeArrays(account.unpaid || {}, unpaidSellsByDept);
  const updatedReceive = mergeReceiveArray(account.receive || [], receiveIds);

  await account.update(
    {
      total: updatedTotal,
      paid: updatedPaid,
      unpaid: updatedUnpaid,
      receive: updatedReceive,
    },
    { transaction }
  );
}
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