import { Department, Benefit, DepartmentTransaction, sequelize, StockExist, Pay, User, Seller } from "../Models/index.js";
import { Op } from "sequelize";

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
    const { userId } = req.params;  // or req.query

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    // Convert userId to string because JSON keys are strings
    const userIdStr = String(userId);

    // Fetch all departments (or you could filter with a raw SQL query, but this is simpler)
    const allDepartments = await Department.findAll();

    // Filter departments where holding[userIdStr] exists and is > 0 (or just exists)
    const userDepartments = allDepartments.filter(dept => {
      const holding = getHoldingObject(dept.holding);
      const userShare = holding[userIdStr];
      // We consider a holding if the value is a positive number (or any truthy value)
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

// ✅ Update Department – unchanged (with improved holding validation)
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



export const getBenefitsByDepartmentAndDate = async (req, res) => {
  try {
    // Support both: departmentId from params (old route) or from query (new route)
    let departmentId = req.params.departmentId || req.query.departmentId;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build where clause
    const whereClause = {};

    // If departmentId is provided and is NOT 'all' or empty string, validate and add filter
    if (departmentId && departmentId !== 'all' && departmentId !== '') {
      const deptIdNum = parseInt(departmentId);
      if (isNaN(deptIdNum)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
      // Check department exists
      const department = await Department.findByPk(deptIdNum);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      whereClause.departmentId = deptIdNum;
    }

    // Date range filter
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

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);

    const { count, rows: benefits } = await Benefit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
      offset,
      limit: parsedLimit,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      data: benefits,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / parsedLimit),
        currentPage: parseInt(page),
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    console.error("Error in getBenefitsByDepartmentAndDate:", error);
    res.status(500).json({ message: "Failed to fetch benefits", error: error.message });
  }
};


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
      include: [{ model: Department, as: "department", attributes: ["name"] }],
      offset,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch benefits", error: error.message });
  }
};
// Helper to safely parse JSON arrays
const parseJSONArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Get amounts (and counts) for withdraw, deposit, realizedBenefit, exist, and pays for a department
export const getDepartmentCounts = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Parse stored ID arrays
    const withdrawIds = parseJSONArray(department.withdraw);
    const depositIds = parseJSONArray(department.deposit);
    const realizedBenefitIds = parseJSONArray(department.realizedBenefit);
    const existIds = parseJSONArray(department.exist);
    const paysIds = parseJSONArray(department.pays);   // <-- new: Pay IDs

    // Date filter for transactions & benefits
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

    // Grand total = deposit - withdraw + realizedBenefit + existTotal + paysTotal
    const grandTotal = depositTotal - withdrawTotal + realizedBenefitTotal + existTotal - paysTotal;

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
          grandTotal: grandTotal,
        },
        counts: {
          withdraw: withdrawCount,
          deposit: depositCount,
          realizedBenefit: realizedBenefitCount,
          exist: existCount,
          pays: paysCount,
        },
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

