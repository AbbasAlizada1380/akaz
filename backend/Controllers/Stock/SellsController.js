import { Op } from "sequelize";
import sequelize from "../../dbconnection.js";
import Sells from "../../Models/Stock/Sells.js";
import { Bill } from "../../Models/index.js";
import StockExist from "../../Models/Stock/StockExist.js";
import Customer from "../../Models/Customer/Customers.js";
import CustomerAccount from "../../Models/Customer/CustomerAccount.js";
import Receive from "../../Models/Finance/Receive.js";
import Return_Pay from "../../Models/Finance/Return_Pay.js";
import { Benefit } from "../../Models/index.js";
import { Department } from "../../Models/index.js";

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
    const {
      customerId,
      newCustomerName,
      items,
      receipt,
      notes,
      billDiscountPercent,
      billDiscountAmount,
      departmentReceipts, // object { deptId: amount }
    } = req.body;

    // --- Validation ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "At least one item is required" });
    }
    // Removed negative receipt restriction: `if (receipt && receipt < 0)` is gone.

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
    let totalDiscountedAmount = 0;
    const deptTotals = {};

    for (const item of items) {
      // Destructure each item
      const {
        existId,
        amount,
        unit_price,
        discount_percent = 0,
        discount_amount = 0,
        discounted_total,
      } = item;

      // Removed positive amount restrictions.
      if (!existId || amount === undefined || amount === null || unit_price === undefined || unit_price === null) {
        await transaction.rollback();
        return res.status(400).json({ message: "Each item must have existId, amount and unit_price" });
      }
      
      // Removed 0-100 percent limit so negative (markups) can be passed.
      
      // Check stock
      const stock = await StockExist.findByPk(existId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!stock) {
        await transaction.rollback();
        return res.status(404).json({ message: `Product with id ${existId} not found` });
      }
      
      // Calculate what the stock WILL BE after the transaction.
      // If amount is positive, stock goes down. If amount is negative, stock goes up.
      const newStockAmount = stock.amount - amount;
      
      // Only block if we are taking more than available (i.e. newStockAmount goes below 0)
      if (newStockAmount < 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${stock.name}. Available: ${stock.amount}, Requested: ${amount}`,
        });
      }

      // Compute line total
      const finalLineTotal = discounted_total !== undefined
        ? discounted_total
        : (amount * unit_price - discount_amount);
      totalDiscountedAmount += finalLineTotal;

      const deptId = stock.departmentId;
      deptTotals[deptId] = (deptTotals[deptId] || 0) + finalLineTotal;

      preparedItems.push({
        existId,
        amount,
        unit_price,
        discount_percent,
        discount_amount,
        discounted_total: finalLineTotal,
        departmentId: deptId,
        stockRecord: stock,
      });
    }

    const receiptAmount = parseFloat(receipt) || 0;
    // If the total is negative (a return) and receipt is 0, this logic still works.
    const effectiveReceipt = Math.min(receiptAmount, totalDiscountedAmount);
    const remainingAmount = totalDiscountedAmount - effectiveReceipt;

    // --- Determine per-department payments ---
    let deptPayments = {};

    if (departmentReceipts && typeof departmentReceipts === 'object' && Object.keys(departmentReceipts).length > 0) {
      deptPayments = { ...departmentReceipts };
      
      // Cap each department payment to its total (works with negatives too)
      for (const [deptId, paid] of Object.entries(deptPayments)) {
        const deptTotal = deptTotals[parseInt(deptId)] || 0;
        // If deptTotal is positive, paid can't be greater than it.
        // If deptTotal is negative, paid can't be less than it.
        if (deptTotal >= 0 && paid > deptTotal) {
          deptPayments[deptId] = deptTotal;
        } else if (deptTotal < 0 && paid < deptTotal) {
          deptPayments[deptId] = deptTotal;
        }
      }
      
      const totalDeptPayments = Object.values(deptPayments).reduce((a, b) => a + b, 0);
      if (totalDeptPayments > effectiveReceipt && totalDeptPayments > 0) {
        const scale = effectiveReceipt / totalDeptPayments;
        for (const deptId in deptPayments) {
          deptPayments[deptId] = Math.round(deptPayments[deptId] * scale);
        }
      }
    } else {
      // Fallback: proportional distribution
      if (totalDiscountedAmount !== 0) {
        let remaining = effectiveReceipt;
        for (const [deptId, deptTotal] of Object.entries(deptTotals)) {
          const proportion = deptTotal / totalDiscountedAmount;
          let amount = Math.round(effectiveReceipt * proportion);
          if (amount > remaining) amount = remaining;
          deptPayments[deptId] = amount;
          remaining -= amount;
        }
        // Adjust rounding
        if (remaining !== 0) {
          const firstDept = Object.keys(deptPayments)[0];
          if (firstDept) deptPayments[firstDept] += remaining;
        }
      }
    }

    // --- Allocate receipt to each sell using department pools ---
    const deptRemaining = { ...deptPayments };
    const sellsData = [];

    for (const item of preparedItems) {
      const deptId = item.departmentId;
      const lineTotal = item.discounted_total;
      let allocatedReceipt = 0;

      if (deptRemaining[deptId] && deptRemaining[deptId] !== 0) {
        // Allocate based on the line total (works for negative amounts too)
        if (lineTotal > 0) {
          allocatedReceipt = Math.min(deptRemaining[deptId], lineTotal);
          deptRemaining[deptId] -= allocatedReceipt;
        } else if (lineTotal < 0) {
           allocatedReceipt = Math.max(deptRemaining[deptId], lineTotal);
           deptRemaining[deptId] -= allocatedReceipt;
        }
      }

      const remaind = lineTotal - allocatedReceipt;

      sellsData.push({
        existId: item.existId,
        amount: item.amount,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        discounted_total: lineTotal,
        receipt: allocatedReceipt,
        remaind: remaind,
        departmentId: deptId,
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
        totalAmount: totalDiscountedAmount,
        paidAmount: effectiveReceipt,
        remainingAmount,
        status: remainingAmount === 0 ? "paid" : effectiveReceipt !== 0 ? "partial" : "unpaid",
        notes: notes || null,
        discount_percent: billDiscountPercent !== undefined ? billDiscountPercent : null,
        discounted_amount: billDiscountAmount !== undefined ? billDiscountAmount : null,
        sells: [],
      },
      { transaction }
    );

    // --- Create Sells, update stock, create Benefits, and group by department ---
    const createdSells = [];
    const allSellsByDept = {};
    const paidSellsByDept = {};
    const unpaidSellsByDept = {};

    for (const sellInfo of sellsData) {
      // Create sell
      const sell = await Sells.create(
        {
          exist: sellInfo.existId,
          amount: sellInfo.amount,
          billId: bill.id,
          unit_price: sellInfo.unit_price,
          discount_percent: sellInfo.discount_percent,
          discounted_amount: sellInfo.discount_amount,
          total: sellInfo.discounted_total,
          receipt: sellInfo.receipt,
          remaind: sellInfo.remaind,
          departmentId: sellInfo.departmentId,
        },
        { transaction }
      );
      createdSells.push(sell);

      // Update stock: If amount is negative, subtracting a negative adds to stock.
      await sellInfo.stockRecord.update(
        { amount: sellInfo.stockRecord.amount - sellInfo.amount },
        { transaction }
      );

      // Calculate benefit
      const costPrice = sellInfo.stockRecord.unit_price;
      const revenue = sellInfo.discounted_total;
      const cost = costPrice * sellInfo.amount;
      const benefitAmount = revenue - cost;

      // Create benefit record
      const benefit = await Benefit.create(
        {
          amount: benefitAmount,
          sellId: sell.id,
          departmentId: sellInfo.departmentId,
        },
        { transaction }
      );

      // Update department's benefit arrays
      const department = await Department.findByPk(sellInfo.departmentId, { transaction });
      if (department) {
        const numericBenefitId = typeof benefit.id === 'number' ? benefit.id : Number(benefit.id);

        if (sellInfo.remaind === 0) {
          let realizedArray = department.realizedBenefit;
          if (!realizedArray) realizedArray = [];
          if (typeof realizedArray === "string") realizedArray = JSON.parse(realizedArray);
          if (!Array.isArray(realizedArray)) realizedArray = [];
          realizedArray = realizedArray.map(id => typeof id === 'number' ? id : Number(id));
          realizedArray.push(numericBenefitId);
          await department.update({ realizedBenefit: realizedArray }, { transaction });
        } else {
          let benefitArray = department.benifit;
          if (!benefitArray) benefitArray = [];
          if (typeof benefitArray === "string") benefitArray = JSON.parse(benefitArray);
          if (!Array.isArray(benefitArray)) benefitArray = [];
          benefitArray = benefitArray.map(id => typeof id === 'number' ? id : Number(id));
          benefitArray.push(numericBenefitId);
          await department.update({ benifit: benefitArray }, { transaction });
        }
      }

      // Group sells for customer account
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

    // Update bill with sell IDs
    await bill.update({ sells: createdSells.map(s => s.id) }, { transaction });

    // --- Create Receives per department ---
    const receiveIds = [];
    for (const [deptId, amount] of Object.entries(deptPayments)) {
      if (amount !== 0) {
        const receive = await Receive.create(
          {
            customer: finalCustomerId,
            amount: amount,
            description: `Payment for bill ${billNumber} - department ${deptId}`,
            billId: bill.id,
            departmentId: parseInt(deptId, 10),
          },
          { transaction }
        );
        receiveIds.push(receive.id);
      }
    }

    // --- Update CustomerAccount ---
    await updateCustomerAccountAdvanced({
      customerId: finalCustomerId,
      allSellsByDept,
      paidSellsByDept,
      unpaidSellsByDept,
      receiveIds,
      transaction,
    });

    await transaction.commit();

    // --- Response ---
    res.status(201).json({
      message: "Sale recorded successfully",
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount: totalDiscountedAmount,
        paidAmount: effectiveReceipt,
        remainingAmount,
        status: bill.status,
        discount_percent: bill.discount_percent,
        discounted_amount: bill.discounted_amount,
      },
      sells: createdSells.map(s => ({
        id: s.id,
        total: s.total,
        receipt: s.receipt,
        remaind: s.remaind,
        departmentId: s.departmentId,
        discount_percent: s.discount_percent,
        discounted_amount: s.discounted_amount,
      })),
      receives: receiveIds.length > 0 ? receiveIds : null,
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
  receiveIds = [],
  transaction,
}) {
  // Helper to safely parse JSON fields
  const safeParse = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  };

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
        receive: [],
      },
      { transaction }
    );
  }

  // Parse existing data (if they are stored as JSON strings)
  const currentTotal = safeParse(account.total) || {};
  const currentPaid = safeParse(account.paid) || {};
  const currentUnpaid = safeParse(account.unpaid) || {};
  const currentReceive = safeParse(account.receive) || [];

  // Merge function for objects with array values
  const mergeObjectArrays = (existingObj, additions) => {
    const newObj = { ...existingObj };
    for (const [deptId, ids] of Object.entries(additions)) {
      if (!Array.isArray(ids)) continue;
      const existing = Array.isArray(newObj[deptId]) ? newObj[deptId] : [];
      newObj[deptId] = [...existing, ...ids];
    }
    return newObj;
  };

  const updatedTotal = mergeObjectArrays(currentTotal, allSellsByDept);
  const updatedPaid = mergeObjectArrays(currentPaid, paidSellsByDept);
  const updatedUnpaid = mergeObjectArrays(currentUnpaid, unpaidSellsByDept);
  const updatedReceive = [...currentReceive, ...receiveIds];

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
   UPDATE SELL
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

    // Removed positive checks. Now validates that they are numbers.
    if (isNaN(newAmount) || isNaN(newUnitPrice)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Amount and unit price must be valid numbers" });
    }

    // Update stock (StockExist)
    const stock = await StockExist.findByPk(sell.exist, { transaction, lock: transaction.LOCK.UPDATE });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ message: "Associated product not found" });
    }

    const quantityDiff = newAmount - oldAmount;
    // If increasing the positive amount, check if we have enough stock
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
    
    // Removed positive checks so negative quantities can be passed if needed.
    if (!sellId || quantity === undefined || refundedMoney === undefined) {
      return res.status(400).json({ error: "sellId, quantity and refundedMoney are required" });
    }

    const originalSell = await Sells.findByPk(sellId, { transaction });
    if (!originalSell) {
      await transaction.rollback();
      return res.status(404).json({ error: "Original sell not found" });
    }

    // Basic check: You can't return MORE than what was sold
    if (quantity > originalSell.amount) {
      await transaction.rollback();
      return res.status(400).json({ error: "Return quantity exceeds sold amount" });
    }

    const stock = await StockExist.findByPk(originalSell.exist, { transaction, lock: transaction.LOCK.UPDATE });
    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    // Increase stock (If quantity is negative, this decreases the stock)
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

    // If refundedMoney !== 0, create Return_Pay record
    if (refundedMoney !== 0) {
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