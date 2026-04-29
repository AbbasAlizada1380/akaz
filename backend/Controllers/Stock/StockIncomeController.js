// controllers/stockIncomeController.js
import Pay from "../../Models/Finance/Pay.js"
import { Department, Seller, SellerAccount, StockIncome, StockExist } from '../../Models/index.js';
import sequelize from "../../dbconnection.js";
import { Op, Transaction } from "sequelize";
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
          as: "department",
          attributes: ['id', 'name', 'holding', 'isActive']
        },
        {
          model: Seller,
          as: "seller",
          attributes: ['id', 'fullname', 'phoneNumber', 'address']
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    // Transform the data
    const transformedIncomes = rows.map(income => ({
      ...income.toJSON(),
      departmentName: income.department?.name,
      sellerName: income.seller?.fullname
    }));

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Send paginated response
    res.json({
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

export const createBatchStockIncome = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { seller, items } = req.body;

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

    for (const item of items) {
      const { exist, type, amount, sell_price, net_unite_price, expense = 0 } = item;

      // Validation: required fields
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

      // Parse numeric values
      const parsedAmount = parseFloat(amount);
      const parsedNetUnitPrice = parseFloat(net_unite_price);
      const parsedExpense = parseFloat(expense) || 0;
      const parsedSellPrice = parseFloat(sell_price);

      // Compute unit_price = (expense / amount) + net_unite_price
      const computedUnitPrice = (parsedExpense / parsedAmount) + parsedNetUnitPrice;
      const totalPrice = parsedAmount * computedUnitPrice;

      // ----- Handle StockExist and retrieve departmentId -----
      let existId;
      let departmentId;

      if (exist.id) {
        // Existing product: fetch full record to get departmentId
        const existingExist = await StockExist.findByPk(parseInt(exist.id), { transaction });
        if (!existingExist) {
          await transaction.rollback();
          return res.status(404).json({ error: `StockExist with id ${exist.id} not found` });
        }
        existId = existingExist.id;
        departmentId = existingExist.departmentId;
      } else if (exist.name) {
        // Try to find by name
        let found = await StockExist.findOne({ where: { name: exist.name }, transaction });
        if (found) {
          existId = found.id;
          departmentId = found.departmentId;
        } else {
          // Extract department ID from exist.department (object or primitive) or exist.departmentId
          let deptId = null;
          if (exist.department) {
            if (typeof exist.department === 'object' && exist.department.id) {
              deptId = exist.department.id;
            } else if (typeof exist.department === 'number' || !isNaN(parseInt(exist.department))) {
              deptId = parseInt(exist.department);
            }
          } else if (exist.departmentId) {
            // In case the frontend sends departmentId directly (first format)
            deptId = parseInt(exist.departmentId);
          }

          if (!deptId) {
            await transaction.rollback();
            return res.status(400).json({ error: `Department ID is required for new product: ${exist.name}` });
          }

          // Verify department exists
          const dept = await Department.findByPk(deptId, { transaction });
          if (!dept) {
            await transaction.rollback();
            return res.status(404).json({ error: `Department with id ${deptId} not found` });
          }

          const newExist = await StockExist.create({
            name: exist.name,
            departmentId: deptId
          }, { transaction });
          existId = newExist.id;
          departmentId = deptId;
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: 'Invalid exist reference in item' });
      }

      // Create StockIncome record with computed unit_price and departmentId
      const income = await StockIncome.create({
        sellerId: sellerId,
        existId: existId,
        departmentId: departmentId,          // <-- now stored
        type: type,
        amount: parsedAmount,
        unit_price: computedUnitPrice,
        net_unite_price: parsedNetUnitPrice,
        expense: parsedExpense,
        sell_price: parsedSellPrice,
        total: totalPrice
      }, { transaction });

      createdIncomes.push({
        ...income.toJSON(),
        total_price: totalPrice
      });
    }

    await transaction.commit();

    res.status(201).json({
      message: 'Batch stock incomes created successfully',
      sellerId: sellerId,
      incomesCount: createdIncomes.length,
      incomes: createdIncomes
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Batch create error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
          as: "department",
          attributes: ["id", "name", "holding", "isActive"],
        },
        {
          model: Seller,
          as: "seller",
          attributes: ["id", "fullname", "phoneNumber", "address", "isActive"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate totals
    const totalAmount = stockIncomes.reduce(
      (sum, income) => sum + parseFloat(income.total || 0),
      0
    );
    const totalReceived = stockIncomes.reduce(
      (sum, income) => sum + parseFloat(income.received || 0),
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
        totalReceived,      // Sum of 'received' field (amount paid so far)
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