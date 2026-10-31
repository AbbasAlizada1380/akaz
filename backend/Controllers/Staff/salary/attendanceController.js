// controllers/attendance.controller.js
import {
  SalaryList,
  Attendance,
  Staff,
  PaidSalary,
} from  "../../../Models/index.js";
import { Op } from "sequelize";



/* ---------------------------------------------------------
   Helper: build the default attendance JSON for a new period
   --------------------------------------------------------- */
const defaultAttendanceJSON = () => ({
  Saturday:  { attendance: false, overtime: 0 },
  Sunday:    { attendance: false, overtime: 0 },
  Monday:    { attendance: false, overtime: 0 },
  Tuesday:   { attendance: false, overtime: 0 },
  Wednesday: { attendance: false, overtime: 0 },
  Thursday:  { attendance: false, overtime: 0 },
});

/* ---------------------------------------------------------
   READ ALL attendance records (optionally filtered by list)
   GET /api/attendance?list=1
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
      as: "attendanceStaff",                    // ✅ matches association
      attributes: [
        "id", "name", "fatherName", "NIC",
        "salary", "overTimePerHour", "workingDaysPerWeek",
      ],
    },
  ],
  order: [["id", "ASC"]],
});

    // Return as { attendances: [...] } so the frontend can rely on a key
    return res.status(200).json({ attendances: records });
  } catch (error) {
    console.error("getAllAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   READ ONE
   GET /api/attendance/:id
   --------------------------------------------------------- */
export const getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findByPk(req.params.id, {
      include: [
        { model: Staff, as: "staff" },                 // ✅ REQUIRED
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

    // ✅ Normalize receipt — accepts numbers OR { amount, note } objects
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

    // Recalculate salary/overtime/total if attendance JSON provided
    if (updates.attendance) {
      const { salary, overtime, total } = calculatePay(
        staff,
        updates.attendance
      );
      updates.salary = salary;
      updates.overtime = overtime;
      updates.total = total;
      updates.calculated = true;
    }

    /* =========================================================
       3) Persist the attendance row
       ========================================================= */
    await record.update(updates, { transaction });
    await record.reload({ transaction });

    /* =========================================================
       4) ✅ SYNC PaidSalary FROM THE UPDATED RECEIPT
       
       Rule: 
         - delete all existing PaidSalary rows for this attendance
         - re-create one PaidSalary per receipt entry
       ========================================================= */
    if ("receipt" in updates) {
      const receiptArr = Array.isArray(record.receipt) ? record.receipt : [];

      // Delete old rows
      await PaidSalary.destroy({
        where: { attendanceId: record.id },
        transaction,
      });

      // Re-create one PaidSalary per receipt entry
      if (receiptArr.length > 0) {
        await PaidSalary.bulkCreate(
          receiptArr.map((entry, idx) => {
            // entry is now { amount, note } after normalization
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
       5) ✅ RECOMPUTE the parent SalaryList.paid + .total
       
       - totalEarned = sum of ALL siblings' `total` (what should be paid)
       - totalPaid   = sum of ALL siblings' PaidSalary amounts (what was paid)
       ========================================================= */
    const siblings = await Attendance.findAll({
      where: { list: record.list },
      attributes: ["id", "total"],
      transaction,
    });

    const siblingIds = siblings.map((s) => s.id);

    // Compute totalPaid from PaidSalary (source of truth)
    let totalPaid = 0;
    if (siblingIds.length > 0) {
      const paidRows = await PaidSalary.findAll({
        where: { attendanceId: { [Op.in]: siblingIds } },
        attributes: ["amount"],
        transaction,
      });
      totalPaid = paidRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    }

    // Compute totalEarned from siblings' total
    const totalEarned = siblings.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    /* =========================================================
       6) ✅ UPDATE the parent SalaryList
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

    // Fetch the refreshed list
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
      payments,                    // ✅ PaidSalary rows for this attendance
      salaryList,                  // ✅ refreshed parent list
      listPaid: Number(totalPaid.toFixed(2)),    // ✅ convenience
      listTotal: Number(totalEarned.toFixed(2)), // ✅ convenience
    });
  } catch (error) {
    await transaction.rollback();
    console.error("updateAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   DELETE
   DELETE /api/attendance/:id
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
      attributes: ["staffId", "receipt", "total"],
      transaction,
    });

    // 3) Recompute derived fields
    const staffIds = siblings.map((s) => s.staffId);

    const totalPaid = siblings.reduce((sum, r) => {
      const arr = Array.isArray(r.receipt) ? r.receipt : [];
      return sum + arr.reduce((a, b) => a + (Number(b) || 0), 0);
    }, 0);

    const totalEarned = siblings.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    // 4) Update the parent SalaryList
    await SalaryList.update(
      {
        staffIds,
        paid: totalPaid,
        total: totalEarned,
      },
      { where: { id: listId }, transaction }
    );

    // 5) Return the refreshed list
    const salaryList = await SalaryList.findByPk(listId, { transaction });

    await transaction.commit();

    return res.status(200).json({
      message: "Deleted successfully",
      deletedId: Number(req.params.id),
      salaryList,
      listPaid: totalPaid,
      listTotal: totalEarned,
      staffIds,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("deleteAttendance error:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* ---------------------------------------------------------
   PAY CALCULATION HELPER
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
  const total = salary + overtime;

  return {
    salary: Number(salary.toFixed(2)),
    overtime: Number(overtime.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}