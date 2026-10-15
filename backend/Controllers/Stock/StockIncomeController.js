// controllers/stockIncomeController.js
import Pay from "../../Models/Finance/Pay.js"
import { Department, Seller, SellerAccount, StockIncome, StockExist, Factor } from '../../Models/index.js';
import sequelize from "../../dbconnection.js";
import { Op, Transaction } from "sequelize";

async function updateSellerAccountWithFactor(sellerId, factorId, status, transaction) {
  const seller = Number(sellerId);
  const factor = Number(factorId);

  let sellerAccount = await SellerAccount.findOne({ where: { sellerId: seller }, transaction });

  if (!sellerAccount) {
    const totalArr = [factor];
    const paidArr = status === 'paid' ? [factor] : [];
    const unpaidArr = status !== 'paid' ? [factor] : [];

    sellerAccount = await SellerAccount.create({
      sellerId: seller,
      paid: paidArr,
      unpaid: unpaidArr,
      total: totalArr
    }, { transaction });
  } else {
    let currentPaid = sellerAccount.paid || [];
    let currentUnpaid = sellerAccount.unpaid || [];
    let currentTotal = sellerAccount.total || [];

    currentPaid = currentPaid.map(Number);
    currentUnpaid = currentUnpaid.map(Number);
    currentTotal = currentTotal.map(Number);

    let newTotal = [...currentTotal];
    if (!newTotal.includes(factor)) newTotal.push(factor);

    let newPaid = [...currentPaid];
    let newUnpaid = [...currentUnpaid];

    if (status === 'paid') {
      if (!newPaid.includes(factor)) newPaid.push(factor);
      newUnpaid = newUnpaid.filter(id => id !== factor);
    } else {
      if (!newUnpaid.includes(factor)) newUnpaid.push(factor);
      newPaid = newPaid.filter(id => id !== factor);
    }

    await sellerAccount.update({
      paid: newPaid,
      unpaid: newUnpaid,
      total: newTotal
    }, { transaction });
  }

  return sellerAccount;
}

// Update StockExist with weighted averages
async function updateStockExistFromIncome(existId, newAmount, newUnitPrice, newSellPrice, transaction) {
  const stockExist = await StockExist.findByPk(existId, { transaction });
  if (!stockExist) {
    throw new Error(`StockExist with id ${existId} not found`);
  }

  const result = await StockIncome.findAll({
    where: { existId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('SUM', sequelize.literal('amount * unit_price')), 'totalValue']
    ],
    raw: true,
    transaction
  });

  const totalAmount = parseFloat(result[0]?.totalAmount) || 0;
  const totalValue = parseFloat(result[0]?.totalValue) || 0;
  const avgUnitPrice = totalAmount > 0 ? totalValue / totalAmount : 0;

  const sellPriceResult = await StockIncome.findAll({
    where: { existId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
      [sequelize.fn('SUM', sequelize.literal('amount * sell_price')), 'totalSellValue']
    ],
    raw: true,
    transaction
  });

  const totalSellAmount = parseFloat(sellPriceResult[0]?.totalAmount) || 0;
  const totalSellValue = parseFloat(sellPriceResult[0]?.totalSellValue) || 0;
  const avgSellPrice = totalSellAmount > 0 ? totalSellValue / totalSellAmount : newSellPrice || 0;

  await stockExist.update({
    amount: totalAmount,
    unit_price: avgUnitPrice,
    sell_price: avgSellPrice
  }, { transaction });

  return stockExist;
}

