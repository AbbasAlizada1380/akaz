// controllers/attendance.controller.js
import {
  SalaryList,
  Attendance,
  Staff,
  PaidSalary,
} from "../../../Models/index.js";
import { Op } from "sequelize";

/* ---------------------------------------------------------
   Helper: build the default attendance JSON for a new period
   --------------------------------------------------------- */
const defaultAttendanceJSON = () => ({
  Saturday: { attendance: false, overtime: 0 },
  Sunday: { attendance: false, overtime: 0 },
  Monday: { attendance: false, overtime: 0 },
  Tuesday: { attendance: false, overtime: 0 },
  Wednesday: { attendance: false, overtime: 0 },
  Thursday: { attendance: false, overtime: 0 },
});

/* ---------------------------------------------------------
   PAY CALCULATION HELPER
   total = salary + overtime - tax
   --------------------------------------------------------- */
function calculatePay(staff, attendanceJSON) {
  const dailySalary = Number(staff.salary) / Number(staff.workingDaysPerWeek);
  const overtimeRate = Number(staff.overTimePerHour);

  let daysWorked = 0;
  let overtimeHours = 0;

  for (const day of Object.values(attendanceJSON)) {
    if (day?.attendance) daysWorked += 1;
    if (day?.overtime) overtimeHours += Number(day.overtime) || 0;
  }

  const salary = dailySalary * daysWorked;
  const overtime = overtimeRate * overtimeHours;
  const tax = 0; // default; can be derived later
  const total = salary + overtime - tax;

  return {
    salary: Number(salary.toFixed(2)),
    overtime: Number(overtime.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/* ---------------------------------------------------------
   READ ALL attendance records (optionally filtered by list)
   --------------------------------------------------------- */
export const getAllAttendance = async (req, res) => {
  try {
    const where = {};
    if (req.query.list) where.list = req.query.list;
    if (req.query.staffId) where.staffId = req.query.staffId;

    const records = await Attendance.findAll({
      where,
      include: [
        {
          model: Staff,
          as: "attendanceStaff",
          attributes: [
            "id", "name", "fatherName", "NIC",
            "salary", "overTimePerHour", "workingDaysPerWeek",
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({ attendances: records });
  } catch (error) {
    console.error("getAllAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   READ ONE
   --------------------------------------------------------- */
export const getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: Staff,
          as: "attendanceStaff",
          attributes: [
            "id",
            "name",
            "fatherName",
            "NIC",
            "salary",
            "overTimePerHour",
            "workingDaysPerWeek",
          ],
        },
      ],
    });
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error("getAttendanceById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateAttendance = async (req, res) => {
  const transaction = await Attendance.sequelize.transaction();

  try {
    /* =========================================================
       1) Load the attendance + staff
       ========================================================= */
    const record = await Attendance.findByPk(req.params.id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const staff = await Staff.findByPk(record.staffId, { transaction });
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({ message: "Staff not found" });
    }

    /* =========================================================
       2) Build the updates object
       ========================================================= */
    const updates = { ...req.body };

    // Normalize receipt — accepts numbers OR { amount, note } objects
    if ("receipt" in updates) {
      const raw = updates.receipt;

      if (Array.isArray(raw)) {
        updates.receipt = raw
          .map((entry) => {
            if (typeof entry === "number" || typeof entry === "string") {
              const n = Number(entry);
              return { amount: Number.isFinite(n) ? n : 0, note: null };
            }
            if (entry && typeof entry === "object") {
              const n = Number(entry.amount ?? entry.value ?? 0);
              return {
                amount: Number.isFinite(n) ? n : 0,
                note: entry.note ?? entry.description ?? null,
              };
            }
            return { amount: 0, note: null };
          })
          .filter((e) => e.amount > 0);
      } else {
        updates.receipt = [];
      }
    }

    // Recompute pay when attendance JSON is sent and no manual salary override
    if (updates.attendance && updates.salary === undefined) {
      const { salary, overtime, tax, total } = calculatePay(staff, updates.attendance);
      updates.salary = salary;
      updates.overtime = overtime;
      updates.tax = tax;
      updates.total = total;
      updates.calculated = true;
    }

    /* =========================================================
       3) Persist the attendance row
       ========================================================= */
    await record.update(updates, { transaction });
    await record.reload({ transaction });

    /* =========================================================
       4) SYNC PaidSalary FROM THE UPDATED RECEIPT
       ========================================================= */
    if ("receipt" in updates) {
      const receiptArr = Array.isArray(record.receipt) ? record.receipt : [];

      await PaidSalary.destroy({
        where: { attendanceId: record.id },
        transaction,
      });

      if (receiptArr.length > 0) {
        await PaidSalary.bulkCreate(
          receiptArr.map((entry, idx) => {
            const amount =
              typeof entry === "object"
                ? Number(entry.amount) || 0
                : Number(entry) || 0;
            const note =
              typeof entry === "object" && entry.note
                ? entry.note
                : `پرداخت #${idx + 1}`;

            return {
              attendanceId: record.id,
              amount,
              note,
            };
          }),
          { transaction }
        );
      }
    }

    /* =========================================================
       5) RECOMPUTE the parent SalaryList.paid + .total
       ========================================================= */
    const siblings = await Attendance.findAll({
      where: { list: record.list },
      attributes: ["id", "total"],
      transaction,
    });

    const siblingIds = siblings.map((s) => s.id);

    let totalPaid = 0;
    if (siblingIds.length > 0) {
      const paidRows = await PaidSalary.findAll({
        where: { attendanceId: { [Op.in]: siblingIds } },
        attributes: ["amount"],
        transaction,
      });
      totalPaid = paidRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    }

    const totalEarned = siblings.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    /* =========================================================
       6) UPDATE the parent SalaryList
       ========================================================= */
    await SalaryList.update(
      {
        paid: Number(totalPaid.toFixed(2)),
        total: Number(totalEarned.toFixed(2)),
      },
      {
        where: { id: record.list },
        transaction,
      }
    );

    const salaryList = await SalaryList.findByPk(record.list, { transaction });

    await transaction.commit();

    /* =========================================================
       7) Fetch fresh payments for the response
       ========================================================= */
    const payments = await PaidSalary.findAll({
      where: { attendanceId: record.id },
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      message: "Updated successfully",
      record,
      payments,
      salaryList,
      listPaid: Number(totalPaid.toFixed(2)),
      listTotal: Number(totalEarned.toFixed(2)),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("updateAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   DELETE
   --------------------------------------------------------- */
export const deleteAttendance = async (req, res) => {
  const transaction = await Attendance.sequelize.transaction();

  try {
    const record = await Attendance.findByPk(req.params.id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const listId = record.list;

    // 1) Delete the attendance row
    await record.destroy({ transaction });

    // 2) Fetch remaining siblings for this list
    const siblings = await Attendance.findAll({
      where: { list: listId },
      attributes: ["id", "staffId", "total"],
      transaction,
    });

    const siblingIds = siblings.map((s) => s.id);

    // 3) totalPaid from PaidSalary (source of truth)
    let totalPaid = 0;
    if (siblingIds.length > 0) {
      const paidRows = await PaidSalary.findAll({
        where: { attendanceId: { [Op.in]: siblingIds } },
        attributes: ["amount"],
        transaction,
      });
      totalPaid = paidRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    }

    // 4) totalEarned from remaining siblings
    const totalEarned = siblings.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    // 5) staffIds = unique ids of remaining siblings
    const staffIds = Array.from(
      new Set(siblings.map((s) => Number(s.staffId)))
    );

    // 6) Update the parent SalaryList
    await SalaryList.update(
      {
        staffIds,
        paid: Number(totalPaid.toFixed(2)),
        total: Number(totalEarned.toFixed(2)),
      },
      { where: { id: listId }, transaction }
    );

    const salaryList = await SalaryList.findByPk(listId, { transaction });

    await transaction.commit();

    return res.status(200).json({
      message: "Deleted successfully",
      deletedId: Number(req.params.id),
      salaryList,
      listPaid: Number(totalPaid.toFixed(2)),
      listTotal: Number(totalEarned.toFixed(2)),
      staffIds,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   CREATE
   --------------------------------------------------------- */
export const createAttendance = async (req, res) => {
  const transaction = await Attendance.sequelize.transaction();

  try {
    const { list, staffId } = req.body;

    if (!list || !staffId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "list and staffId are required" });
    }

    const salaryList = await SalaryList.findByPk(list, { transaction });
    if (!salaryList) {
      await transaction.rollback();
      return res.status(404).json({ error: "Salary list not found" });
    }

    const staff = await Staff.findByPk(staffId, { transaction });
    if (!staff) {
      await transaction.rollback();
      return res.status(404).json({ error: "Staff not found" });
    }

    const existing = await Attendance.findOne({
      where: { list, staffId },
      transaction,
    });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({
        error: "This staff member is already in the list",
        record: existing,
      });
    }

    /* ---------------- Normalize receipt ---------------- */
    let receipt = [];
    if (Array.isArray(req.body.receipt)) {
      receipt = req.body.receipt
        .map((entry) => {
          if (typeof entry === "number" || typeof entry === "string") {
            const n = Number(entry);
            return { amount: Number.isFinite(n) ? n : 0, note: null };
          }
          if (entry && typeof entry === "object") {
            const n = Number(entry.amount ?? entry.value ?? 0);
            return {
              amount: Number.isFinite(n) ? n : 0,
              note: entry.note ?? entry.description ?? null,
            };
          }
          return { amount: 0, note: null };
        })
        .filter((e) => e.amount > 0);
    }

    /* ---------------- Attendance JSON ---------------- */
    const attendance =
      req.body.attendance && typeof req.body.attendance === "object"
        ? req.body.attendance
        : defaultAttendanceJSON();

    /* ---------------- Salary / overtime / tax / total ----------------
       Priority: explicit request value → calculated from attendance → 0
       ---------------------------------------------------------------- */
    const calculated = calculatePay(staff, attendance);

    const salary = Number(
      req.body.salary !== undefined ? req.body.salary : calculated.salary
    );
    const overtime = Number(
      req.body.overtime !== undefined ? req.body.overtime : calculated.overtime
    );
    const tax = Number(
      req.body.tax !== undefined ? req.body.tax : calculated.tax
    );
    const total = Number(
      req.body.total !== undefined
        ? req.body.total
        : salary + overtime - tax
    );

    /* ---------------- Create the row ---------------- */
    const record = await Attendance.create(
      {
        list,
        staffId,
        attendance,
        salary,
        overtime,
        tax,
        total,
        receipt,
        calculated: true,
      },
      { transaction }
    );

    /* ---------------- Sync PaidSalary from receipt ---------------- */
    if (receipt.length > 0) {
      await PaidSalary.bulkCreate(
        receipt.map((entry, idx) => ({
          attendanceId: record.id,
          amount: entry.amount,
          note: entry.note || `Payment #${idx + 1}`,
        })),
        { transaction }
      );
    }

    /* ---------------- Recompute SalaryList aggregates ---------------- */
    const siblings = await Attendance.findAll({
      where: { list },
      attributes: ["id", "staffId", "total"],
      transaction,
    });

    const siblingIds = siblings.map((s) => s.id);

    let totalPaid = 0;
    if (siblingIds.length > 0) {
      const paidRows = await PaidSalary.findAll({
        where: { attendanceId: { [Op.in]: siblingIds } },
        attributes: ["amount"],
        transaction,
      });
      totalPaid = paidRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    }

    const totalEarned = siblings.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    const staffIds = Array.from(
      new Set(siblings.map((s) => Number(s.staffId)))
    );

    await SalaryList.update(
      {
        staffIds,
        paid: Number(totalPaid.toFixed(2)),
        total: Number(totalEarned.toFixed(2)),
      },
      { where: { id: list }, transaction }
    );

    await transaction.commit();

    /* ---------------- Fetch fresh data for the response ---------------- */
    const freshRecord = await Attendance.findByPk(record.id, {
      include: [
        {
          model: Staff,
          as: "attendanceStaff",
          attributes: [
            "id",
            "name",
            "fatherName",
            "NIC",
            "salary",
            "overTimePerHour",
            "workingDaysPerWeek",
          ],
        },
      ],
    });

    const refreshedList = await SalaryList.findByPk(list);

    return res.status(201).json({
      message: "Attendance created successfully",
      record: freshRecord,
      salaryList: refreshedList,
      listPaid: Number(totalPaid.toFixed(2)),
      listTotal: Number(totalEarned.toFixed(2)),
      staffIds,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("createAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};