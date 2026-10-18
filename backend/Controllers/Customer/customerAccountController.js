import sequelize from '../../dbconnection.js';
import {
  StockIncome, // kept for parity (unused)
  Receive,
  Sells,
  Bill,
  Customer,
  CustomerAccount,
  StockExist,
  Department,
} from '../../Models/index.js';
import { Op } from 'sequelize';

/* ============================================================
   Helpers
   ============================================================ */

// Coerce a value to an object-of-arrays keyed by department id
const normalizeDeptArrays = (value) => {
  if (!value) return {};
  let obj = value;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return {};
    }
  }
  if (Array.isArray(obj)) {
    // Legacy array format — leave as-is under a synthetic bucket
    return obj.length ? { unassigned: obj.map(Number) } : {};
  }
  if (typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      out[k] = v.map((id) => (typeof id === 'number' ? id : Number(id)));
    }
  }
  return out;
};

// Flatten an object-of-arrays into a single array of unique ids
const flattenDeptArrays = (value) => {
  const obj = normalizeDeptArrays(value);
  const ids = new Set();
  for (const arr of Object.values(obj)) {
    for (const id of arr) ids.add(id);
  }
  return [...ids];
};

// Safely parse a numeric string, preserving sign (no `|| 0` sign-loss)
const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Signed “settled” check: positive sell or negative sell, both are settled at remaind = 0
const isSettled = (sell) => toNumber(sell.remaind) === 0;

// A customer "owes" when they have at least one open sell (non-zero remaind)
// of either sign
const hasOpenBalance = (sellIds) => Array.isArray(sellIds) && sellIds.length > 0;

/* ============================================================
   CREATE
   ============================================================ */
