import Staff from "../../Models/Staff/staff.js";
import Department from "../../Models/Department.js";
import { Op } from "sequelize";
import sequelize from "../../dbconnection.js";

/* =========================
   CREATE STAFF
========================= */
export const createStaff = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      fatherName,
      NIC,
      salary,
      overTimePerHour,
      workingDaysPerWeek,
      departmentId,
    } = req.body;

    if (
      !name ||
      !fatherName ||
      !NIC ||
      salary === undefined ||
      overTimePerHour === undefined ||
      workingDaysPerWeek === undefined ||
      !departmentId
    ) {
      await transaction.rollback();
      return res.status(400).json({
        message: "All fields including departmentId are required",
      });
    }

    // Check if department exists
    const department = await Department.findByPk(departmentId, { transaction });
    if (!department) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Department not found",
      });
    }

    const staff = await Staff.create({
      name,
      fatherName,
      NIC,
      salary: parseFloat(salary),
      overTimePerHour: parseFloat(overTimePerHour),
      workingDaysPerWeek: parseInt(workingDaysPerWeek),
      departmentId: parseInt(departmentId),
    }, { transaction });

    await transaction.commit();

    // Fetch staff with department information - USE CORRECT ALIAS
    const staffWithDepartment = await Staff.findByPk(staff.id, {
      include: [
        {
          model: Department,
          as: "staffDepartment", // Changed from "department" to "staffDepartment"
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    res.status(201).json({
      message: "Staff created successfully",
      staff: staffWithDepartment
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error creating staff",
      error: error.message,
    });
  }
};

/* =========================
   GET ALL STAFF (PAGINATION)
========================= */
export const getStaffs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const where = {};
    if (req.query.departmentId) {
      where.departmentId = parseInt(req.query.departmentId);
    }
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { fatherName: { [Op.like]: `%${req.query.search}%` } },
        { NIC: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await Staff.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: Department,
          as: "staffDepartment", // Changed from "department" to "staffDepartment"
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    res.json({
      staffs: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit: limit
      },
      filters: {
        departmentId: req.query.departmentId || null,
        search: req.query.search || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching staff",
      error: error.message,
    });
  }
};

/* =========================
   GET STAFF BY ID
========================= */
export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [
        {
          model: Department,
          as: "staffDepartment", // Changed from "department" to "staffDepartment"
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    res.json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching staff",
      error: error.message,
    });
  }
};

/* =========================
   UPDATE STAFF
========================= */
export const updateStaff = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const staff = await Staff.findByPk(req.params.id, { transaction });

    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const {
      name,
      fatherName,
      NIC,
      salary,
      overTimePerHour,
      workingDaysPerWeek,
      departmentId
    } = req.body;

    // Check if department exists if departmentId is provided and changed
    if (departmentId !== undefined && departmentId !== staff.departmentId) {
      if (departmentId) {
        const department = await Department.findByPk(departmentId, { transaction });
        if (!department) {
          await transaction.rollback();
          return res.status(404).json({
            message: "Department not found",
          });
        }
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (NIC !== undefined) updateData.NIC = NIC;
    if (salary !== undefined) updateData.salary = parseFloat(salary);
    if (overTimePerHour !== undefined) updateData.overTimePerHour = parseFloat(overTimePerHour);
    if (workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = parseInt(workingDaysPerWeek);
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;

    await staff.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated staff with department information
    const updatedStaff = await Staff.findByPk(staff.id, {
      include: [
        {
          model: Department,
          as: "staffDepartment", // Changed from "department" to "staffDepartment"
          attributes: ["id", "name", "isActive"]
        }
      ]
    });

    res.json({
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error updating staff",
      error: error.message,
    });
  }
};

/* =========================
   DELETE STAFF
========================= */
export const deleteStaff = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const staff = await Staff.findByPk(req.params.id, { transaction });

    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    await staff.destroy({ transaction });
    await transaction.commit();

    res.json({
      message: "Staff deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      message: "Error deleting staff",
      error: error.message,
    });
  }
};

/* =========================
   GET STAFF BY DEPARTMENT
========================= */
export const getStaffByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    const { count, rows } = await Staff.findAndCountAll({
      where: { departmentId: parseInt(departmentId) },
      limit,
      offset,
      order: [["name", "ASC"]],
      include: [
        {
          model: Department,
          as: "staffDepartment", // Changed from "department" to "staffDepartment"
          attributes: ["id", "name"]
        }
      ]
    });

    res.json({
      department: {
        id: department.id,
        name: department.name
      },
      staffs: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit: limit
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching staff by department",
      error: error.message,
    });
  }
};

/* =========================
   GET DEPARTMENT STAFF SUMMARY
========================= */
export const getDepartmentStaffSummary = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    const staffs = await Staff.findAll({
      where: { departmentId: parseInt(departmentId) },
      attributes: ['id', 'name', 'salary', 'overTimePerHour', 'workingDaysPerWeek'],
      include: [
        {
          model: Department,
          as: "staffDepartment",
          attributes: ["id", "name"]
        }
      ]
    });

    const summary = {
      department: {
        id: department.id,
        name: department.name
      },
      totalStaff: staffs.length,
      totalWeeklySalary: staffs.reduce((sum, s) => sum + (parseFloat(s.salary) || 0), 0),
      averageSalary: staffs.length > 0 
        ? staffs.reduce((sum, s) => sum + (parseFloat(s.salary) || 0), 0) / staffs.length 
        : 0,
      staffList: staffs.map(s => ({
        id: s.id,
        name: s.name,
        salary: s.salary,
        overTimePerHour: s.overTimePerHour,
        workingDaysPerWeek: s.workingDaysPerWeek,
        department: s.staffDepartment
      }))
    };

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching department staff summary",
      error: error.message,
    });
  }
};