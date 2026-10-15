import sequelize from "../../dbconnection.js";
import Customer from "../../Models/Customer/Customers.js";
import Sells from "../../Models/Stock/Sells.js";
import { Op } from "sequelize";
// controllers/billController.js (or sellController.js)
import { Bill, StockExist, Department, CustomerAccount, Receive, Benefit } from '../../Models/index.js';

/* ===============================
   CREATE A NEW BILL
================================ */
export const createBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      billNumber,
      customerId,
      date,
      totalAmount,
      paidAmount,
      status,
      notes,
      discount_percent,
      discounted_amount,
      sells // Array of sell IDs
    } = req.body;

    // Validate customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Validate and get the sells records
    let sellRecords = [];
    if (sells && sells.length > 0) {
      sellRecords = await Sells.findAll({
        where: { id: sells },
        include: [
          {
            model: StockExist,
            as: "sellStockExist",
            attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
          }
        ],
        transaction
      });
      
      if (sellRecords.length !== sells.length) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          message: "One or more sells not found" 
        });
      }
    }

    // Calculate remaining amount
    const remainingAmount = (totalAmount || 0) - (paidAmount || 0);

    // Create bill with sells IDs array
    const bill = await Bill.create({
      billNumber,
      customerId,
      date: date || new Date(),
      totalAmount: totalAmount || 0,
      paidAmount: paidAmount || 0,
      remainingAmount,
      status: status || (remainingAmount === 0 ? "paid" : remainingAmount < totalAmount ? "partial" : "unpaid"),
      notes,
      discount_percent: discount_percent || 0,
      discounted_amount: discounted_amount || 0,
      sells: sells || [] // Store array of sell IDs
    }, { transaction });

    await transaction.commit();

    // Fetch the created bill with associations
    const createdBill = await Bill.findByPk(bill.id, {
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Bill created successfully",
      bill: createdBill,
      sells: sellRecords
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in createBill:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create bill", 
      error: error.message 
    });
  }
};



/* ===============================
   DELETE A BILL
================================ */
export const deleteBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const bill = await Bill.findByPk(id);
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    // Optionally, you might want to update the status of associated sells
    // or perform other cleanup operations here

    await bill.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Bill deleted successfully"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in deleteBill:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete bill", 
      error: error.message 
    });
  }
};

/* ===============================
   GET BILLS BY STATUS
================================ */
export const getBillsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Validate status
    if (!["paid", "partial", "unpaid"].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status. Must be 'paid', 'partial', or 'unpaid'" 
      });
    }

    const { count, rows } = await Bill.findAndCountAll({
      where: { status },
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      bills: rows,
      status,
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
    console.error("Error in getBillsByStatus:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch bills by status", 
      error: error.message 
    });
  }
};

/* ===============================
   GET BILLS WITH PAYMENT SUMMARY
================================ */
export const getBillsWithPaymentSummary = async (req, res) => {
  try {
    const bills = await Bill.findAll({
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const summary = {
      totalBills: bills.length,
      totalAmount: bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0),
      totalPaid: bills.reduce((sum, b) => sum + parseFloat(b.paidAmount), 0),
      totalRemaining: bills.reduce((sum, b) => sum + parseFloat(b.remainingAmount), 0),
      paidBills: bills.filter(b => b.status === "paid").length,
      partialBills: bills.filter(b => b.status === "partial").length,
      unpaidBills: bills.filter(b => b.status === "unpaid").length,
    };

    res.json({
      success: true,
      bills,
      summary
    });
  } catch (error) {
    console.error("Error in getBillsWithPaymentSummary:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch bills summary", 
      error: error.message 
    });
  }
};

