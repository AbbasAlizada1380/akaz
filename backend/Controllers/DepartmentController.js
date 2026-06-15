import { Department, Sells, Benefit, DepartmentTransaction, sequelize, StockExist, Pay, User, Seller, Bill, Debt, NonStaff, Payment } from "../Models/index.js";
import { Op } from "sequelize";
import { Attendance, Staff, Expense } from "../Models/index.js";

// ✅ Helper: safely get holding object
const getHoldingObject = (holding) => {
  if (!holding) return {};
  if (typeof holding === "string") {
    try {
      return JSON.parse(holding);
    } catch (e) {
      return {};
    }
  }
  return holding;
};

// ✅ Create Department (unchanged)
export const createDepartment = async (req, res) => {
  try {
    const { name, isActive, holding } = req.body;

    if (holding && typeof holding !== "object") {
      return res.status(400).json({
        message: "Holding must be an object, e.g., { '1': 20, '2': 80 }",
      });
    }

    const department = await Department.create({
      name,
      isActive,
      holding: holding || {},
    });

    res.status(201).json({
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating department",
      error: error.message,
    });
  }
};

// ✅ Get All Departments (Paginated) – unchanged
export const getAllDepartments = async (req, res) => {
  try {
    const { active, page = 1, limit = 10 } = req.query;

    const currentPage = parseInt(page);
    const pageSize = parseInt(limit);
    const offset = (currentPage - 1) * pageSize;

    const whereClause = {};
    if (active !== undefined) {
      whereClause.isActive = active === "true";
    }

    const { count, rows } = await Department.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Departments fetched successfully",
      totalItems: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage,
      pageSize,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

// ✅ Get Single Department – unchanged
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({
      message: "Department fetched successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching department",
      error: error.message,
    });
  }
};

// ✅ NEW: Get Departments by User Holding
export const getDepartmentsByUserHolding = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const userIdStr = String(userId);

    const allDepartments = await Department.findAll();

    const userDepartments = allDepartments.filter(dept => {
      const holding = getHoldingObject(dept.holding);
      const userShare = holding[userIdStr];
      return userShare !== undefined && userShare !== null && userShare !== 0;
    });

    res.status(200).json({
      message: "Departments fetched successfully",
      count: userDepartments.length,
      data: userDepartments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching departments by user holding",
      error: error.message,
    });
  }
};

// ✅ Update Department – unchanged
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, holding } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (holding && typeof holding !== "object") {
      return res.status(400).json({
        message: "Holding must be an object, e.g., { '1': 20, '2': 80 }",
      });
    }

    await department.update({
      name: name !== undefined ? name : department.name,
      isActive: isActive !== undefined ? isActive : department.isActive,
      holding: holding !== undefined ? holding : department.holding,
    });

    res.json({
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating department",
      error: error.message,
    });
  }
};

// ✅ Delete Department – unchanged
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    await department.destroy();

    res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting department",
      error: error.message,
    });
  }
};

// ✅ FIXED: Get Benefits by Department and Date - using correct alias
export const getBenefitsByDepartmentAndDate = async (req, res) => {
  try {
    let departmentId = req.params.departmentId || req.query.departmentId;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const whereClause = {};

    if (departmentId && departmentId !== 'all' && departmentId !== '') {
      const deptIdNum = parseInt(departmentId);
      if (isNaN(deptIdNum)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
      const department = await Department.findByPk(deptIdNum);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      whereClause.departmentId = deptIdNum;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDateTime;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const { count, rows: benefits } = await Benefit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: "benefitDepartment", // FIXED: changed from "department" to "benefitDepartment"
          attributes: ["id", "name"],
        },
        {
          model: Sells,
          as: "benefitSell",
          attributes: ["id", "total", "receipt", "remaind"],
        },
      ],
      distinct: true,
      offset,
      limit: parsedLimit,
      order: [["createdAt", "DESC"]],
    });

    // Transform data to include department name
    const transformedBenefits = benefits.map(benefit => ({
      ...benefit.toJSON(),
      departmentName: benefit.benefitDepartment?.name,
    }));

    res.status(200).json({
      success: true,
      data: transformedBenefits,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / parsedLimit),
        currentPage: parseInt(page),
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    console.error("Error in getBenefitsByDepartmentAndDate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch benefits",
      error: error.message
    });
  }
};

