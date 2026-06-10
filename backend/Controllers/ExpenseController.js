import Expense from "../Models/Expense.js";
import Department from "../Models/Department.js";
import sequelize from "../dbconnection.js";
import { Op } from "sequelize";

/* ==============================
   Create a new Expense
================================ */
export const createExpense = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { purpose, by, amount, departmentId, description } = req.body;

    // Validate required fields
    if (!purpose || !by || amount === undefined || !departmentId) {
      return res.status(400).json({
        message: "Purpose, by, amount, and departmentId are required",
      });
    }

    if (Number(amount) < 0) {
      return res.status(400).json({ message: "Amount must be >= 0" });
    }

    // Check if department exists
    const department = await Department.findByPk(departmentId, { transaction });
    if (!department) {
      await transaction.rollback();
      return res.status(404).json({ message: "Department not found" });
    }

    const expense = await Expense.create(
      { 
        purpose, 
        by, 
        amount: Number(amount), 
        departmentId: parseInt(departmentId),
        description 
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch created expense with department info
    const expenseWithDepartment = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    res.status(201).json({
      message: "Expense created successfully",
      expense: expenseWithDepartment,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error creating expense",
      error: error.message,
    });
  }
};

/* ==============================
   Get all Expenses (with pagination & filtering)
================================ */
export const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where = {};
    
    // Filter by department (uses expenses_department_id_idx index)
    if (req.query.departmentId) {
      where.departmentId = parseInt(req.query.departmentId);
    }
    
    // Filter by date range (uses expenses_dept_created_idx composite index)
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    } else if (req.query.startDate) {
      where.createdAt = {
        [Op.gte]: new Date(req.query.startDate)
      };
    } else if (req.query.endDate) {
      where.createdAt = {
        [Op.lte]: new Date(req.query.endDate)
      };
    }
    
    // Filter by amount range
    if (req.query.minAmount) {
      where.amount = { [Op.gte]: parseFloat(req.query.minAmount) };
    }
    if (req.query.maxAmount) {
      where.amount = { ...where.amount, [Op.lte]: parseFloat(req.query.maxAmount) };
    }
    
    // Filter by calculated status
    if (req.query.calculated !== undefined) {
      where.calculated = req.query.calculated === 'true';
    }
    
    // Search by purpose or by (basic text search)
    if (req.query.search) {
      where[Op.or] = [
        { purpose: { [Op.like]: `%${req.query.search}%` } },
        { by: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await Expense.findAndCountAll({
      where,
      limit,
      offset,
      order: [[req.query.sortBy || "createdAt", req.query.sortOrder === "asc" ? "ASC" : "DESC"]],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    // Calculate total amount for the filtered results
    const totalAmount = rows.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    res.json({
      data: rows,
      totalRecords: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit: limit,
      totalAmount: totalAmount,
      filters: req.query // echo back filters for debugging
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

/* ==============================
   Get Expense by ID
================================ */
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching expense",
      error: error.message,
    });
  }
};

/* ==============================
   Update Expense
================================ */
export const updateExpense = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { purpose, by, amount, departmentId, description } = req.body;

    const expense = await Expense.findByPk(req.params.id, { transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: "Expense not found" });
    }

    if (amount !== undefined && Number(amount) < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Amount must be >= 0" });
    }

    // If departmentId is being changed, verify new department exists
    if (departmentId && departmentId !== expense.departmentId) {
      const department = await Department.findByPk(departmentId, { transaction });
      if (!department) {
        await transaction.rollback();
        return res.status(404).json({ message: "New department not found" });
      }
    }

    await expense.update(
      {
        purpose: purpose ?? expense.purpose,
        by: by ?? expense.by,
        amount: amount !== undefined ? Number(amount) : expense.amount,
        departmentId: departmentId !== undefined ? parseInt(departmentId) : expense.departmentId,
        description: description ?? expense.description,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch updated expense with department info
    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    res.json({ message: "Expense updated successfully", expense: updatedExpense });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error updating expense",
      error: error.message,
    });
  }
};

/* ==============================
   Delete Expense
================================ */
export const deleteExpense = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const expense = await Expense.findByPk(req.params.id, { transaction });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: "Expense not found" });
    }

    await expense.destroy({ transaction });
    await transaction.commit();

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error deleting expense",
      error: error.message,
    });
  }
};