// Get detailed records for withdraw, deposit, realizedBenefit, exist, and pays
export const getDepartmentDetails = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Parse stored ID arrays
    const withdrawIds = parseJSONArray(department.withdraw);
    const depositIds = parseJSONArray(department.deposit);
    const realizedBenefitIds = parseJSONArray(department.realizedBenefit);
    const existIds = parseJSONArray(department.exist);
    const paysIds = parseJSONArray(department.pays);

    // Date filter
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

    // Helper to apply date filter only if object has createdAt field
    const applyDateFilter = (whereClause) => {
      if (Object.keys(dateFilter).length && dateFilter.createdAt) {
        whereClause.createdAt = dateFilter.createdAt;
      }
      return whereClause;
    };

    // 1. Withdraw transactions (is_deposit = false) with user name
    let withdraws = [];
    if (withdrawIds.length > 0) {
      withdraws = await DepartmentTransaction.findAll({
        where: applyDateFilter({ id: { [Op.in]: withdrawIds }, is_deposit: false }),
        include: [
          {
            model: User,
            as: 'user',        // adjust alias if different (e.g., 'userInfo')
            attributes: ['fullname'], // try 'fullname' first, fallback to 'name'
            required: false,
          },
        ],
        attributes: ['id', 'amount', 'createdAt', 'userId', 'depId'],
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true,
      });
      // Extract user name (choose fullname if exists, else name)
      withdraws = withdraws.map(w => ({
        ...w,
        userName: w.user?.fullname || w.user?.name || 'Unknown',
        user: undefined, // remove nested user object
      }));
    }

    // 2. Deposit transactions (is_deposit = true) with user name
    let deposits = [];
    if (depositIds.length > 0) {
      deposits = await DepartmentTransaction.findAll({
        where: applyDateFilter({ id: { [Op.in]: depositIds }, is_deposit: true }),
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['fullname'],
            required: false,
          },
        ],
        attributes: ['id', 'amount', 'createdAt', 'userId', 'depId'],
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true,
      });
      deposits = deposits.map(d => ({
        ...d,
        userName: d.user?.fullname || 'Unknown',
        user: undefined,
      }));
    }

    // 3. Realized Benefits (no user info needed)
    let realizedBenefits = [];
    if (realizedBenefitIds.length > 0) {
      realizedBenefits = await Benefit.findAll({
        where: applyDateFilter({ id: { [Op.in]: realizedBenefitIds } }),
        attributes: ['id', 'amount', 'sellId', 'departmentId', 'createdAt'],
        order: [['createdAt', 'DESC']],
        raw: true,
      });
    }

    // 4. Existing Stock Items (no user info)
    let existingStocks = [];
    if (existIds.length > 0) {
      existingStocks = await StockExist.findAll({
        where: { id: { [Op.in]: existIds } },
        attributes: ['id', 'name', 'amount', 'unit_price', 'sell_price', 'departmentId', 'createdAt'],
        order: [['name', 'ASC']],
        raw: true,
      });
      existingStocks = existingStocks.map(item => ({
        ...item,
        total_value: (item.amount || 0) * (item.unit_price || 0)
      }));
    }

 // 5. Pays with seller's full name (assuming seller is a foreign key to Seller model)
let pays = [];
if (paysIds.length > 0) {
  pays = await Pay.findAll({
    where: applyDateFilter({ id: { [Op.in]: paysIds } }),
    include: [
      {
        model: Seller,
        as: 'sellerInfo',   // correct alias from association
        attributes: ['fullname'],
        required: false,
      },
    ],
    attributes: ['id', 'amount', 'seller', 'description', 'createdAt'],
    order: [['createdAt', 'DESC']],
    raw: true,
    nest: true,
  });
  pays = pays.map(p => ({
    ...p,
    sellerName: p.sellerInfo?.fullname || p.seller || 'Unknown',
    sellerInfo: undefined,
  }));
}

    res.status(200).json({
      message: "Department details fetched successfully",
      data: {
        departmentId: department.id,
        departmentName: department.name,
        dateRange: startDate || endDate
          ? { startDate: startDate || null, endDate: endDate || null }
          : "all",
        withdraws,
        deposits,
        realizedBenefits,
        existingStocks,
        pays,
      },
    });
  } catch (error) {
    console.error("Error in getDepartmentDetails:", error);
    res.status(500).json({
      message: "Failed to fetch department details",
      error: error.message,
    });
  }
};


// NEW: Get departments for a specific user with their holding percentage
export const getUserDepartmentsWithShare = async (req, res) => {
  try {
    const { userId } = req.params;   // e.g., /api/departments/user/:userId
    // Alternative: if userId comes from query: const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const userIdStr = String(userId);

    // Fetch all departments (you can add pagination if needed)
    const allDepartments = await Department.findAll({
      order: [["name", "ASC"]],
    });

    // Filter and enrich with user's share
    const userDepartments = [];
    for (const dept of allDepartments) {
      const holding = getHoldingObject(dept.holding);
      const userShare = holding[userIdStr];
      if (userShare !== undefined && userShare !== null && userShare !== 0) {
        userDepartments.push({
          id: dept.id,
          name: dept.name,
          isActive: dept.isActive,
          holding: dept.holding,          // full holding object
          userShare: parseFloat(userShare), // user's percentage (e.g., 20)
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