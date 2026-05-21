import {Department} from "../Models/index.js";
import {Benefit} from "../Models/index.js"
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
    const { departmentId } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Validate department
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Build where clause
    const whereClause = { departmentId };
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