// ✅ FIXED: Get Benefits with Filters - using correct alias
export const getBenefitsWithFilters = async (req, res) => {
  try {
    const { departmentId, startDate, endDate, page = 1, limit = 10 } = req.query;

    const whereClause = {};
    if (departmentId) whereClause.departmentId = departmentId;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDateTime;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Benefit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: "benefitDepartment", // FIXED: changed from "department" to "benefitDepartment"
          attributes: ["id", "name"]
        },
        {
          model: Sells,
          as: "benefitSell",
          attributes: ["id", "total", "receipt", "remaind"],
        },
      ],
      distinct: true,
      offset,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    // Transform data to include department name
    const transformedBenefits = rows.map(benefit => ({
      ...benefit.toJSON(),
      departmentName: benefit.benefitDepartment?.name,
    }));

    res.status(200).json({
      success: true,
      data: transformedBenefits,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch benefits",
      error: error.message
    });
  }
};

// Get amounts (and counts) for withdraw, deposit, realizedBenefit, exist, pays, and expenses for a department
export const getDepartmentCounts = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const withdrawIds = parseJSONArray(department.withdraw);
    const depositIds = parseJSONArray(department.deposit);
    const realizedBenefitIds = parseJSONArray(department.realizedBenefit);
    const existIds = parseJSONArray(department.exist);
    const paysIds = parseJSONArray(department.pays);

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt[Op.lte] = endDateTime;
      }
    }

    // Withdraw (is_deposit = false)
    let withdrawTotal = 0, withdrawCount = 0;
    if (withdrawIds.length > 0) {
      const result = await DepartmentTransaction.findAll({
        where: { id: { [Op.in]: withdrawIds }, is_deposit: false, ...dateFilter },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      });
      withdrawTotal = parseFloat(result[0]?.totalAmount || 0);
      withdrawCount = parseInt(result[0]?.count || 0);
    }

    // Deposit (is_deposit = true)
    let depositTotal = 0, depositCount = 0;
    if (depositIds.length > 0) {
      const result = await DepartmentTransaction.findAll({
        where: { id: { [Op.in]: depositIds }, is_deposit: true, ...dateFilter },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      });
      depositTotal = parseFloat(result[0]?.totalAmount || 0);
      depositCount = parseInt(result[0]?.count || 0);
    }

    // Realized Benefits (Benefit table)
    let realizedBenefitTotal = 0, realizedBenefitCount = 0;
    if (realizedBenefitIds.length > 0) {
      const result = await Benefit.findAll({
        where: { id: { [Op.in]: realizedBenefitIds }, ...dateFilter },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      });
      realizedBenefitTotal = parseFloat(result[0]?.totalAmount || 0);
      realizedBenefitCount = parseInt(result[0]?.count || 0);
    }

    // EXISTING STOCK VALUE: sum amount * unit_price for all StockExist records
    let existTotal = 0, existCount = 0;
    if (existIds.length > 0) {
      const stocks = await StockExist.findAll({
        where: { id: { [Op.in]: existIds } },
        attributes: ['amount', 'unit_price'],
        raw: true,
      });
      existCount = stocks.length;
      existTotal = stocks.reduce((sum, stock) => {
        const value = (stock.amount || 0) * (stock.unit_price || 0);
        return sum + value;
      }, 0);
    }

    // PAYS: sum amounts from Pay table
    let paysTotal = 0, paysCount = 0;
    if (paysIds.length > 0) {
      const result = await Pay.findAll({
        where: { id: { [Op.in]: paysIds }, ...dateFilter },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      });
      paysTotal = parseFloat(result[0]?.totalAmount || 0);
      paysCount = parseInt(result[0]?.count || 0);
    }

    // EXPENSES
    let expensesTotal = 0, expensesCount = 0;
    const expenseWhere = { departmentId: parseInt(departmentId) };

    if (startDate || endDate) {
      expenseWhere.createdAt = {};
      if (startDate) expenseWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        expenseWhere.createdAt[Op.lte] = endDateTime;
      }
    }

    const expensesResult = await Expense.findAll({
      where: expenseWhere,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      raw: true,
    });

    expensesTotal = parseFloat(expensesResult[0]?.totalAmount || 0);
    expensesCount = parseInt(expensesResult[0]?.count || 0);

    // SELLS
    const sellsWhere = { departmentId: parseInt(departmentId) };

    if (startDate || endDate) {
      sellsWhere.createdAt = {};
      if (startDate) sellsWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        sellsWhere.createdAt[Op.lte] = endDateTime;
      }
    }

    const sellsResult = await Sells.findAll({
      where: sellsWhere,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('receipt')), 'totalReceipt'],
        [sequelize.fn('SUM', sequelize.col('remaind')), 'totalRemaind'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalSales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      raw: true,
    });

    const totalReceipt = parseFloat(sellsResult[0]?.totalReceipt || 0);
    const totalRemaind = parseFloat(sellsResult[0]?.totalRemaind || 0);
    const totalSales = parseFloat(sellsResult[0]?.totalSales || 0);
    const sellsCount = parseInt(sellsResult[0]?.count || 0);

    let sellsList = [];
    if (sellsCount > 0) {
      sellsList = await Sells.findAll({
        where: sellsWhere,
        attributes: ['id', 'amount', 'total', 'receipt', 'remaind', 'createdAt'],
        include: [
          {
            model: StockExist,
            as: 'sellStockExist',
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']],
      });
    }

    const totalIncoming = depositTotal + realizedBenefitTotal + paysTotal + totalReceipt;
    const totalOutgoing = withdrawTotal + expensesTotal;
    const grandTotal = depositTotal - withdrawTotal + realizedBenefitTotal + existTotal - paysTotal - expensesTotal + totalReceipt;
    const netCashFlow = totalIncoming - totalOutgoing;

    res.status(200).json({
      message: "Department amounts fetched successfully",
      data: {
        departmentId: department.id,
        departmentName: department.name,
        amounts: {
          withdraw: withdrawTotal,
          deposit: depositTotal,
          realizedBenefit: realizedBenefitTotal,
          exist: existTotal,
          pays: paysTotal,
          expenses: expensesTotal,
          sellsReceipt: totalReceipt,
          sellsRemaind: totalRemaind,
          totalSales: totalSales,
          totalIncoming: totalIncoming,
          totalOutgoing: totalOutgoing,
          netCashFlow: netCashFlow,
          grandTotal: grandTotal,
        },
        counts: {
          withdraw: withdrawCount,
          deposit: depositCount,
          realizedBenefit: realizedBenefitCount,
          exist: existCount,
          pays: paysCount,
          expenses: expensesCount,
          sells: sellsCount,
        },
        sellsList: sellsList,
        dateRange: startDate || endDate
          ? { startDate: startDate || null, endDate: endDate || null }
          : "all",
      },
    });
  } catch (error) {
    console.error("Error in getDepartmentCounts:", error);
    res.status(500).json({
      message: "Failed to fetch department amounts",
      error: error.message,
    });
  }
};

