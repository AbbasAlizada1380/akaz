// controllers/salaryList.controller.js
import { SalaryList, Attendance, Staff, PaidSalary } from "../../../Models/index.js";
/* ---------------------------------------------------------
   Default attendance JSON for a new period
   --------------------------------------------------------- */
const defaultAttendanceJSON = () => ({
  Saturday:  { attendance: true, overtime: 0 },
  Sunday:    { attendance: true, overtime: 0 },
  Monday:    { attendance: true, overtime: 0 },
  Tuesday:   { attendance: true, overtime: 0 },
  Wednesday: { attendance: true, overtime: 0 },
  Thursday:  { attendance: true, overtime: 0 },
});

/* ---------------------------------------------------------
   Calculate pay for one staff member given an attendance JSON
   --------------------------------------------------------- */
function calculatePay(staff, attendanceJSON) {
  const dailySalary = Number(staff.salary || 0) / Number(staff.workingDaysPerWeek || 1);
  const overtimeRate = Number(staff.overTimePerHour || 0);

  let daysWorked = 0;
  let overtimeHours = 0;

  for (const day of Object.values(attendanceJSON || {})) {
    if (day?.attendance) daysWorked += 1;
    if (day?.overtime) overtimeHours += Number(day.overtime) || 0;
  }

  const salary = dailySalary * daysWorked;
  const overtime = overtimeRate * overtimeHours;
  const total = salary + overtime;

  return {
    salary: Number(salary.toFixed(2)),
    overtime: Number(overtime.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/* ---------------------------------------------------------
   CREATE SalaryList + Attendance rows for all active staff
   --------------------------------------------------------- */
export const createSalaryList = async (req, res) => {
  const transaction = await SalaryList.sequelize.transaction();

  try {
    const { name, range } = req.body;

    if (!name || !range) {
      await transaction.rollback();
      return res.status(400).json({ error: "نام و بازه الزامی است" });
    }

    // 1. Fetch active staff WITH the fields needed for pay calculation
    const activeStaff = await Staff.findAll({
      where: { isActive: true },
      attributes: [
        "id",
        "salary",
        "overTimePerHour",
        "workingDaysPerWeek",
      ],
      transaction,
    });

    const staffIds = activeStaff.map((s) => s.id);

    // 2. Build attendance rows and compute each row's pay
    const attendanceRows = activeStaff.map((s) => {
      const attendance = defaultAttendanceJSON();
      const { salary, overtime, total } = calculatePay(s, attendance);

      return {
        list: null,               // set after SalaryList is created
        staffId: s.id,
        attendance,
        salary,
        overtime,
        total,
        calculated: true,         // we already calculated it
      };
    });

    // 3. Compute the list total upfront
    const listTotal = attendanceRows.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    // 4. Create the SalaryList with the computed total
    const salaryList = await SalaryList.create(
      {
        name,
        range,
        staffIds,
        total: listTotal,         // ✅ sum of all attendance totals
        paid: 0,
      },
      { transaction }
    );

    // 5. Attach the list id and persist the attendance rows
    if (attendanceRows.length > 0) {
      const rowsWithListId = attendanceRows.map((r) => ({
        ...r,
        list: salaryList.id,
      }));

      await Attendance.bulkCreate(rowsWithListId, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      message: "لیست معاش با رکوردهای حاضری ایجاد شد.",
      salaryList,
      attendanceCreated: attendanceRows.length,
      staffIds,
      listTotal,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("createSalaryList error:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* READ ALL */
export const getAllSalaryLists = async (req, res) => {
  try {
    const lists = await SalaryList.findAll({ order: [["id", "DESC"]] });
    return res.json(lists);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* READ ONE */
export const getSalaryListById = async (req, res) => {
  try {
    const list = await SalaryList.findByPk(req.params.id, {
      include: [{ model: Attendance, include: [Staff] }],
    });
    if (!list) return res.status(404).json({ message: "Not found" });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* UPDATE */
export const updateSalaryList = async (req, res) => {
  try {
    const list = await SalaryList.findByPk(req.params.id);
    if (!list) return res.status(404).json({ message: "Not found" });
    await list.update(req.body);
    return res.json({ message: "Updated", list });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* DELETE */

export const deleteSalaryList = async (req, res) => {
  const transaction = await SalaryList.sequelize.transaction();

  try {
    const list = await SalaryList.findByPk(req.params.id, { transaction });
    if (!list) {
      await transaction.rollback();
      return res.status(404).json({ message: "SalaryList not found" });
    }

    // 1) Delete all attendance rows that belong to this list
    const deletedAttendanceCount = await Attendance.destroy({
      where: { list: list.id },
      transaction,
    });

    // 2) Delete the SalaryList itself
    await list.destroy({ transaction });

    await transaction.commit();

    return res.json({
      message: "Deleted successfully",
      deletedListId: list.id,
      deletedAttendanceCount,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("deleteSalaryList error:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const getPaidSalariesDailyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { Op } = await import("sequelize");

    /* ---------- 1. Build WHERE clause ---------- */
    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00.000Z`);
      if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59.999Z`);
    }

    /* ---------- 2. Fetch all PaidSalary rows in range ---------- */
    const rows = await PaidSalary.findAll({
      where,
      include: [
        {
          model: Attendance,
          as: "attendance",
          attributes: ["id", "staffId", "list", "salary", "overtime", "total"],
          include: [
            { model: Staff, as: "staff", attributes: ["id", "name"] },
            {
              model: SalaryList,
              as: "salaryList",
              attributes: ["id", "name", "range"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    /* ---------- 3. Flatten to a plain shape ---------- */
    const flat = rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paidAt: p.createdAt,
      date: p.createdAt ? p.createdAt.toISOString().slice(0, 10) : null,
      note: p.note,
      attendanceId: p.attendanceId,
      staffId: p.attendance?.staffId || null,
      staffName: p.attendance?.staff?.name || "—",
      listId: p.attendance?.list || null,
      listName: p.attendance?.salaryList?.name || "—",
      listRange: p.attendance?.salaryList?.range || "—",
      attendanceTotal: Number(p.attendance?.total || 0),
    }));

    /* ---------- 4. Group by day ---------- */
    const dayMap = new Map(); // date → { totalPaid, count, payments[] }

    for (const p of flat) {
      if (!p.date) continue; // skip rows without a date

      if (!dayMap.has(p.date)) {
        dayMap.set(p.date, {
          date: p.date,
          totalPaid: 0,
          count: 0,
          payments: [],
        });
      }

      const bucket = dayMap.get(p.date);
      bucket.totalPaid += p.amount;
      bucket.count += 1;
      bucket.payments.push(p);
    }

    /* ---------- 5. Convert to sorted array (newest first) ---------- */
    const days = Array.from(dayMap.values())
      .map((d) => ({
        ...d,
        totalPaid: Number(d.totalPaid.toFixed(2)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    /* ---------- 6. Overall totals ---------- */
    const totalPaid = flat.reduce((s, p) => s + p.amount, 0);
    const totalCount = flat.length;
    const daysCount = days.length;

    /* ---------- 7. Respond ---------- */
    return res.json({
      from: from || null,
      to: to || null,
      totalPaid: Number(totalPaid.toFixed(2)),
      totalCount,
      daysCount,
      days,       // aggregated per day
      payments: flat, // flat list (in case client wants it)
    });
  } catch (err) {
    console.error("getPaidSalariesDailyReport error:", err);
    return res.status(500).json({ error: err.message });
  }
};