/* ==============================
   Get Expenses by Date Range (Fixed)
================================ */
export const getExpensesByDateRange = async (req, res) => {
  try {
    // Support multiple parameter naming conventions
    let { from, to, startDate, endDate, departmentId } = req.query;
    
    // Use startDate/endDate if from/to are not provided
    const fromDateParam = from || startDate;
    const toDateParam = to || endDate;

    if (!fromDateParam || !toDateParam) {
      return res.status(400).json({ 
        message: "Both 'from' and 'to' dates are required. Use query params: ?from=2024-01-01&to=2024-12-31 or ?startDate=2024-01-01&endDate=2024-12-31" 
      });
    }

    // Validate date formats
    const fromDate = new Date(fromDateParam);
    const toDate = new Date(toDateParam);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ 
        message: "Invalid date format. Please use YYYY-MM-DD format" 
      });
    }
    
    // Set time boundaries
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // Build where clause
    const where = {
      createdAt: {
        [Op.between]: [fromDate, toDate],
      },
    };

    // Add department filter if provided (uses composite index)
    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    console.log(`Fetching expenses from ${fromDate} to ${toDate}${departmentId ? ` for department ${departmentId}` : ''}`);

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name", "isActive"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate summary statistics
    const summary = {
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
      averageAmount: expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) / expenses.length 
        : 0,
      maxAmount: expenses.length > 0 
        ? Math.max(...expenses.map(e => parseFloat(e.amount))) 
        : 0,
      minAmount: expenses.length > 0 
        ? Math.min(...expenses.map(e => parseFloat(e.amount))) 
        : 0,
    };

    // Group by department if multiple departments
    const byDepartment = {};
    expenses.forEach(expense => {
      const deptName = expense.department?.name || "Unknown";
      const deptId = expense.department?.id || "unknown";
      const key = `${deptId}-${deptName}`;
      
      if (!byDepartment[key]) {
        byDepartment[key] = {
          departmentId: deptId,
          departmentName: deptName,
          count: 0,
          totalAmount: 0,
          expenses: []
        };
      }
      byDepartment[key].count++;
      byDepartment[key].totalAmount += parseFloat(expense.amount);
      byDepartment[key].expenses.push(expense);
    });

    res.json({
      success: true,
      period: { 
        from: fromDate.toISOString(), 
        to: toDate.toISOString(),
        fromParam: fromDateParam,
        toParam: toDateParam
      },
      summary,
      byDepartment: Object.values(byDepartment),
      expenses,
    });
  } catch (error) {
    console.error("Error in getExpensesByDateRange:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expenses by date range",
      error: error.message,
    });
  }
};

/* ==============================
   Get Expenses by Month (New Function)
================================ */
export const getExpensesByMonth = async (req, res) => {
  try {
    const { year, month, departmentId } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        message: "Year and month are required. Use query params: ?year=2024&month=1" 
      });
    }

    // Calculate month boundaries
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    const summary = {
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
    };

    res.json({
      success: true,
      month: `${year}-${String(month).padStart(2, '0')}`,
      summary,
      expenses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching expenses by month",
      error: error.message
    });
  }
};

/* ==============================
   Get Department Expense Summary
================================ */
export const getDepartmentExpenseSummary = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { year, month } = req.query;

    // Validate department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Build date filters
    const where = { departmentId: parseInt(departmentId) };
    
    if (year && month) {
      // Filter by specific month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      // Filter by specific year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const expenses = await Expense.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    const summary = {
      department: {
        id: department.id,
        name: department.name
      },
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
      averageAmount: expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) / expenses.length 
        : 0,
      calculated: expenses.filter(e => e.calculated).length,
      uncalculated: expenses.filter(e => !e.calculated).length,
      byMonth: groupByMonth(expenses),
    };

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching department expense summary",
      error: error.message,
    });
  }
};

/* ==============================
   Bulk Update Calculated Status
================================ */
export const bulkUpdateCalculated = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { expenseIds, calculated } = req.body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({ message: "expenseIds array is required" });
    }

    const [updatedCount] = await Expense.update(
      { calculated: calculated === true },
      {
        where: { id: { [Op.in]: expenseIds } },
        transaction
      }
    );

    await transaction.commit();

    res.json({
      message: `${updatedCount} expenses updated successfully`,
      updatedCount
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error updating expenses",
      error: error.message
    });
  }
};

// Helper function to group expenses by month
function groupByMonth(expenses) {
  const grouped = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.createdAt);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = {
        count: 0,
        totalAmount: 0,
        expenses: []
      };
    }
    
    grouped[yearMonth].count++;
    grouped[yearMonth].totalAmount += parseFloat(expense.amount);
    grouped[yearMonth].expenses.push(expense);
  });
  
  return grouped;
}