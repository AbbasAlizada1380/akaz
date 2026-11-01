import Staff from "../../Models/Staff/staff.js";
import Department from "../../Models/Department.js";
import { Op } from "sequelize";
import sequelize from "../../dbconnection.js";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const toBool = (v) => v === "false" ? false : Boolean(v);

const toNumber = (v, fallback = null) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (v, fallback = null) => {
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isInteger(n) ? n : fallback;
};

/* =========================
   CREATE STAFF
========================= */
export const createStaff = async (req, res) => {
  try {
    const {
      name,
      fatherName,
      NIC,
      salary,
      overTimePerHour,
      workingDaysPerWeek,
      departmentId,
      isActive,
    } = req.body;

    // --- validate BEFORE opening a transaction ---
    const salaryNum  = toNumber(salary);
    const overTimeNum = toNumber(overTimePerHour);
    const daysNum    = toInt(workingDaysPerWeek);
    const depId      = toInt(departmentId);

    if (
      !name || !fatherName || !NIC ||
      salaryNum === null ||
      overTimeNum === null ||
      depId === null
    ) {
      return res.status(400).json({
        message:
          "All fields (name, fatherName, NIC, salary, overTimePerHour, workingDaysPerWeek, departmentId) are required and must be valid numbers",
      });
    }

    const transaction = await sequelize.transaction();
    try {
      const department = await Department.findByPk(depId, { transaction });
      if (!department) {
        await transaction.rollback();
        return res.status(404).json({ message: "Department not found" });
      }

      const staff = await Staff.create(
        {
          name,
          fatherName,
          NIC,
          salary: salaryNum,
          overTimePerHour: overTimeNum,
          workingDaysPerWeek: daysNum,
          departmentId: depId,
          isActive: isActive === undefined ? true : toBool(isActive),
        },
        { transaction }
      );

      await transaction.commit();

      const staffWithDepartment = await Staff.findByPk(staff.id, {
        include: [
          {
            model: Department,
            as: "staffDepartment",
            attributes: ["id", "name"],
          },
        ],
      });

      return res.status(201).json({
        message: "Staff created successfully",
        staff: staffWithDepartment,
      });
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
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
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.departmentId) {
      where.departmentId = parseInt(req.query.departmentId);
    }
    if (req.query.search) {
      where[Op.or] = [
        { name:       { [Op.like]: `%${req.query.search}%` } },
        { fatherName: { [Op.like]: `%${req.query.search}%` } },
        { NIC:        { [Op.like]: `%${req.query.search}%` } },
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
          as: "staffDepartment",
          attributes: ["id", "name"],
        },
      ],
    });

    res.json({
      staffs: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
      filters: {
        departmentId: req.query.departmentId || null,
        search: req.query.search || null,
      },
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
          as: "staffDepartment",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!staff) return res.status(404).json({ message: "Staff not found" });

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
  try {
    const {
      name,
      fatherName,
      NIC,
      salary,
      overTimePerHour,
      workingDaysPerWeek,
      departmentId,
      isActive, // ✅ was missing — caused ReferenceError
    } = req.body;

    const transaction = await sequelize.transaction();
    try {
      const staff = await Staff.findByPk(req.params.id, { transaction });
      if (!staff) {
        await transaction.rollback();
        return res.status(404).json({ message: "Staff not found" });
      }

      // --- department change check ---
      const depId = departmentId !== undefined ? toInt(departmentId) : null;
      if (departmentId !== undefined) {
        if (depId === null) {
          await transaction.rollback();
          return res.status(400).json({
            message: "departmentId must be a valid integer",
          });
        }
        if (depId !== staff.departmentId) {
          const department = await Department.findByPk(depId, { transaction });
          if (!department) {
            await transaction.rollback();
            return res.status(404).json({ message: "Department not found" });
          }
        }
      }

      // --- build update payload ---
      const updateData = {};
      if (name       !== undefined) updateData.name = name;
      if (fatherName !== undefined) updateData.fatherName = fatherName;
      if (NIC        !== undefined) updateData.NIC = NIC;
      if (salary     !== undefined) {
        const n = toNumber(salary);
        if (n === null) {
          await transaction.rollback();
          return res.status(400).json({ message: "salary must be a number" });
        }
        updateData.salary = n;
      }
      if (overTimePerHour !== undefined) {
        const n = toNumber(overTimePerHour);
        if (n === null) {
          await transaction.rollback();
          return res.status(400).json({ message: "overTimePerHour must be a number" });
        }
        updateData.overTimePerHour = n;
      }
      if (workingDaysPerWeek !== undefined) {
        const n = toInt(workingDaysPerWeek);
        if (n === null) {
          await transaction.rollback();
          return res.status(400).json({ message: "workingDaysPerWeek must be an integer" });
        }
        updateData.workingDaysPerWeek = n;
      }
      if (departmentId !== undefined) updateData.departmentId = depId; // model is allowNull:false
      if (isActive     !== undefined) updateData.isActive = toBool(isActive);

      await staff.update(updateData, { transaction });
      await transaction.commit();

      const updatedStaff = await Staff.findByPk(staff.id, {
        include: [
          {
            model: Department,
            as: "staffDepartment",
            attributes: ["id", "name"],
          },
        ],
      });

      res.json({
        message: "Staff updated successfully",
        staff: updatedStaff,
      });
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  } catch (error) {
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
  try {
    const transaction = await sequelize.transaction();
    try {
      const staff = await Staff.findByPk(req.params.id, { transaction });
      if (!staff) {
        await transaction.rollback();
        return res.status(404).json({ message: "Staff not found" });
      }

      await staff.destroy({ transaction });
      await transaction.commit();

      res.json({ message: "Staff deleted successfully" });
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  } catch (error) {
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
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const { count, rows } = await Staff.findAndCountAll({
      where: { departmentId: parseInt(departmentId) },
      limit,
      offset,
      order: [["name", "ASC"]],
      include: [
        {
          model: Department,
          as: "staffDepartment",
          attributes: ["id", "name"],
        },
      ],
    });

    res.json({
      department: { id: department.id, name: department.name },
      staffs: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
      },
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

    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const staffs = await Staff.findAll({
      where: { departmentId: parseInt(departmentId), isActive: true },
      attributes: [
        "id",
        "name",
        "salary",              // ← monthly salary now
        "overTimePerHour",
        "workingDaysPerWeek",
      ],
      include: [
        {
          model: Department,
          as: "staffDepartment",
          attributes: ["id", "name"],
        },
      ],
    });

    const totalMonthlySalary = staffs.reduce(
      (sum, s) => sum + (parseFloat(s.salary) || 0),
      0
    );

    const summary = {
      department: { id: department.id, name: department.name },
      totalStaff: staffs.length,
      // ✅ renamed from totalWeeklySalary → totalMonthlySalary
      totalMonthlySalary,
      averageSalary:
        staffs.length > 0 ? totalMonthlySalary / staffs.length : 0,
      staffList: staffs.map((s) => ({
        id: s.id,
        name: s.name,
        salary: s.salary,
        overTimePerHour: s.overTimePerHour,
        workingDaysPerWeek: s.workingDaysPerWeek,
        department: s.staffDepartment,
      })),
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