export const createCustomerAccount = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerId, paid, unpaid, total, receive } = req.body;

    if (!customerId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'customerId is required' });
    }

    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Customer not found' });
    }

    // ⚠️ Keep objects, not arrays — createSell/createReceive write dept-keyed objects
    const accountData = {
      customerId,
      paid: normalizeDeptArrays(paid),
      unpaid: normalizeDeptArrays(unpaid),
      total: normalizeDeptArrays(total),
      receive: Array.isArray(receive)
        ? receive.map(Number)
        : normalizeDeptArrays(receive).unassigned || [],
    };

    const newAccount = await CustomerAccount.create(accountData, {
      transaction,
    });
    await transaction.commit();

    res.status(201).json({
      message: 'Customer account created successfully',
      data: newAccount,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create CustomerAccount Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   GET ALL
   ============================================================ */
export const getCustomerAccounts = async (req, res) => {
  try {
    const accounts = await CustomerAccount.findAll({
      include: [
        {
          model: Customer,
          as: 'customerAccountCustomer',
          attributes: ['id', 'fullname', 'phoneNumber', 'address'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    console.error('Get CustomerAccounts Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   GET BY ID
   ============================================================ */
export const getCustomerAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await CustomerAccount.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customerAccountCustomer',
          attributes: ['id', 'fullname', 'phoneNumber', 'address'],
        },
      ],
    });

    if (!account) {
      return res.status(404).json({ message: 'Customer account not found' });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    console.error('Get CustomerAccount By ID Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   UPDATE — merge instead of wipe
   ============================================================ */
export const updateCustomerAccount = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { customerId, paid, unpaid, total, receive } = req.body;

    const account = await CustomerAccount.findByPk(id, { transaction });
    if (!account) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Customer account not found' });
    }

    if (customerId && customerId !== account.customerId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Customer not found' });
      }
    }

    const patch = {};
    if (customerId !== undefined) patch.customerId = customerId;

    // Merge dept-keyed objects rather than replacing them
    if (paid !== undefined) {
      patch.paid = {
        ...normalizeDeptArrays(account.paid),
        ...normalizeDeptArrays(paid),
      };
    }
    if (unpaid !== undefined) {
      patch.unpaid = {
        ...normalizeDeptArrays(account.unpaid),
        ...normalizeDeptArrays(unpaid),
      };
    }
    if (total !== undefined) {
      patch.total = {
        ...normalizeDeptArrays(account.total),
        ...normalizeDeptArrays(total),
      };
    }
    if (receive !== undefined) {
      const existing = Array.isArray(account.receive)
        ? account.receive.map(Number)
        : [];
      const incoming = Array.isArray(receive)
        ? receive.map(Number)
        : normalizeDeptArrays(receive).unassigned || [];
      patch.receive = [...new Set([...existing, ...incoming])];
    }

    await account.update(patch, { transaction });
    await transaction.commit();

    res.status(200).json({
      message: 'Customer account updated successfully',
      data: account,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update CustomerAccount Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   DELETE
   ============================================================ */
export const deleteCustomerAccount = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const account = await CustomerAccount.findByPk(id, { transaction });

    if (!account) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Customer account not found' });
    }

    await account.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({ message: 'Customer account deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete CustomerAccount Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   CUSTOMERS WITH UNPAID — includes negative remaind
   ============================================================ */
export const getCustomersWithUnpaid = async (req, res) => {
  try {
    // 1. Pull all customer accounts (cheap on small data; MySQL JSON_LENGTH
    //    trick breaks for negative/zero-case objects)
    const accounts = await CustomerAccount.findAll({
      attributes: ['customerId', 'unpaid'],
      raw: true,
    });

    // 2. Flatten unpaid sell ids per account (object-of-arrays)
    const accountUnpaidMap = new Map(); // customerId -> Set<sellId>
    for (const acc of accounts) {
      const unpaidObj = normalizeDeptArrays(acc.unpaid);
      const ids = new Set();
      for (const arr of Object.values(unpaidObj)) {
        for (const id of arr) ids.add(id);
      }
      if (ids.size > 0) accountUnpaidMap.set(acc.customerId, ids);
    }

    if (accountUnpaidMap.size === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'No customers with unpaid entries',
      });
    }

    const allUnpaidSellIds = [...accountUnpaidMap.values()].flatMap((s) => [...s]);
    if (allUnpaidSellIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'No unpaid sells found',
      });
    }

    // 3. Fetch sells — ⚠️ do NOT filter remaind > 0. A negative remaind is
    //    equally an open balance.
    const unpaidSells = await Sells.findAll({
      where: {
        id: allUnpaidSellIds,
        remaind: { [Op.ne]: 0 }, // keep positive AND negative, drop settled
      },
      include: [
        {
          model: Bill,
          as: 'sellBill',
          attributes: ['customerId'],
          required: true,
        },
        {
          model: StockExist,
          as: 'sellStockExist',
          attributes: ['departmentId'],
          required: true,
        },
      ],
      attributes: [
        'id',
        'remaind',
        [sequelize.col('sellStockExist.departmentId'), 'departmentId'],
        [sequelize.col('sellBill.customerId'), 'customerId'],
      ],
      raw: true,
    });

    // 4. Group by customer & department, keeping the SIGNED sum
    const customerMap = new Map(); // customerId -> { net: number, departments: Map<deptId, signedSum>, abs: number }
    for (const sell of unpaidSells) {
      const custId = sell.customerId;
      const deptId = sell.departmentId;
      const amount = toNumber(sell.remaind);

      if (!customerMap.has(custId)) {
        customerMap.set(custId, { net: 0, abs: 0, departments: new Map() });
      }
      const entry = customerMap.get(custId);
      entry.net += amount;              // signed (positive = owes, negative = owed)
      entry.abs += Math.abs(amount);    // for sanity checks
      const deptSum = entry.departments.get(deptId) || 0;
      entry.departments.set(deptId, deptSum + amount);
    }

    // 5. Customer details
    const customerIds = [...customerMap.keys()];
    const customers = await Customer.findAll({
      where: { id: customerIds },
      attributes: ['id', 'fullname'],
      raw: true,
    });

    // 6. Department names
    const allDeptIds = new Set();
    for (const custData of customerMap.values()) {
      for (const deptId of custData.departments.keys()) allDeptIds.add(deptId);
    }
    const departments = await Department.findAll({
      where: { id: [...allDeptIds] },
      attributes: ['id', 'name'],
      raw: true,
    });
    const deptNameMap = new Map(departments.map((d) => [d.id, d.name]));

    // 7. Build response
    const responseData = [];
    let grandTotal = 0; // signed grand net
    let grandPositive = 0;
    let grandNegative = 0;

    for (const cust of customers) {
      const custData = customerMap.get(cust.id);
      if (!custData) continue;

      const departmentsArray = [];
      for (const [deptId, amount] of custData.departments.entries()) {
        const deptName =
          deptNameMap.get(Number(deptId)) || `Department ${deptId}`;
        departmentsArray.push({
          id: deptId,
          name: deptName,
          amount, // ← signed per department
          direction: amount > 0 ? 'owes' : amount < 0 ? 'owed' : 'settled',
        });
      }

      responseData.push({
        customer: { id: cust.id, fullname: cust.fullname },
        total_due: custData.net, // ← signed net
        total_abs: custData.abs,
        direction:
          custData.net > 0 ? 'owes' : custData.net < 0 ? 'owed' : 'settled',
        departments: departmentsArray,
      });
      grandTotal += custData.net;
      if (custData.net > 0) grandPositive += custData.net;
      if (custData.net < 0) grandNegative += custData.net;
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      total: grandTotal,          // signed
      totals: {
        net: grandTotal,          // sign-aware
        owes: grandPositive,      // > 0 only
        owed: grandNegative,      // < 0 only (customer credit)
      },
    });
  } catch (error) {
    console.error('Error fetching customers with unpaid sells:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/* ============================================================
   CUSTOMER SELLS FROM TOTAL — reads object-of-arrays
   ============================================================ */
export const getCustomerSellsFromTotal = async (req, res) => {
  try {
    const { customerId } = req.params;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    const account = await CustomerAccount.findOne({ where: { customerId } });
    if (!account) {
      return res.status(404).json({ message: 'Customer account not found' });
    }

    // account.total is dept-keyed object → flatten
    const sellIds = flattenDeptArrays(account.total);
    const totalItems = sellIds.length;

    if (totalItems === 0) {
      return res.status(200).json({
        data: [],
        pagination: { page, limit, totalItems: 0, totalPages: 0 },
      });
    }

    const sells = await Sells.findAll({
      where: { id: sellIds },
      include: [
        {
          model: StockExist,
          as: 'sellStockExist',
          attributes: ['name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    const sellsWithName = sells.map((sell) => {
      const d = sell.toJSON();
      d.name = d.sellStockExist?.name ?? null;
      delete d.sellStockExist;
      return d;
    });

    const totalPages = Math.ceil(totalItems / limit);
    res.status(200).json({
      data: sellsWithName,
      pagination: { page, limit, totalItems, totalPages },
    });
  } catch (error) {
    console.error('Error fetching customer sells from total:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   FORMAT SELL (sign-aware)
   ============================================================ */
const formatSellForFrontend = (sell) => {
  const d = sell.toJSON();
  const remaind = toNumber(d.remaind);
  return {
    id: d.id,
    fileName: d.sellStockExist?.name || null,
    size: null,
    qnty: d.amount, // may be negative
    price: toNumber(d.unit_price),
    money: toNumber(d.total),          // may be negative
    receipt: toNumber(d.receipt),      // may be negative
    remaining: remaind,                // signed
    direction:
      remaind > 0 ? 'owes' : remaind < 0 ? 'owed' : 'settled',
    createdAt: d.createdAt,
    name: d.sellStockExist?.name || null,
  };
};

/* ============================================================
   ORDER ITEMS BY TYPE — reads object-of-arrays
   ============================================================ */
export const getCustomerOrderItemsByType = async (req, res) => {
  try {
    const { customerId, type } = req.params;

    const validTypes = ['orderId', 'receiptOrders', 'remainOrders'];
    if (!validTypes.includes(type)) {
      return res
        .status(400)
        .json({ message: 'Invalid type. Use orderId, receiptOrders, or remainOrders' });
    }

    const account = await CustomerAccount.findOne({ where: { customerId } });
    if (!account) {
      return res.status(404).json({ message: 'Customer account not found' });
    }

    let sellIds = [];
    if (type === 'orderId') sellIds = flattenDeptArrays(account.total);
    else if (type === 'receiptOrders') sellIds = flattenDeptArrays(account.paid);
    else if (type === 'remainOrders') sellIds = flattenDeptArrays(account.unpaid);

    if (sellIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          totalCount: 0,
          totalMoney: 0,
          totalReceipt: 0,
          totalRemaining: 0,
          customerName: null,
        },
      });
    }

    const sells = await Sells.findAll({
      where: { id: sellIds },
      include: [
        {
          model: StockExist,
          as: 'sellStockExist',
          attributes: ['name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const items = sells.map(formatSellForFrontend);

    const totalCount = items.length;
    const totalMoney = items.reduce((s, i) => s + i.money, 0); // signed
    const totalReceipt = items.reduce((s, i) => s + i.receipt, 0); // signed
    const totalRemaining = items.reduce((s, i) => s + i.remaining, 0); // signed
    const totalOwes = items
      .filter((i) => i.remaining > 0)
      .reduce((s, i) => s + i.remaining, 0);
    const totalOwed = items
      .filter((i) => i.remaining < 0)
      .reduce((s, i) => s + i.remaining, 0);

    const customer = await Customer.findByPk(customerId, {
      attributes: ['fullname'],
    });

    res.status(200).json({
      success: true,
      data: {
        items,
        totalCount,
        totalMoney,
        totalReceipt,
        totalRemaining, // signed net
        totalOwes,      // only positive remaind
        totalOwed,      // only negative remaind
        customerName: customer ? customer.fullname : null,
      },
    });
  } catch (error) {
    console.error('Error in getCustomerOrderItemsByType:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================================
   ORDER ITEMS BY DATE RANGE — filtered via Bill.customerId
   ============================================================ */
export const getCustomerOrderItemsByDateRange = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: 'Both "from" and "to" dates are required' });
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    if (isNaN(startDate) || isNaN(endDate)) {
      return res
        .status(400)
        .json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    endDate.setHours(23, 59, 59, 999);

    // ⚠️ Sells has NO `customer` column — it lives on the Bill. Filter via
    //    the sellBill include.
    const sells = await Sells.findAll({
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      include: [
        {
          model: StockExist,
          as: 'sellStockExist',
          attributes: ['name'],
          required: false,
        },
        {
          model: Bill,
          as: 'sellBill',
          attributes: ['id', 'customerId'],
          where: { customerId },
          required: true,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const items = sells.map(formatSellForFrontend);

    const totalItems = items.length;
    const totalMoney = items.reduce((s, i) => s + i.money, 0);
    const totalReceipt = items.reduce((s, i) => s + i.receipt, 0);
    const totalRemaining = items.reduce((s, i) => s + i.remaining, 0);
    const totalOwes = items
      .filter((i) => i.remaining > 0)
      .reduce((s, i) => s + i.remaining, 0);
    const totalOwed = items
      .filter((i) => i.remaining < 0)
      .reduce((s, i) => s + i.remaining, 0);

    const customer = await Customer.findByPk(customerId, {
      attributes: ['id', 'fullname', 'phoneNumber', 'address'],
    });

    res.status(200).json({
      success: true,
      data: {
        customer,
        items,
        summary: {
          totalItems,
          totalMoney,
          totalReceipt,
          totalRemaining, // signed net
          totalOwes,
          totalOwed,
        },
      },
    });
  } catch (error) {
    console.error('Error in getCustomerOrderItemsByDateRange:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};