import Attendance from "../../Models/Staff/Attendence.js";
import Staff from "../../Models/Staff/staff.js";
import Department from "../../Models/Department.js";
import sequelize from "../../dbconnection.js";
import { Op } from "sequelize";

// Helper: compute department summaries from salaries array
const computeDepartmentSummaries = async (salaries) => {
  // Map staffId -> departmentId
  const staffIds = salaries.map(s => s.staffId);
  const staffList = await Staff.findAll({
    where: { id: { [Op.in]: staffIds } },
    attributes: ['id', 'departmentId']
  });
  const staffDeptMap = {};
  staffList.forEach(s => { staffDeptMap[s.id] = s.departmentId; });

  // Group by department
  const deptMap = {};
  salaries.forEach(item => {
    const deptId = staffDeptMap[item.staffId];
    if (!deptId) return; // skip if staff not found (should not happen)
    if (!deptMap[deptId]) {
      deptMap[deptId] = { total: 0, received: 0, remained: 0 };
    }
    const total = (item.salary || 0) + (item.overtime || 0);
    const paid = item.paid || 0;
    deptMap[deptId].total += total;
    deptMap[deptId].received += paid;
    deptMap[deptId].remained += (total - paid);
  });

  // Convert to array of { department: { id, total, received, remained } }
  const summaries = [];
  for (const [deptId, data] of Object.entries(deptMap)) {
    summaries.push({
      department: {
        id: parseInt(deptId),
        total: data.total,
        received: data.received,
        remained: data.remained
      }
    });
  }
  return summaries;
};