export const getDepartmentDetails = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // --- Existing data fetching (withdraws, deposits, etc.) ---
    const withdrawIds = parseJSONArray(department.withdraw);
    const depositIds = parseJSONArray(department.deposit);
    const realizedBenefitIds = parseJSONArray(department.realizedBenefit);
    const existIds = parseJSONArray(department.exist);
    const paysIds = parseJSONArray(department.pays);

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt[Op.lte] = endDateTime;
      }
    }

    // Prepare date range for debt/payment queries (same as existing)
    const debtDateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      debtDateFilter.createdAt = { [Op.between]: [start, end] };
    } else if (startDate || endDate) {
      // If only one date provided, ignore date filter for debts (or handle as needed)
      if (startDate) debtDateFilter.createdAt = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        debtDateFilter.createdAt = { ...debtDateFilter.createdAt, [Op.lte]: endDateTime };
      }
    }

    const paymentDateFilter = {};
    if (startDate && endDate) {
      paymentDateFilter.paymentDate = { [Op.between]: [startDate, endDate] };
    } else if (startDate || endDate) {
      if (startDate) paymentDateFilter.paymentDate = { [Op.gte]: startDate };
      if (endDate) paymentDateFilter.paymentDate = { [Op.lte]: endDate };
    }

    // Execute all queries in parallel
    const [
      withdraws, deposits, realizedBenefits, existingStocks, pays, expenses, sells, attendances,
      debts, debtPayments
    ] = await Promise.all([
      withdrawIds.length > 0
        ? DepartmentTransaction.findAll({ where: { id: { [Op.in]: withdrawIds }, is_deposit: false, ...dateFilter }, order: [['createdAt', 'DESC']] })
        : [],
      depositIds.length > 0
        ? DepartmentTransaction.findAll({ where: { id: { [Op.in]: depositIds }, is_deposit: true, ...dateFilter }, order: [['createdAt', 'DESC']] })
        : [],
      realizedBenefitIds.length > 0
        ? Benefit.findAll({ where: { id: { [Op.in]: realizedBenefitIds }, ...dateFilter }, include: [{ model: Sells, as: "benefitSell" }], order: [['createdAt', 'DESC']] })
        : [],
      existIds.length > 0
        ? StockExist.findAll({ where: { id: { [Op.in]: existIds } }, include: [{ model: Department, as: "stockExistDepartment" }] })
        : [],
      paysIds.length > 0
        ? Pay.findAll({ where: { id: { [Op.in]: paysIds }, ...dateFilter }, include: [{ model: Seller, as: "paySeller" }], order: [['createdAt', 'DESC']] })
        : [],
      Expense.findAll({ where: { departmentId: parseInt(departmentId), ...dateFilter }, include: [{ model: Department, as: "expenseDepartment" }], order: [['createdAt', 'DESC']] }),
      Sells.findAll({ where: { departmentId: parseInt(departmentId), ...dateFilter }, include: [{ model: StockExist, as: "sellStockExist" }, { model: Bill, as: "sellBill" }], order: [['createdAt', 'DESC']] }),
      Attendance.findAll({ where: { departmentId: parseInt(departmentId), ...dateFilter }, include: [{ model: Staff, as: "attendanceStaff" }], order: [['createdAt', 'DESC']] }),
      // Debts (created within date range for this department)
      Debt.findAll({
        where: { departmentId: parseInt(departmentId), ...debtDateFilter },
        include: [
          { model: Department, as: "debtDepartment", attributes: ["id", "name"] },
          { model: Staff, as: "debtStaff", attributes: ["id", "name"] },
          { model: NonStaff, as: "debtNonStaff", attributes: ["id", "name", "address"] },
          { model: Payment, as: "debtPayments", attributes: ["id", "amount", "paymentDate", "description", "departmentId"], include: [{ model: Department, as: "paymentDepartment", attributes: ["id", "name"] }], order: [["paymentDate", "DESC"]] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      // Debt Payments (paymentDate within range, optionally filter by department)
      Payment.findAll({
        where: { departmentId: parseInt(departmentId), ...paymentDateFilter },
        include: [
          { model: Debt, as: "paymentDebt", attributes: ["id", "purpose", "amount", "remainingAmount", "staffId", "nonStaffId"], include: [{ model: Staff, as: "debtStaff", attributes: ["id", "name"] }, { model: NonStaff, as: "debtNonStaff", attributes: ["id", "name"] }] },
          { model: Department, as: "paymentDepartment", attributes: ["id", "name"] },
        ],
        order: [["paymentDate", "DESC"]],
      }),
    ]);

    // --- Totals and summaries (existing) ---
    const totalWithdraws = withdraws.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
    const totalDeposits = deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalBenefits = realizedBenefits.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    const totalPays = pays.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalStockValue = existingStocks.reduce((sum, s) => sum + ((parseFloat(s.amount) || 0) * (parseFloat(s.unit_price) || 0)), 0);
    const totalReceipt = sells.reduce((sum, s) => sum + (parseFloat(s.receipt) || 0), 0);
    const totalRemaind = sells.reduce((sum, s) => sum + (parseFloat(s.remaind) || 0), 0);
    const totalSales = sells.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

    const totalAttendanceSalary = attendances.reduce((sum, a) => sum + (parseFloat(a.salary) || 0), 0);
    const totalAttendanceOvertime = attendances.reduce((sum, a) => sum + (parseFloat(a.overtime) || 0), 0);
    const totalAttendanceAmount = attendances.reduce((sum, a) => sum + (parseFloat(a.total) || 0), 0);
    const totalAttendanceReceipt = attendances.reduce((sum, a) => sum + (parseFloat(a.receipt) || 0), 0);
    const totalAttendanceRemaind = attendances.reduce((sum, a) => sum + ((parseFloat(a.total) || 0) - (parseFloat(a.receipt) || 0)), 0);

    // --- Debt & Payment summaries ---
    const totalDebtAmount = debts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalDebtPaid = debts.reduce((sum, d) => sum + (parseFloat(d.amount) - parseFloat(d.remainingAmount)), 0);
    const totalDebtRemaining = debts.reduce((sum, d) => sum + (parseFloat(d.remainingAmount) || 0), 0);
    const totalDebtPayments = debtPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const withdrawCount = withdraws.length;
    const depositCount = deposits.length;
    const realizedBenefitsCount = realizedBenefits.length;
    const existingStocksCount = existingStocks.length;
    const paysCount = pays.length;
    const expensesCount = expenses.length;
    const sellsCount = sells.length;
    const attendanceCount = attendances.length;
    const debtsCount = debts.length;
    const debtPaymentsCount = debtPayments.length;

    const totalIncoming = totalDeposits + totalBenefits + totalPays + totalReceipt + totalAttendanceReceipt;
    const totalOutgoing = totalWithdraws + totalExpenses + totalAttendanceAmount;
    const netCashFlow = totalIncoming - totalOutgoing;

    const totalAssets = totalDeposits + totalReceipt + totalRemaind + totalStockValue;
    const totalLiabilities = totalWithdraws + totalExpenses + totalPays + totalAttendanceRemaind + totalAttendanceReceipt;
    const grandTotal = totalAssets - totalLiabilities;



    // Helper to get debtor name
    const getDebtorName = (debt) => {
      if (debt.debtStaff?.name) return debt.debtStaff.name;
      if (debt.debtNonStaff?.name) return debt.debtNonStaff.name;
      return "Unknown";
    };

    res.status(200).json({
      success: true,
      message: "Department details fetched successfully",
      data: {
        department: {
          id: department.id,
          name: department.name,
          createdAt: department.createdAt
        },
        dateRange: startDate || endDate ? { startDate: startDate || null, endDate: endDate || null } : "all",
        summary: {
          withdrawals: { total:  (totalWithdraws), totalRaw: totalWithdraws, count: withdrawCount },
          deposits: { total:  (totalDeposits), totalRaw: totalDeposits, count: depositCount },
          realizedBenefits: { total:  (totalBenefits), totalRaw: totalBenefits, count: realizedBenefitsCount },
          inventoryValue: { total:  (totalStockValue), totalRaw: totalStockValue, count: existingStocksCount },
          pays: { total:  (totalPays), totalRaw: totalPays, count: paysCount },
          expenses: { total:  (totalExpenses), totalRaw: totalExpenses, count: expensesCount },
          salesRevenue: { total:  (totalSales), totalRaw: totalSales, count: sellsCount },
          salesReceipt: { total:  (totalReceipt), totalRaw: totalReceipt },
          salesRemaind: { total:  (totalRemaind), totalRaw: totalRemaind },
          staffSalaries: {
            total:  (totalAttendanceAmount), totalRaw: totalAttendanceAmount, count: attendanceCount,
            salaryPaid:  (totalAttendanceReceipt), salaryPaidRaw: totalAttendanceReceipt,
            salaryRemaind:  (totalAttendanceRemaind), salaryRemaindRaw: totalAttendanceRemaind
          },
          debts: {
            total:  (totalDebtAmount), totalRaw: totalDebtAmount, count: debtsCount,
            totalPaid:  (totalDebtPaid), totalPaidRaw: totalDebtPaid,
            totalRemaining:  (totalDebtRemaining), totalRemainingRaw: totalDebtRemaining
          },
          debtPayments: {
            total:  (totalDebtPayments), totalRaw: totalDebtPayments, count: debtPaymentsCount
          },
          totalIncoming: { total:  (totalIncoming), totalRaw: totalIncoming },
          totalOutgoing: { total:  (totalOutgoing), totalRaw: totalOutgoing },
          netCashFlow: { total:  (netCashFlow), totalRaw: netCashFlow },
          grandTotal: { total:  (grandTotal), totalRaw: grandTotal }
        },
        details: {
          withdrawals: withdraws.map(w => ({ id: w.id, amount: parseFloat(w.amount) || 0, amountFormatted:  (parseFloat(w.amount) || 0), createdAt: w.createdAt })),
          deposits: deposits.map(d => ({ id: d.id, amount: parseFloat(d.amount) || 0, amountFormatted:  (parseFloat(d.amount) || 0), createdAt: d.createdAt })),
          realizedBenefits: realizedBenefits.map(b => ({ id: b.id, amount: parseFloat(b.amount) || 0, amountFormatted:  (parseFloat(b.amount) || 0), sellId: b.sellId, createdAt: b.createdAt })),
          existingStocks: existingStocks.map(s => ({ id: s.id, name: s.name, amount: parseFloat(s.amount) || 0, unit_price: parseFloat(s.unit_price) || 0, total_value:  ((parseFloat(s.amount) || 0) * (parseFloat(s.unit_price) || 0)), total_value_raw: (parseFloat(s.amount) || 0) * (parseFloat(s.unit_price) || 0) })),
          pays: pays.map(p => ({ id: p.id, amount: parseFloat(p.amount) || 0, amountFormatted:  (parseFloat(p.amount) || 0), sellerName: p.paySeller?.fullname || "Unknown", description: p.description, createdAt: p.createdAt })),
          expenses: expenses.map(e => ({ id: e.id, amount: parseFloat(e.amount) || 0, amountFormatted:  (parseFloat(e.amount) || 0), purpose: e.purpose, by: e.by, description: e.description, createdAt: e.createdAt })),
          sells: sells.map(s => ({ id: s.id, amount: parseFloat(s.amount) || 0, total: parseFloat(s.total) || 0, totalFormatted:  (parseFloat(s.total) || 0), receipt: parseFloat(s.receipt) || 0, receiptFormatted:  (parseFloat(s.receipt) || 0), remaind: parseFloat(s.remaind) || 0, remaindFormatted:  (parseFloat(s.remaind) || 0), productName: s.sellStockExist?.name || "Unknown", billNumber: s.sellBill?.billNumber || "N/A", createdAt: s.createdAt })),
          attendances: attendances.map(a => ({ id: a.id, staffId: a.staffId, staffName: a.attendanceStaff?.name || "Unknown", staffFatherName: a.attendanceStaff?.fatherName || "", attendance: a.attendance, salary: parseFloat(a.salary) || 0, salaryFormatted:  (parseFloat(a.salary) || 0), overtime: parseFloat(a.overtime) || 0, overtimeFormatted:  (parseFloat(a.overtime) || 0), total: parseFloat(a.total) || 0, totalFormatted:  (parseFloat(a.total) || 0), receipt: parseFloat(a.receipt) || 0, receiptFormatted:  (parseFloat(a.receipt) || 0), remaind: (parseFloat(a.total) || 0) - (parseFloat(a.receipt) || 0), remaindFormatted:  ((parseFloat(a.total) || 0) - (parseFloat(a.receipt) || 0)), calculated: a.calculated, createdAt: a.createdAt })),
          // NEW: Debts list (with payments nested)
          debts: debts.map(debt => {
            const debtPaid = parseFloat(debt.amount) - parseFloat(debt.remainingAmount);
            return {
              id: debt.id,
              debtor: getDebtorName(debt),
              purpose: debt.purpose,
              amount: parseFloat(debt.amount),
              amountFormatted:  (parseFloat(debt.amount)),
              paid: debtPaid,
              paidFormatted:  (debtPaid),
              remaining: parseFloat(debt.remainingAmount),
              remainingFormatted:  (parseFloat(debt.remainingAmount)),
              isActive: debt.isActive,
              createdAt: debt.createdAt,
              payments: debt.debtPayments.map(p => ({
                id: p.id,
                amount: parseFloat(p.amount),
                amountFormatted:  (parseFloat(p.amount)),
                paymentDate: p.paymentDate,
                description: p.description,
                department: p.paymentDepartment?.name || null
              }))
            };
          }),
          // NEW: Debt payments list (flat, for reporting)
          debtPayments: debtPayments.map(p => ({
            id: p.id,
            debtId: p.debtId,
            debtor: p.paymentDebt?.debtStaff?.name || p.paymentDebt?.debtNonStaff?.name || "Unknown",
            debtPurpose: p.paymentDebt?.purpose || "-",
            amount: parseFloat(p.amount),
            amountFormatted:  (parseFloat(p.amount)),
            paymentDate: p.paymentDate,
            description: p.description,
            department: p.paymentDepartment?.name || "-",
            createdAt: p.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error("Error in getDepartmentDetails:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch department details",
      error: error.message
    });
  }
};

// Helper function to parse JSON arrays (unchanged)
function parseJSONArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// NEW: Get departments for a specific user with their holding percentage
export const getUserDepartmentsWithShare = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userIdStr = String(userId);

    const allDepartments = await Department.findAll({
      order: [["name", "ASC"]],
    });

    const userDepartments = [];
    for (const dept of allDepartments) {
      const holding = getHoldingObject(dept.holding);
      const userShare = holding[userIdStr];
      if (userShare !== undefined && userShare !== null && userShare !== 0) {
        userDepartments.push({
          id: dept.id,
          name: dept.name,
          isActive: dept.isActive,
          holding: dept.holding,
          userShare: parseFloat(userShare),
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Departments fetched successfully for user",
      userId: userIdStr,
      count: userDepartments.length,
      data: userDepartments,
    });
  } catch (error) {
    console.error("Error in getUserDepartmentsWithShare:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments for user",
      error: error.message,
    });
  }
};