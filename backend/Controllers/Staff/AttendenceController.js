import Attendance from "../../Models/Staff/Attendence.js";
import Staff from "../../Models/Staff/staff.js";
import Department from "../../Models/Department.js";
import sequelize from "../../dbconnection.js";
import { Op } from "sequelize";

const calculateAmounts = (attendance, dailySalary, overTimePerHour, workingDaysPerWeek) => {
  let attendanceDays = 0;
  let overtimeHours = 0;

  Object.values(attendance).forEach(day => {
    if (day.attendance) attendanceDays++;
    overtimeHours += Number(day.overtime || 0);
  });

  const salary = attendanceDays * (dailySalary / workingDaysPerWeek);
  const overtime = overtimeHours * overTimePerHour;
  const total = salary + overtime;

  return { salary, overtime, total };
};

/* ==============================
   Create Attendance Record
================================ */
export const createAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { staffId, attendance, weekStartDate } = req.body;

    // Validation
    if (!staffId || !attendance) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "staffId and attendance are required" 
      });
    }

    // Check if staff exists and get departmentId from staff
    const staff = await Staff.findByPk(staffId, { transaction });
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({ message: "Staff not found" });
    }

    // Get departmentId from staff record
    const departmentId = staff.departmentId;
    
    // Check if department exists
    const department = await Department.findByPk(departmentId, { transaction });
    if (!department) {
      await transaction.rollback();
      return res.status(404).json({ message: "Department not found for this staff member" });
    }

    // Calculate amounts
    const { salary, overtime, total } = calculateAmounts(
      attendance,
      staff.salary,
      staff.overTimePerHour,
      staff.workingDaysPerWeek
    );

    // Extract month and year from weekStartDate
    let month = null, year = null;
    if (weekStartDate) {
      const date = new Date(weekStartDate);
      month = date.getMonth() + 1;
      year = date.getFullYear();
    }

    const record = await Attendance.create({
      staffId,
      attendance,
      departmentId, // Auto-populated from staff
      salary,
      overtime,
      total,
      weekStartDate: weekStartDate || null,
      month,
      year,
      receipt: 0,
      calculated: false
    }, { transaction });

    await transaction.commit();

    // Fetch with associations
    const recordWithDetails = await Attendance.findByPk(record.id, {
      include: [
        { 
          model: Staff, 
          as: "attendanceStaff", 
          attributes: ["id", "name", "fatherName", "salary", "overTimePerHour", "workingDaysPerWeek"] 
        },
        { 
          model: Department, 
          as: "attendanceDepartment", 
          attributes: ["id", "name"] 
        }
      ]
    });

    res.status(201).json({
      message: "Attendance record created successfully",
      attendance: recordWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   Get All Attendances with Pagination & Filters
================================ */
export const getAttendances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where = {};
    
    if (req.query.departmentId) {
      where.departmentId = parseInt(req.query.departmentId);
    }
    
    if (req.query.staffId) {
      where.staffId = parseInt(req.query.staffId);
    }
    
    if (req.query.calculated !== undefined) {
      where.calculated = req.query.calculated === 'true';
    }
    
    if (req.query.month && req.query.year) {
      where.month = parseInt(req.query.month);
      where.year = parseInt(req.query.year);
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        { 
          model: Staff, 
          as: "attendanceStaff", 
          attributes: ["id", "name", "fatherName", "salary", "overTimePerHour", "workingDaysPerWeek"] 
        },
        { 
          model: Department, 
          as: "attendanceDepartment", 
          attributes: ["id", "name"] 
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Calculate summary
    const summary = {
      totalSalary: rows.reduce((sum, r) => sum + (r.salary || 0), 0),
      totalOvertime: rows.reduce((sum, r) => sum + (r.overtime || 0), 0),
      totalAmount: rows.reduce((sum, r) => sum + (r.total || 0), 0),
      totalPaid: rows.reduce((sum, r) => sum + (r.receipt || 0), 0),
      totalRemaining: rows.reduce((sum, r) => sum + ((r.total || 0) - (r.receipt || 0)), 0)
    };

    res.json({
      data: rows,
      summary,
      pagination: {
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit: limit
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   Get Attendance by ID
================================ */
export const getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id, {
      include: [
        { 
          model: Staff, 
          as: "attendanceStaff", 
          attributes: ["id", "name", "fatherName", "salary", "overTimePerHour", "workingDaysPerWeek"] 
        },
        { 
          model: Department, 
          as: "attendanceDepartment", 
          attributes: ["id", "name"] 
        }
      ],
    });

    if (!record) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   Update Attendance
================================ */
export const updateAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { attendance, receipt, calculated } = req.body;

    const record = await Attendance.findByPk(req.params.id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Attendance not found" });
    }

    const staff = await Staff.findByPk(record.staffId, { transaction });
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({ message: "Staff not found" });
    }

    const updateData = {};

    // If attendance is being updated, recalculate amounts
    if (attendance) {
      const { salary, overtime, total } = calculateAmounts(
        attendance,
        staff.salary,
        staff.overTimePerHour,
        staff.workingDaysPerWeek
      );
      updateData.attendance = attendance;
      updateData.salary = salary;
      updateData.overtime = overtime;
      updateData.total = total;
    }

    // Update receipt and calculated status
    if (receipt !== undefined) {
      updateData.receipt = receipt;
      // Auto-calculate if receipt equals total
      if (receipt === (updateData.total || record.total)) {
        updateData.calculated = true;
      } else if (receipt !== (updateData.total || record.total)) {
        updateData.calculated = false;
      }
    }

    if (calculated !== undefined) {
      updateData.calculated = calculated;
    }

    await record.update(updateData, { transaction });

    await transaction.commit();

    const updatedRecord = await Attendance.findByPk(record.id, {
      include: [
        { model: Staff, as: "attendanceStaff" },
        { model: Department, as: "attendanceDepartment" }
      ]
    });

    res.json({
      message: "Attendance updated successfully",
      attendance: updatedRecord
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   Delete Attendance
================================ */
export const deleteAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const record = await Attendance.findByPk(req.params.id, { transaction });

    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Attendance not found" });
    }

    await record.destroy({ transaction });
    await transaction.commit();
    
    res.json({ message: "Attendance deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   Get Attendances by Date Range
================================ */
export const getAttendancesByDateRange = async (req, res) => {
  try {
    const { from, to, departmentId, staffId } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "Both 'from' and 'to' dates are required",
      });
    }

    // Convert query strings to Date objects
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Build where clause
    const where = {
      createdAt: {
        [Op.between]: [fromDate, toDate],
      },
    };

    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    if (staffId) {
      where.staffId = parseInt(staffId);
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        { 
          model: Staff, 
          as: "attendanceStaff", 
          attributes: ["id", "name", "fatherName"] 
        },
        { 
          model: Department, 
          as: "attendanceDepartment", 
          attributes: ["id", "name"] 
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate summary statistics
    const summary = {
      totalRecords: attendances.length,
      totalSalary: attendances.reduce((sum, a) => sum + (a.salary || 0), 0),
      totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0),
      totalAmount: attendances.reduce((sum, a) => sum + (a.total || 0), 0),
      totalPaid: attendances.reduce((sum, a) => sum + (a.receipt || 0), 0),
      totalRemaining: attendances.reduce((sum, a) => sum + ((a.total || 0) - (a.receipt || 0)), 0),
    };

    // Group by department
    const byDepartment = {};
    attendances.forEach(att => {
      const deptName = att.attendanceDepartment?.name || "Unknown";
      if (!byDepartment[deptName]) {
        byDepartment[deptName] = {
          count: 0,
          totalAmount: 0,
          totalPaid: 0
        };
      }
      byDepartment[deptName].count++;
      byDepartment[deptName].totalAmount += att.total || 0;
      byDepartment[deptName].totalPaid += att.receipt || 0;
    });

    res.status(200).json({
      message: "Attendances fetched successfully",
      filters: { from, to, departmentId, staffId },
      summary,
      byDepartment,
      data: attendances,
    });
  } catch (error) {
    console.error("Error fetching attendances by date:", error);
    res.status(500).json({
      message: "Error fetching attendances",
      error: error.message,
    });
  }
};

/* ==============================
   Get Department Attendance Summary
================================ */
export const getDepartmentAttendanceSummary = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { month, year } = req.query;

    // Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Build where clause
    const where = { departmentId: parseInt(departmentId) };
    
    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        { 
          model: Staff, 
          as: "attendanceStaff", 
          attributes: ["id", "name", "salary", "overTimePerHour"] 
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Group by staff
    const byStaff = {};
    attendances.forEach(att => {
      const staffName = att.attendanceStaff?.name || "Unknown";
      if (!byStaff[staffName]) {
        byStaff[staffName] = {
          staffId: att.staffId,
          records: 0,
          totalSalary: 0,
          totalOvertime: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0
        };
      }
      byStaff[staffName].records++;
      byStaff[staffName].totalSalary += att.salary || 0;
      byStaff[staffName].totalOvertime += att.overtime || 0;
      byStaff[staffName].totalAmount += att.total || 0;
      byStaff[staffName].totalPaid += att.receipt || 0;
      byStaff[staffName].totalRemaining += (att.total || 0) - (att.receipt || 0);
    });

    const summary = {
      department: {
        id: department.id,
        name: department.name
      },
      period: month && year ? `${month}/${year}` : "All time",
      totalRecords: attendances.length,
      totalSalary: attendances.reduce((sum, a) => sum + (a.salary || 0), 0),
      totalOvertime: attendances.reduce((sum, a) => sum + (a.overtime || 0), 0),
      totalAmount: attendances.reduce((sum, a) => sum + (a.total || 0), 0),
      totalPaid: attendances.reduce((sum, a) => sum + (a.receipt || 0), 0),
      totalRemaining: attendances.reduce((sum, a) => sum + ((a.total || 0) - (a.receipt || 0)), 0),
      byStaff: Object.values(byStaff)
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};