/* ==============================
   CREATE Payroll Summary
================================ */
export const createAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month, year, salaries } = req.body;

    // Validate required fields
    if (!month || !year || !salaries || !Array.isArray(salaries)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "month, year, and salaries array are required"
      });
    }

    // Check if a summary for this month/year already exists
    const existing = await Attendance.findOne({
      where: { month, year },
      transaction
    });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({
        message: `Payroll for ${month}/${year} already exists`
      });
    }

    // Prepare salaries (add total)
    const preparedSalaries = prepareSalaries(salaries);

    // Compute department summaries
    const departmentSummaries = await computeDepartmentSummaries(preparedSalaries);

    const record = await Attendance.create({
      month,
      year,
      salaries: preparedSalaries,
      departmentSummaries
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: "Payroll summary created successfully",
      attendance: record
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   GET All Payroll Summaries
================================ */
export const getAttendances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.month) where.month = parseInt(req.query.month);
    if (req.query.year) where.year = parseInt(req.query.year);

    // Filter by department (check if any department summary matches)
    if (req.query.departmentId) {
      const deptId = parseInt(req.query.departmentId);
      // We'll use a custom filter after fetching (Sequelize JSON queries are possible but complex)
      // Alternatively, we can query using JSON_EXTRACT or similar. Here we'll do post-filtering.
      // For performance, better to add a virtual field or store departmentIds separately.
      // We'll handle this in the `where` by using a JSON contains condition (MySQL/PostgreSQL specific).
      // For simplicity, we'll filter in JavaScript after fetching.
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      order: [["year", "DESC"], ["month", "DESC"]],
      limit,
      offset
    });

    // Post-filter by departmentId if provided
    let filteredRows = rows;
    if (req.query.departmentId) {
      const deptId = parseInt(req.query.departmentId);
      filteredRows = rows.filter(record => {
        return record.departmentSummaries.some(
          summary => summary.department.id === deptId
        );
      });
      // Recalculate count for pagination (rough)
      // In real world, you'd use a more efficient query.
    }

    // Compute overall totals from departmentSummaries
    const overall = {
      total: 0,
      received: 0,
      remained: 0
    };
    filteredRows.forEach(record => {
      record.departmentSummaries.forEach(ds => {
        overall.total += ds.department.total;
        overall.received += ds.department.received;
        overall.remained += ds.department.remained;
      });
    });

    res.json({
      data: filteredRows,
      summary: overall,
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
   GET Payroll by ID
================================ */
export const getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Payroll summary not found" });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: prepare salaries with numeric conversion
const prepareSalaries = (salariesInput) => {
  return salariesInput.map(item => {
    const salary = Number(item.salary) || 0;
    const overtime = Number(item.overtime) || 0;
    const paid = Number(item.paid) || 0;
    return {
      staffId: item.staffId,
      salary,
      overtime,
      total: salary + overtime,   // numeric addition
      paid
    };
  });
};

/* ==============================
   UPDATE Payroll Summary (with numeric safety)
================================ */
export const updateAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { salaries, month, year } = req.body;

    const record = await Attendance.findByPk(id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Payroll summary not found" });
    }

    const updateData = {};

    if (month !== undefined) updateData.month = Number(month);
    if (year !== undefined) updateData.year = Number(year);

    // Handle salaries update (partial)
    if (salaries && Array.isArray(salaries)) {
      // Start with existing salaries from the record
      let existingSalaries = record.salaries || [];
      const salaryMap = {};
      existingSalaries.forEach(s => {
        salaryMap[s.staffId] = {
          staffId: s.staffId,
          salary: Number(s.salary) || 0,
          overtime: Number(s.overtime) || 0,
          paid: Number(s.paid) || 0,
          total: (Number(s.salary) || 0) + (Number(s.overtime) || 0)
        };
      });

      // Merge incoming changes
      salaries.forEach(incoming => {
        const staffId = incoming.staffId;
        if (!staffId) return;

        if (salaryMap[staffId]) {
          // Update only provided fields, convert to numbers
          if (incoming.salary !== undefined) salaryMap[staffId].salary = Number(incoming.salary) || 0;
          if (incoming.overtime !== undefined) salaryMap[staffId].overtime = Number(incoming.overtime) || 0;
          if (incoming.paid !== undefined) salaryMap[staffId].paid = Number(incoming.paid) || 0;
          // Recalculate total = salary + overtime (both numbers)
          salaryMap[staffId].total = salaryMap[staffId].salary + salaryMap[staffId].overtime;
        } else {
          // New staff – use provided or default values
          const salary = Number(incoming.salary) || 0;
          const overtime = Number(incoming.overtime) || 0;
          const paid = Number(incoming.paid) || 0;
          salaryMap[staffId] = {
            staffId,
            salary,
            overtime,
            paid,
            total: salary + overtime
          };
        }
      });

      const mergedSalaries = Object.values(salaryMap);
      const preparedSalaries = prepareSalaries(mergedSalaries); // ensures consistency
      updateData.salaries = preparedSalaries;
      updateData.departmentSummaries = await computeDepartmentSummaries(preparedSalaries);
    }

    await record.update(updateData, { transaction });
    await transaction.commit();

    const updated = await Attendance.findByPk(id);
    res.json({
      message: "Payroll summary updated successfully",
      attendance: updated
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   DELETE Payroll Summary
================================ */
export const deleteAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const record = await Attendance.findByPk(req.params.id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Payroll summary not found" });
    }
    await record.destroy({ transaction });
    await transaction.commit();
    res.json({ message: "Payroll summary deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   GET Payroll by Date Range (month/year)
================================ */
export const getAttendancesByDateRange = async (req, res) => {
  try {
    const { fromMonth, fromYear, toMonth, toYear, departmentId } = req.query;

    if (!fromMonth || !fromYear || !toMonth || !toYear) {
      return res.status(400).json({
        message: "fromMonth, fromYear, toMonth, toYear are required"
      });
    }

    // Build where clause for month/year range
    const where = {
      [Op.or]: [
        {
          year: { [Op.between]: [parseInt(fromYear), parseInt(toYear)] }
        },
        {
          year: parseInt(fromYear),
          month: { [Op.gte]: parseInt(fromMonth) }
        },
        {
          year: parseInt(toYear),
          month: { [Op.lte]: parseInt(toMonth) }
        }
      ]
    };

    // For simplicity, we'll use a simpler approach: fetch all and filter by date.
    // Better to use a compound condition but we'll keep it basic.
    const records = await Attendance.findAll({
      where: {
        [Op.and]: [
          { year: { [Op.gte]: parseInt(fromYear) } },
          { year: { [Op.lte]: parseInt(toYear) } },
          // Additional month conditions handled in JS
        ]
      },
      order: [["year", "ASC"], ["month", "ASC"]]
    });

    // Filter by month/year range precisely
    const filtered = records.filter(rec => {
      const recDate = new Date(rec.year, rec.month - 1);
      const fromDate = new Date(parseInt(fromYear), parseInt(fromMonth) - 1);
      const toDate = new Date(parseInt(toYear), parseInt(toMonth) - 1);
      return recDate >= fromDate && recDate <= toDate;
    });

    // Filter by department if provided
    let result = filtered;
    if (departmentId) {
      const deptId = parseInt(departmentId);
      result = filtered.filter(rec =>
        rec.departmentSummaries.some(ds => ds.department.id === deptId)
      );
    }

    // Compute summary
    const summary = {
      totalSalary: 0,
      totalOvertime: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalRemaining: 0
    };
    result.forEach(rec => {
      rec.salaries.forEach(s => {
        summary.totalSalary += s.salary || 0;
        summary.totalOvertime += s.overtime || 0;
        summary.totalAmount += s.total || 0;
        summary.totalPaid += s.paid || 0;
        summary.totalRemaining += (s.total || 0) - (s.paid || 0);
      });
    });

    res.json({
      message: "Payroll summaries fetched by date range",
      filters: req.query,
      summary,
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==============================
   GET Department Summary across months
================================ */
export const getDepartmentAttendanceSummary = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { month, year } = req.query;

    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }

    const dept = await Department.findByPk(departmentId);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Build where for month/year if provided
    const where = {};
    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    const records = await Attendance.findAll({
      where,
      order: [["year", "DESC"], ["month", "DESC"]]
    });

    // Filter records that include this department in their summaries
    const deptRecords = records.filter(rec =>
      rec.departmentSummaries.some(ds => ds.department.id === parseInt(departmentId))
    );

    // Aggregate data for this department
    let totalSalary = 0, totalOvertime = 0, totalAmount = 0, totalPaid = 0, totalRemaining = 0;
    deptRecords.forEach(rec => {
      // Find the department summary for this dept
      const deptSum = rec.departmentSummaries.find(ds => ds.department.id === parseInt(departmentId));
      if (deptSum) {
        totalAmount += deptSum.department.total;
        totalPaid += deptSum.department.received;
        totalRemaining += deptSum.department.remained;
      }
      // For salary/overtime breakdown, we need to sum per staff in this dept.
      // We can iterate salaries and match staff's department (fetch staff)
      // For simplicity, we'll compute from department summaries only.
    });

    // Also compute by staff within this department for detailed view
    const staffMap = {};
    for (const rec of deptRecords) {
      for (const sal of rec.salaries) {
        const staff = await Staff.findByPk(sal.staffId, { attributes: ['id', 'name', 'departmentId'] });
        if (staff && staff.departmentId === parseInt(departmentId)) {
          if (!staffMap[staff.id]) {
            staffMap[staff.id] = {
              staffId: staff.id,
              name: staff.name,
              totalSalary: 0,
              totalOvertime: 0,
              totalAmount: 0,
              totalPaid: 0,
              totalRemaining: 0
            };
          }
          staffMap[staff.id].totalSalary += sal.salary || 0;
          staffMap[staff.id].totalOvertime += sal.overtime || 0;
          staffMap[staff.id].totalAmount += sal.total || 0;
          staffMap[staff.id].totalPaid += sal.paid || 0;
          staffMap[staff.id].totalRemaining += (sal.total || 0) - (sal.paid || 0);
        }
      }
    }

    const summary = {
      department: {
        id: dept.id,
        name: dept.name
      },
      period: month && year ? `${month}/${year}` : "All time",
      totalRecords: deptRecords.length,
      totalSalary,
      totalOvertime,
      totalAmount,
      totalPaid,
      totalRemaining,
      byStaff: Object.values(staffMap)
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};