export const createBatchStockIncome = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      seller,
      items,
      paidAmount: userPaidAmount,
      notes,
      departmentId,
      mode = "stock"
    } = req.body;

    if (!seller || !items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid payload. Need seller and items array.' });
    }

    // ---------- 1. Handle Seller ----------
    let sellerId;
    if (seller.id) {
      const existingSeller = await Seller.findByPk(parseInt(seller.id), { transaction });
      if (!existingSeller) {
        await transaction.rollback();
        return res.status(404).json({ error: `Seller with id ${seller.id} not found` });
      }
      sellerId = existingSeller.id;
    } else if (seller.name) {
      const newSeller = await Seller.create({ fullname: seller.name }, { transaction });
      sellerId = newSeller.id;
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: 'Seller must provide either id or name' });
    }

    // ---------- 2. Process each item ----------
    const createdIncomes = [];
    const createdIncomeIds = [];
    const existIds = [];
    let totalAmount = 0;

    for (const item of items) {
      const {
        exist,
        type,
        amount,
        sell_price,
        net_unite_price,
        expense = 0,
        code_number = null,   // ← per-item code_number (nullable)
      } = item;

      if (!exist || (!exist.id && !exist.name)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each item must have exist.id or exist.name' });
      }
      if (!type || !amount || amount <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each item must have type and a positive amount' });
      }
      if (net_unite_price === undefined || net_unite_price === null) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each item must have net_unite_price' });
      }
      if (sell_price === undefined || sell_price === null) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Each item must have sell_price' });
      }

      const parsedAmount = parseFloat(amount);
      const parsedNetUnitPrice = parseFloat(net_unite_price);
      const parsedExpense = parseFloat(expense) || 0;
      const parsedSellPrice = parseFloat(sell_price);
      const trimmedCode = code_number ? String(code_number).trim() : null;

      const computedUnitPrice = (parsedExpense / parsedAmount) + parsedNetUnitPrice;
      const totalPrice = parsedAmount * computedUnitPrice;

      let existId;
      let itemDepartmentId;

      /* ============================================================
         Resolve StockExist:
         1. If exist.id provided → use that exact StockExist row.
         2. Else if code_number provided → match by code_number.
            - Found → reuse.
            - Not found → create new StockExist with that code.
         3. Else → match by name (legacy behavior).
            - Found → reuse.
            - Not found → create new StockExist with code_number = null.
      ============================================================ */
      if (exist.id) {
        const existingExist = await StockExist.findByPk(parseInt(exist.id), { transaction });
        if (!existingExist) {
          await transaction.rollback();
          return res.status(404).json({ error: `StockExist with id ${exist.id} not found` });
        }
        existId = existingExist.id;
        itemDepartmentId = existingExist.departmentId;

        // If user also provided a code_number and the found record doesn't have one, set it
        if (trimmedCode && !existingExist.code_number) {
          await existingExist.update({ code_number: trimmedCode }, { transaction });
        }
      } else if (trimmedCode) {
        // ---------- Lookup / create by code_number ----------
        let foundByCode = await StockExist.findOne({
          where: { code_number: trimmedCode },
          transaction,
        });

        if (foundByCode) {
          existId = foundByCode.id;
          itemDepartmentId = foundByCode.departmentId;
        } else {
          // New product with a unique code
          let deptId = null;
          if (exist.department) {
            if (typeof exist.department === 'object' && exist.department.id) {
              deptId = exist.department.id;
            } else if (typeof exist.department === 'number' || !isNaN(parseInt(exist.department))) {
              deptId = parseInt(exist.department);
            }
          } else if (exist.departmentId) {
            deptId = parseInt(exist.departmentId);
          }

          if (!deptId) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Department ID is required for new product: ${exist.name} (code ${trimmedCode})`
            });
          }

          const dept = await Department.findByPk(deptId, { transaction });
          if (!dept) {
            await transaction.rollback();
            return res.status(404).json({ error: `Department with id ${deptId} not found` });
          }

          const newExist = await StockExist.create({
            code_number: trimmedCode,
            name: exist.name,
            departmentId: deptId,
            sell_price: parsedSellPrice,
          }, { transaction });

          existId = newExist.id;
          itemDepartmentId = deptId;
        }
      } else if (exist.name) {
        // ---------- Legacy: match by name (no code) ----------
        let found = await StockExist.findOne({
          where: { name: exist.name },
          transaction,
        });

        if (found) {
          existId = found.id;
          itemDepartmentId = found.departmentId;
        } else {
          let deptId = null;
          if (exist.department) {
            if (typeof exist.department === 'object' && exist.department.id) {
              deptId = exist.department.id;
            } else if (typeof exist.department === 'number' || !isNaN(parseInt(exist.department))) {
              deptId = parseInt(exist.department);
            }
          } else if (exist.departmentId) {
            deptId = parseInt(exist.departmentId);
          }

          if (!deptId) {
            await transaction.rollback();
            return res.status(400).json({
              error: `Department ID is required for new product: ${exist.name}`
            });
          }

          const dept = await Department.findByPk(deptId, { transaction });
          if (!dept) {
            await transaction.rollback();
            return res.status(404).json({ error: `Department with id ${deptId} not found` });
          }

          const newExist = await StockExist.create({
            code_number: null,
            name: exist.name,
            departmentId: deptId,
            sell_price: parsedSellPrice,
          }, { transaction });

          existId = newExist.id;
          itemDepartmentId = deptId;
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: 'Invalid exist reference in item' });
      }

      if (!existIds.includes(existId)) existIds.push(existId);

      const income = await StockIncome.create({
        code_number: trimmedCode,      // ← save code on the income row too
        sellerId: sellerId,
        existId: existId,
        departmentId: itemDepartmentId,
        type: type,
        amount: parsedAmount,
        unit_price: computedUnitPrice,
        net_unite_price: parsedNetUnitPrice,
        expense: parsedExpense,
        sell_price: parsedSellPrice,
        total: totalPrice,
        remaind: totalPrice,
      }, { transaction });

      if (mode === "stock") {
        await updateStockExistFromIncome(
          existId,
          parsedAmount,
          computedUnitPrice,
          parsedSellPrice,
          transaction
        );
      }

      createdIncomes.push({ ...income.toJSON(), total_price: totalPrice });
      createdIncomeIds.push(income.id);
      totalAmount += totalPrice;
    }

    // ---------- 3. Determine paid amount and factor status ----------
    const finalPaidAmount = (userPaidAmount !== undefined && !isNaN(parseFloat(userPaidAmount)))
      ? parseFloat(userPaidAmount)
      : totalAmount;

    const remainingAmount = totalAmount - finalPaidAmount;
    const status = remainingAmount === 0 ? "paid" : (finalPaidAmount > 0 ? "partial" : "unpaid");

    // ---------- 4. Create Factor with mode ----------
    const factor = await Factor.create({
      factorNumber: null,
      sellerId: sellerId,
      totalAmount: totalAmount,
      paidAmount: finalPaidAmount,
      remainingAmount: remainingAmount,
      status: status,
      notes: notes || null,
      incomes: createdIncomeIds,
      dep_Number: departmentId || null,
      mode: mode
    }, { transaction });

    await factor.update({
      factorNumber: `FAC-${factor.id.toString().padStart(6, '0')}`
    }, { transaction });

    // ---------- 5. Update SellerAccount ----------
    await updateSellerAccountWithFactor(sellerId, factor.id, status, transaction);

    // ---------- 6. Create Pay record ----------
    let payId = null;
    if (finalPaidAmount > 0) {
      const payRecord = await Pay.create({
        seller: sellerId,
        departmentId: departmentId || null,
        amount: finalPaidAmount,
        description: `Payment for factor ${factor.id} (batch number of ${createdIncomeIds})`,
      }, { transaction });
      payId = payRecord.id;
    }

    // ---------- 7. Update department ----------
    if (departmentId) {
      const targetDepartment = await Department.findByPk(parseInt(departmentId), { transaction });
      if (targetDepartment) {
        let currentFactors = Array.isArray(targetDepartment.Factors) ? [...targetDepartment.Factors] : [];
        let currentPays = Array.isArray(targetDepartment.pays) ? [...targetDepartment.pays] : [];
        let currentExist = Array.isArray(targetDepartment.exist) ? [...targetDepartment.exist] : [];

        let factorsChanged = false;
        let paysChanged = false;
        let existChanged = false;

        if (!currentFactors.includes(factor.id)) {
          currentFactors.push(factor.id);
          factorsChanged = true;
        }
        if (payId && !currentPays.includes(payId)) {
          currentPays.push(payId);
          paysChanged = true;
        }
        for (const eid of existIds) {
          if (!currentExist.includes(eid)) {
            currentExist.push(eid);
            existChanged = true;
          }
        }

        if (factorsChanged || paysChanged || existChanged) {
          await targetDepartment.update({
            Factors: currentFactors,
            pays: currentPays,
            exist: currentExist
          }, { transaction });
        }
      }
    }

    // ---------- 8. Link incomes to factor ----------
    if (createdIncomeIds.length > 0) {
      await StockIncome.update(
        { FactorId: factor.id },
        { where: { id: createdIncomeIds }, transaction }
      );
    }

    await transaction.commit();

    res.status(201).json({
      message: 'Batch stock incomes created successfully',
      sellerId,
      factorId: factor.id,
      factorNumber: factor.factorNumber,
      mode,
      payId,
      totalAmount,
      paidAmount: finalPaidAmount,
      remainingAmount,
      status,
      incomesCount: createdIncomes.length,
      incomes: createdIncomes,
      isPending: mode === "pending"
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Batch create error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};


export const getAllStockIncome = async (req, res) => {
  try {
    // Get pagination parameters from query string, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Use findAndCountAll to get both data and total count
    const { count, rows } = await StockIncome.findAndCountAll({
      include: [
        {
          model: Department,
          as: "stockIncomeDepartment", // Fixed: changed from "department" to "stockIncomeDepartment"
          attributes: ['id', 'name', 'holding', 'isActive']
        },
        {
          model: Seller,
          as: "stockIncomeSeller", // Fixed: changed from "seller" to "stockIncomeSeller"
          attributes: ['id', 'fullname', 'phoneNumber', 'address']
        },
        {
          model: StockExist,
          as: "stockIncomeStockExist", // Added StockExist association
          attributes: ['id', 'name', 'amount', 'unit_price']
        }
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
      limit: limit,
      offset: offset,
    });

    // Transform the data
    const transformedIncomes = rows.map(income => ({
      ...income.toJSON(),
      departmentName: income.stockIncomeDepartment?.name,
      sellerName: income.stockIncomeSeller?.fullname,
      productName: income.stockIncomeStockExist?.name
    }));

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Send paginated response
    res.json({
      success: true,
      stockIncomes: transformedIncomes,
      pagination: {
        totalItems: count,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
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
          as: "stockIncomeDepartment" // Fixed: changed from "department" to "stockIncomeDepartment"
        },
        {
          model: Seller,
          as: "stockIncomeSeller" // Fixed: changed from "seller" to "stockIncomeSeller"
        },
        {
          model: StockExist,
          as: "stockIncomeStockExist" // Added StockExist association
        }
      ],
    });

    if (!income) {
      return res.status(404).json({ message: "Stock income not found" });
    }

    res.json({
      success: true,
      data: income
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const undoCreateStockIncome = async (req, res) => {
  const { id } = req.params;
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
        { model: Department, as: "stockIncomeDepartment" }, // Fixed alias
        { model: Seller, as: "stockIncomeSeller" }, // Fixed alias
        { model: StockExist, as: "stockIncomeStockExist" }
      ],
    });

    res.json({
      success: true,
      data: updatedIncome
    });
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

// ==============================
// Get Stock Incomes by Date Range (with optional department/seller filters)
// ==============================
export const getStockIncomeByDateRange = async (req, res) => {
  const { from, to, departmentId, sellerId } = req.query;

  // Validate required date parameters
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "from and to dates are required",
    });
  }

  try {
    // Convert to full day range
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    // Build where clause for StockIncome
    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Add department filter if provided
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    // Add seller filter if provided
    if (sellerId) {
      whereClause.sellerId = sellerId;
    }

    // Fetch stock incomes with associated department and seller info
    const stockIncomes = await StockIncome.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: "stockIncomeDepartment", // Fixed alias
          attributes: ["id", "name", "holding", "isActive"],
        },
        {
          model: Seller,
          as: "stockIncomeSeller", // Fixed alias
          attributes: ["id", "fullname", "phoneNumber", "address", "isActive"],
        },
        {
          model: StockExist,
          as: "stockIncomeStockExist", // Added StockExist association
          attributes: ["id", "name", "amount", "unit_price"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate totals
    const totalAmount = stockIncomes.reduce(
      (sum, income) => sum + parseFloat(income.total || 0),
      0
    );
    const totalReceived = stockIncomes.reduce(
      (sum, income) => sum + parseFloat(income.receipt || 0),
      0
    );

    // Return response
    return res.status(200).json({
      success: true,
      message: "Stock incomes fetched successfully",
      data: {
        stockIncomes,
        totalCount: stockIncomes.length,
        totalAmount,        // Sum of 'total' field (full value)
        totalReceived,      // Sum of 'receipt' field (amount paid so far)
        filters: {
          from,
          to,
          departmentId: departmentId || null,
          sellerId: sellerId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in getStockIncomeByDateRange:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching stock incomes",
      error: error.message,
    });
  }
};
// controllers/stockIncomeController.js




// controllers/stockIncomeController.js

/* ===============================
   APPROVE PENDING FACTOR
   This approves all pending incomes in a factor and adds them to stock
================================ */
export const approvePendingFactor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { factorId } = req.params;
    
    const factor = await Factor.findByPk(factorId, { transaction });
    if (!factor) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: "Factor not found" 
      });
    }

    if (factor.mode !== "pending") {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Factor is not in pending mode" 
      });
    }

    const incomes = await StockIncome.findAll({
      where: { FactorId: factorId },
      transaction
    });

    if (incomes.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: "No incomes found for this factor" 
      });
    }

    // Update stock for each income with sell_price
    for (const income of incomes) {
      await updateStockExistFromIncome(
        income.existId, 
        income.amount, 
        income.unit_price, 
        income.sell_price, 
        transaction
      );
    }

    await factor.update({ mode: "stock" }, { transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: `Successfully approved factor ${factor.factorNumber} with ${incomes.length} items`,
      factorId: factorId,
      factorNumber: factor.factorNumber,
      approvedCount: incomes.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving pending factor:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to approve pending factor", 
      error: error.message 
    });
  }
};

/* ===============================
   REJECT PENDING FACTOR
   This rejects all pending incomes in a factor and deletes them
================================ */
export const rejectPendingFactor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { factorId } = req.params;
    
    // Find the factor
    const factor = await Factor.findByPk(factorId, { transaction });
    if (!factor) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: "Factor not found" 
      });
    }

    // Check if factor is pending
    if (factor.mode !== "pending") {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "Factor is not in pending mode" 
      });
    }

    // Find all stock incomes for this factor
    const incomes = await StockIncome.findAll({
      where: { FactorId: factorId },
      transaction
    });

    if (incomes.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: "No incomes found for this factor" 
      });
    }

    // Delete all incomes
    for (const income of incomes) {
      await income.destroy({ transaction });
    }

    // Delete the factor
    await factor.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: `Successfully rejected factor ${factor.factorNumber} with ${incomes.length} items`,
      factorId: factorId,
      factorNumber: factor.factorNumber,
      rejectedCount: incomes.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting pending factor:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reject pending factor", 
      error: error.message 
    });
  }
};

/* ===============================
   GET PENDING FACTORS
   Get all factors with pending mode
================================ */
export const getPendingFactors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Factor.findAndCountAll({
      where: { mode: "pending" },
      distinct: true,
      include: [
        {
          model: Seller,
          as: "factorSeller",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    // Fetch income details for each factor
    const factorsWithIncomes = await Promise.all(
      rows.map(async (factor) => {
        let incomeDetails = [];
        if (factor.incomes && factor.incomes.length) {
          incomeDetails = await StockIncome.findAll({
            where: { id: factor.incomes },
            include: [
              {
                model: StockExist,
                as: "stockIncomeStockExist",
                attributes: ["id", "name", "departmentId"],
              },
            ],
            order: [["createdAt", "ASC"]],
          });
        }
        return {
          ...factor.toJSON(),
          incomeDetails,
        };
      })
    );

    res.json({
      success: true,
      factors: factorsWithIncomes,
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
    console.error("Error in getPendingFactors:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch pending factors", 
      error: error.message 
    });
  }
};