/* ===============================
   GET BILLS BY SELL ID
================================ */
export const getBillsBySellId = async (req, res) => {
  try {
    const { sellId } = req.params;

    // Check if sell exists
    const sell = await Sells.findByPk(sellId, {
      include: [
        {
          model: StockExist,
          as: "sellStockExist",
          attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
        }
      ]
    });

    if (!sell) {
      return res.status(404).json({ success: false, message: "Sell not found" });
    }

    // Find bills that include this sell ID in their sells array
    const bills = await Bill.findAll({
      where: {
        sells: {
          [Op.contains]: [parseInt(sellId)]
        }
      },
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      bills,
      sell,
      count: bills.length
    });
  } catch (error) {
    console.error("Error in getBillsBySellId:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch bills by sell ID", 
      error: error.message 
    });
  }
};

/* ===============================
   GET ALL BILLS (with customer, sells items, products)
================================ */
export const getAllBills = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Bill.findAndCountAll({
      distinct: true,
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price","code_number"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      bills: rows,
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
    console.error("Error in getAllBills:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bills", error: error.message });
  }
};

/* ===============================
   GET SINGLE BILL BY ID
================================ */
export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByPk(id, {
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price", "code_number"],
            },
          ],
        },
      ],
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    const sells = bill.billSells || [];

    res.json({
      success: true,
      bill: {
        ...bill.toJSON(),
        billSells: undefined,
      },
      sells,
    });
  } catch (error) {
    console.error("Error in getBillById:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ===============================
   GET BILLS BY DATE RANGE
================================ */
export const getBillsByDateRange = async (req, res) => {
  const { from, to, customerId } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: "from and to dates are required" });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
    };
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const bills = await Bill.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["date", "DESC"]],
    });

    const totalBilled = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paidAmount), 0);
    const totalRemaining = totalBilled - totalPaid;

    res.json({
      success: true,
      bills,
      summary: {
        totalBills: bills.length,
        totalAmount: totalBilled,
        totalPaid,
        totalRemaining,
      },
      filters: { from, to, customerId: customerId || null },
    });
  } catch (error) {
    console.error("Error in getBillsByDateRange:", error);
    res.status(500).json({ success: false, message: "Error fetching bills", error: error.message });
  }
};

