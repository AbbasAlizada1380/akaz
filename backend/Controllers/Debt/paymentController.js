import { Payment, Debt, Staff, NonStaff, Department } from "../../Models/index.js";
import { Op } from "sequelize";

// Create a new payment for a debt
export const createPayment = async (req, res) => {
  try {
    const { debtId, amount, description, paymentDate } = req.body;
    if (!debtId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Debt ID and positive amount are required" });
    }

    // Fetch debt including remainingAmount and departmentId
    const debt = await Debt.findByPk(debtId);
    if (!debt) return res.status(404).json({ error: "Debt not found" });

    // Prevent overpayment
    if (amount > debt.remainingAmount) {
      return res.status(400).json({ error: `Payment amount (${amount}) exceeds remaining debt (${debt.remainingAmount})` });
    }

    // Create payment record – include departmentId from the debt
    const payment = await Payment.create({
      debtId,
      amount,
      description: description || null,
      paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
      departmentId: debt.departmentId,   // denormalize department
    });

    // Deduct amount from remaining debt
    const newRemaining = debt.remainingAmount - amount;
    await debt.update({
      remainingAmount: newRemaining,
      isActive: newRemaining > 0,
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { debtId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (debtId) where.debtId = parseInt(debtId);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Debt,
          as: "paymentDebt",
          include: [
            { model: Staff, as: "debtStaff", attributes: ["id", "name"] },
            { model: NonStaff, as: "debtNonStaff", attributes: ["id", "name"] },
          ],
        },
        { model: Department, as: "paymentDepartment", attributes: ["id", "name"] },
      ],
      offset,
      limit: parseInt(limit),
      order: [["paymentDate", "DESC"]],
    });
    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, { include: [{ model: Debt, as: "paymentDebt" }] });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update a payment (amount, description, paymentDate)
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, paymentDate } = req.body;
    const payment = await Payment.findByPk(id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    // Optionally, if amount changes, we must re‑evaluate the debt's remaining amount
    let oldAmount = payment.amount;
    if (amount !== undefined && amount !== oldAmount) {
      const debt = await Debt.findByPk(payment.debtId);
      if (!debt) return res.status(404).json({ error: "Associated debt not found" });
      const amountDifference = amount - oldAmount;
      // Check overpayment
      if (debt.remainingAmount - amountDifference < 0) {
        return res.status(400).json({ error: "Updated amount would cause overpayment" });
      }
      // Update debt remainingAmount
      await debt.update({
        remainingAmount: debt.remainingAmount - amountDifference,
        isActive: (debt.remainingAmount - amountDifference) > 0,
      });
    }

    if (amount !== undefined) payment.amount = amount;
    if (description !== undefined) payment.description = description;
    if (paymentDate !== undefined) payment.paymentDate = paymentDate;
    await payment.save();

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    const debtId = payment.debtId;
    const amount = payment.amount;

    await payment.destroy();

    // Add back the amount to the debt's remaining amount
    const debt = await Debt.findByPk(debtId);
    if (debt) {
      const newRemaining = debt.remainingAmount + amount;
      await debt.update({
        remainingAmount: newRemaining,
        isActive: newRemaining > 0,
      });
    }

    res.status(200).json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all payments for a specific debt (no pagination, full list)
export const getPaymentsByDebtId = async (req, res) => {
  try {
    const { debtId } = req.params;
    if (!debtId) {
      return res.status(400).json({ error: "debtId is required" });
    }

    const payments = await Payment.findAll({
      where: { debtId: parseInt(debtId) },
      order: [["paymentDate", "DESC"]],
      include: [{ model: Debt, as: "paymentDebt", attributes: ["id", "purpose", "amount", "remainingAmount", "departmentId"] }],
    });

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments by debtId:", error);
    res.status(500).json({ error: error.message });
  }
};  
// Get payments within an optional date range and optional department filter
export const getPaymentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, departmentId, page = 1, limit = 20 } = req.query;

    const where = {};

    if (startDate && endDate) {
      where.paymentDate = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate || endDate) {
      return res.status(400).json({
        error: "Both startDate and endDate are required for date range filtering, or omit both to get all payments",
      });
    }

    if (departmentId) {
      where.departmentId = parseInt(departmentId);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Debt,
          as: "paymentDebt",
          attributes: ["id", "purpose", "amount", "remainingAmount", "staffId", "nonStaffId"],
          include: [
            {
              model: Staff,
              as: "debtStaff",
              attributes: ["id", "name"],
            },
            {
              model: NonStaff,
              as: "debtNonStaff",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Department,
          as: "paymentDepartment",
          attributes: ["id", "name"],
        },
      ],
      offset,
      limit: parseInt(limit),
      order: [["paymentDate", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        ...(startDate && endDate && { startDate, endDate }),
        ...(departmentId && { departmentId: parseInt(departmentId) }),
      },
    });
  } catch (error) {
    console.error("Error fetching payments by date range:", error);
    res.status(500).json({ error: error.message });
  }
};