/* ===============================
   GET BILLS BY CUSTOMER ID
================================ */
export const getBillsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const bills = await Bill.findAll({
      where: { customerId },
      include: [
        {
          model: Customer,
          as: "billCustomer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells",
          include: [
            {
              model: StockExist,
              as: "sellStockExist",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalSpent = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paidAmount), 0);

    res.json({
      success: true,
      customer: { id: customer.id, fullname: customer.fullname },
      bills,
      summary: {
        totalBills: bills.length,
        totalSpent,
        totalPaid,
        outstandingBalance: totalSpent - totalPaid,
      },
    });
  } catch (error) {
    console.error("Error in getBillsByCustomer:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
// ---------- Helper: safeParse ----------
const safeParse = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
};

// ---------- Helper: remove sells from CustomerAccount ----------
async function removeSellsFromCustomerAccount({
  customerId,
  allSellsByDept,
  paidSellsByDept,
  unpaidSellsByDept,
  transaction,
}) {
  const account = await CustomerAccount.findOne({
    where: { customerId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!account) return;

  const currentTotal = safeParse(account.total) || {};
  const currentPaid = safeParse(account.paid) || {};
  const currentUnpaid = safeParse(account.unpaid) || {};

  const removeFromObject = (obj, removals) => {
    const newObj = { ...obj };
    for (const [deptId, idsToRemove] of Object.entries(removals)) {
      if (!Array.isArray(idsToRemove)) continue;
      if (newObj[deptId] && Array.isArray(newObj[deptId])) {
        newObj[deptId] = newObj[deptId].filter(id => !idsToRemove.includes(id));
        if (newObj[deptId].length === 0) delete newObj[deptId];
      }
    }
    return newObj;
  };

  await account.update({
    total: removeFromObject(currentTotal, allSellsByDept),
    paid: removeFromObject(currentPaid, paidSellsByDept),
    unpaid: removeFromObject(currentUnpaid, unpaidSellsByDept),
  }, { transaction });
}

// ---------- Helper: add sells and receives to CustomerAccount ----------
async function addSellsToCustomerAccount({
  customerId,
  allSellsByDept,
  paidSellsByDept,
  unpaidSellsByDept,
  receiveIds = [],
  transaction,
}) {
  let account = await CustomerAccount.findOne({
    where: { customerId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!account) {
    account = await CustomerAccount.create({
      customerId,
      total: {},
      paid: {},
      unpaid: {},
      receive: [],
    }, { transaction });
  }

  const currentTotal = safeParse(account.total) || {};
  const currentPaid = safeParse(account.paid) || {};
  const currentUnpaid = safeParse(account.unpaid) || {};
  const currentReceive = safeParse(account.receive) || [];

  const mergeObjectArrays = (existingObj, additions) => {
    const newObj = { ...existingObj };
    for (const [deptId, ids] of Object.entries(additions)) {
      if (!Array.isArray(ids)) continue;
      const existing = Array.isArray(newObj[deptId]) ? newObj[deptId] : [];
      newObj[deptId] = [...existing, ...ids];
    }
    return newObj;
  };

  await account.update({
    total: mergeObjectArrays(currentTotal, allSellsByDept),
    paid: mergeObjectArrays(currentPaid, paidSellsByDept),
    unpaid: mergeObjectArrays(currentUnpaid, unpaidSellsByDept),
    receive: [...currentReceive, ...receiveIds],
  }, { transaction });
}

// ---------- Helper: remove receives from CustomerAccount ----------
async function removeReceivesFromCustomerAccount({
  customerId,
  receiveIds,
  transaction,
}) {
  if (!receiveIds || receiveIds.length === 0) return;
  const account = await CustomerAccount.findOne({
    where: { customerId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!account) return;

  const currentReceive = safeParse(account.receive) || [];
  const updatedReceive = currentReceive.filter(id => !receiveIds.includes(id));
  await account.update({ receive: updatedReceive }, { transaction });
}

// ---------- Main controller ----------
export const updateBill = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Bill ID is required' });
  const billId = parseInt(id, 10);
  if (isNaN(billId)) return res.status(400).json({ error: 'Bill ID must be a number' });

  const {
    items,
    receipt,
    notes,
    billDiscountPercent,
    billDiscountAmount,
    customerId,
    departmentReceipts,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  if (receipt === undefined || receipt < 0) {
    return res.status(400).json({ error: 'Valid receipt amount is required' });
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch existing bill with sells
    const bill = await Bill.findByPk(billId, {
      include: [{ model: Sells, as: 'billSells' }],
      transaction
    });
    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Bill not found' });
    }

    const oldCustomerId = bill.customerId;
    const newCustomerId = customerId || oldCustomerId;

    // 2. Fetch old receives
    const oldReceives = await Receive.findAll({
      where: { billId: billId },
      transaction
    });
    const oldReceiveIds = oldReceives.map(r => r.id);

    // 3. Group old sells by department
    const oldSells = bill.billSells || [];
    const oldAllByDept = {};
    const oldPaidByDept = {};
    const oldUnpaidByDept = {};
    for (const sell of oldSells) {
      const deptId = sell.departmentId;
      if (!deptId) continue;
      if (!oldAllByDept[deptId]) oldAllByDept[deptId] = [];
      oldAllByDept[deptId].push(sell.id);
      if (sell.remaind === 0) {
        if (!oldPaidByDept[deptId]) oldPaidByDept[deptId] = [];
        oldPaidByDept[deptId].push(sell.id);
      } else {
        if (!oldUnpaidByDept[deptId]) oldUnpaidByDept[deptId] = [];
        oldUnpaidByDept[deptId].push(sell.id);
      }
    }

    // 4. Remove old sells & receives from CustomerAccount
    if (oldCustomerId) {
      await removeSellsFromCustomerAccount({
        customerId: oldCustomerId,
        allSellsByDept: oldAllByDept,
        paidSellsByDept: oldPaidByDept,
        unpaidSellsByDept: oldUnpaidByDept,
        transaction,
      });
      if (oldReceiveIds.length > 0) {
        await removeReceivesFromCustomerAccount({
          customerId: oldCustomerId,
          receiveIds: oldReceiveIds,
          transaction,
        });
      }
    }

    // 5. Reverse stock for old sells
    for (const sell of oldSells) {
      await StockExist.increment(
        { amount: sell.amount },
        { where: { id: sell.exist }, transaction }
      );
    }

    // 6. Delete old sells & receives
    await Sells.destroy({ where: { billId: billId }, transaction });
    await Receive.destroy({ where: { billId: billId }, transaction });

    // 7. Process new items → prepare sells & collect department totals
    const receiptAmount = parseFloat(receipt) || 0;
    let totalAmount = 0;
    const deptTotals = {};
    const preparedItems = [];

    for (const item of items) {
      const {
        existId,
        amount,
        unit_price,
        departmentId,
        discount_percent = 0,
        discount_amount = 0,
        discounted_total
      } = item;

      if (!existId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each item must have a valid existId' });
      }

      const stock = await StockExist.findByPk(existId, { transaction });
      if (!stock) {
        await transaction.rollback();
        return res.status(404).json({ error: `Stock item ${existId} not found` });
      }
      if (stock.amount < amount) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient stock for ${stock.name} (available: ${stock.amount}, requested: ${amount})`
        });
      }

      await StockExist.decrement({ amount }, { where: { id: existId }, transaction });

      const lineTotal = discounted_total || (amount * unit_price - discount_amount);
      totalAmount += parseFloat(lineTotal);
      if (departmentId) {
        deptTotals[departmentId] = (deptTotals[departmentId] || 0) + parseFloat(lineTotal);
      }

      preparedItems.push({
        existId,
        amount,
        unit_price,
        departmentId,
        discount_percent,
        discount_amount,
        discounted_total: lineTotal,
        stockRecord: stock,
      });
    }

    // 8. Determine per-department payments (raw amounts)
    let deptPayments = {};
    if (departmentReceipts && typeof departmentReceipts === 'object' && Object.keys(departmentReceipts).length > 0) {
      deptPayments = { ...departmentReceipts };
    } else {
      // Fallback: proportional distribution
      if (totalAmount > 0) {
        let remaining = receiptAmount;
        for (const [deptId, deptTotal] of Object.entries(deptTotals)) {
          const proportion = deptTotal / totalAmount;
          let amount = Math.round(receiptAmount * proportion);
          if (amount > remaining) amount = remaining;
          deptPayments[deptId] = amount;
          remaining -= amount;
        }
        if (remaining > 0) {
          const firstDept = Object.keys(deptPayments)[0];
          if (firstDept) deptPayments[firstDept] += remaining;
        }
      }
    }

    // 9. Allocate receipt to each sell (using department pools)
    const deptRemaining = { ...deptPayments };
    const sellsData = [];
    for (const item of preparedItems) {
      const deptId = item.departmentId;
      const lineTotal = item.discounted_total;
      let allocatedReceipt = 0;
      if (deptRemaining[deptId] && deptRemaining[deptId] > 0) {
        allocatedReceipt = Math.min(deptRemaining[deptId], lineTotal);
        deptRemaining[deptId] -= allocatedReceipt;
      }
      sellsData.push({ ...item, receipt: allocatedReceipt, remaind: lineTotal - allocatedReceipt });
    }

    // 10. Create new sells
    const newSellIds = [];
    const newAllByDept = {};
    const newPaidByDept = {};
    const newUnpaidByDept = {};

    for (const sellInfo of sellsData) {
      const sell = await Sells.create({
        exist: sellInfo.existId,
        amount: sellInfo.amount,
        billId: billId,
        departmentId: sellInfo.departmentId,
        unit_price: sellInfo.unit_price,
        discount_percent: sellInfo.discount_percent,
        discount_amount: sellInfo.discount_amount,
        total: sellInfo.discounted_total,
        receipt: sellInfo.receipt,
        remaind: sellInfo.remaind,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { transaction });

      newSellIds.push(sell.id);

      const deptId = sellInfo.departmentId;
      if (deptId) {
        if (!newAllByDept[deptId]) newAllByDept[deptId] = [];
        newAllByDept[deptId].push(sell.id);
        if (sellInfo.remaind === 0) {
          if (!newPaidByDept[deptId]) newPaidByDept[deptId] = [];
          newPaidByDept[deptId].push(sell.id);
        } else {
          if (!newUnpaidByDept[deptId]) newUnpaidByDept[deptId] = [];
          newUnpaidByDept[deptId].push(sell.id);
        }
      }

      // Create benefit
      const costPrice = sellInfo.stockRecord.unit_price;
      const revenue = sellInfo.discounted_total;
      const cost = costPrice * sellInfo.amount;
      const benefitAmount = revenue - cost;
      const benefit = await Benefit.create({
        amount: benefitAmount,
        sellId: sell.id,
        departmentId: sellInfo.departmentId,
      }, { transaction });

      // Update department benefit arrays
      const department = await Department.findByPk(sellInfo.departmentId, { transaction });
      if (department) {
        const numericBenefitId = typeof benefit.id === 'number' ? benefit.id : Number(benefit.id);
        if (sellInfo.remaind === 0) {
          let realizedArray = department.realizedBenefit || [];
          if (typeof realizedArray === "string") realizedArray = JSON.parse(realizedArray);
          if (!Array.isArray(realizedArray)) realizedArray = [];
          realizedArray = realizedArray.map(id => typeof id === 'number' ? id : Number(id));
          realizedArray.push(numericBenefitId);
          await department.update({ realizedBenefit: realizedArray }, { transaction });
        } else {
          let benefitArray = department.benifit || [];
          if (typeof benefitArray === "string") benefitArray = JSON.parse(benefitArray);
          if (!Array.isArray(benefitArray)) benefitArray = [];
          benefitArray = benefitArray.map(id => typeof id === 'number' ? id : Number(id));
          benefitArray.push(numericBenefitId);
          await department.update({ benifit: benefitArray }, { transaction });
        }
      }
    }

    // 11. Create Receives (positive only, per department)
    const receiveIds = [];

    for (const deptId of Object.keys(deptTotals)) {
      const deptTotal = deptTotals[deptId];
      const specifiedAmount = deptPayments[deptId] || 0;

      const positiveAmount = Math.min(specifiedAmount, deptTotal); // cap at department total

      if (positiveAmount > 0) {
        const receive = await Receive.create({
          customer: newCustomerId,
          amount: positiveAmount,
          description: `Payment for bill ${bill.billNumber} - dept ${deptId}`,
          billId: billId,
          departmentId: parseInt(deptId, 10),
          sellId: null,
          createdAt: new Date(),
        }, { transaction });
        receiveIds.push(receive.id);
      }
    }

    // 12. Update bill
    const effectivePaid = Math.min(receiptAmount, totalAmount);
    const remainingAmount = totalAmount - effectivePaid;
    let status = 'unpaid';
    if (remainingAmount === 0) status = 'paid';
    else if (effectivePaid > 0) status = 'partial';

    await bill.update({
      customerId: newCustomerId,
      totalAmount: totalAmount,
      paidAmount: effectivePaid,
      remainingAmount: remainingAmount,
      status: status,
      notes: notes !== undefined ? notes : bill.notes,
      discount_percent: billDiscountPercent || 0,
      discounted_amount: billDiscountAmount || 0,
      sells: newSellIds,
      updatedAt: new Date()
    }, { transaction });

    // 13. Update CustomerAccount
    if (newCustomerId) {
      await addSellsToCustomerAccount({
        customerId: newCustomerId,
        allSellsByDept: newAllByDept,
        paidSellsByDept: newPaidByDept,
        unpaidSellsByDept: newUnpaidByDept,
        receiveIds: receiveIds,
        transaction,
      });
    }

    await transaction.commit();

    const updatedBill = await Bill.findByPk(billId, {
      include: [
        { model: Sells, as: 'billSells' },
        { model: Receive, as: 'billReceives' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Bill updated successfully',
      bill: updatedBill
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update bill error:', error);
    res.status(500).json({
      error: 'Failed to update bill',
      details: error.message
    });
  }
};