import { Debt, Staff, NonStaff, Department } from '../../Models/index.js';
import { Op } from 'sequelize';

// Helper to get receiver details (optional)
const getReceiverDetails = async (debt) => {
  if (debt.staffId) {
    const staff = await Staff.findByPk(debt.staffId, { attributes: ['id', 'name'] });
    return { type: 'staff', data: staff, name: staff?.name || 'Unknown Staff' };
  } else if (debt.nonStaffId) {
    const nonStaff = await NonStaff.findByPk(debt.nonStaffId, { attributes: ['id', 'name', 'address'] });
    return { type: 'nonStaff', data: nonStaff, name: nonStaff?.name || 'Unknown Non‑Staff' };
  }
  return { type: null, data: null, name: 'Unknown' };
};

// CREATE a new debt
export const createDebt = async (req, res) => {
  try {
    const { staffId, nonStaffId, purpose, amount, departmentId, description } = req.body;

    // Validate: exactly one receiver type must be provided
    if ((staffId && nonStaffId) || (!staffId && !nonStaffId)) {
      return res.status(400).json({ error: 'Exactly one of staffId or nonStaffId must be provided' });
    }

    // Validate staff exists if staffId given
    if (staffId) {
      const staff = await Staff.findByPk(staffId);
      if (!staff) return res.status(404).json({ error: 'Staff not found' });
    }

    // Validate non‑staff exists if nonStaffId given
    if (nonStaffId) {
      const nonStaff = await NonStaff.findByPk(nonStaffId);
      if (!nonStaff) return res.status(404).json({ error: 'Non‑staff not found' });
    }

    // Validate department
    const department = await Department.findByPk(departmentId);
    if (!department) return res.status(404).json({ error: 'Department not found' });

    // ✅ Set remainingAmount = amount
    const debt = await Debt.create({
      staffId: staffId || null,
      nonStaffId: nonStaffId || null,
      purpose,
      amount,
      remainingAmount: amount,   // <-- new field initialised to full amount
      departmentId,
      isActive: true,
      description: description || null,
    });

    // Fetch created debt with associations for response
    const createdDebt = await Debt.findByPk(debt.id, {
      include: [
        { model: Department, as: 'debtDepartment' },
        { model: Staff, as: 'debtStaff' },
        { model: NonStaff, as: 'debtNonStaff' },
      ],
    });

    const receiver = createdDebt.debtStaff
      ? { type: 'staff', data: createdDebt.debtStaff }
      : createdDebt.debtNonStaff
      ? { type: 'nonStaff', data: createdDebt.debtNonStaff }
      : null;

    res.status(201).json({ success: true, data: { ...createdDebt.toJSON(), receiver } });
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET all debts with filters and pagination
export const getDebts = async (req, res) => {
  try {
    const { departmentId, isActive, startDate, endDate, page = 1, limit = 10 } = req.query;
    const where = {};

    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: debts } = await Debt.findAndCountAll({
      where,
      include: [
        { model: Department, as: 'debtDepartment', attributes: ['id', 'name'] },
        { model: Staff, as: 'debtStaff', attributes: ['id', 'name'] },
        { model: NonStaff, as: 'debtNonStaff', attributes: ['id', 'name', 'address'] },
      ],
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    const formattedDebts = debts.map(debt => ({
      ...debt.toJSON(),
      receiver: debt.debtStaff
        ? { type: 'staff', data: debt.debtStaff }
        : debt.debtNonStaff
        ? { type: 'nonStaff', data: debt.debtNonStaff }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formattedDebts,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET a single debt by ID
export const getDebtById = async (req, res) => {
  try {
    const { id } = req.params;
    const debt = await Debt.findByPk(id, {
      include: [
        { model: Department, as: 'debtDepartment' },
        { model: Staff, as: 'debtStaff' },
        { model: NonStaff, as: 'debtNonStaff' },
      ],
    });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });

    const receiver = debt.debtStaff
      ? { type: 'staff', data: debt.debtStaff }
      : debt.debtNonStaff
      ? { type: 'nonStaff', data: debt.debtNonStaff }
      : null;

    res.status(200).json({ success: true, data: { ...debt.toJSON(), receiver } });
  } catch (error) {
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: error.message });
  }
};

// UPDATE a debt (including amount change → adjust remainingAmount)
export const updateDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose, amount, departmentId, description, isActive, staffId, nonStaffId } = req.body;

    const debt = await Debt.findByPk(id);
    if (!debt) return res.status(404).json({ error: 'Debt not found' });

    // Handle amount change: adjust remainingAmount by the difference
    if (amount !== undefined && amount !== debt.amount) {
      const diff = amount - debt.amount;
      const newRemaining = debt.remainingAmount + diff;
      if (newRemaining < 0) {
        return res.status(400).json({ error: 'Cannot reduce amount below already paid amount' });
      }
      debt.amount = amount;
      debt.remainingAmount = newRemaining;
    }

    // If changing receiver type, validate the new reference
    if (staffId !== undefined || nonStaffId !== undefined) {
      const newStaffId = staffId !== undefined ? staffId : debt.staffId;
      const newNonStaffId = nonStaffId !== undefined ? nonStaffId : debt.nonStaffId;
      if ((newStaffId && newNonStaffId) || (!newStaffId && !newNonStaffId)) {
        return res.status(400).json({ error: 'Exactly one of staffId or nonStaffId must be provided' });
      }
      if (newStaffId) {
        const staff = await Staff.findByPk(newStaffId);
        if (!staff) return res.status(404).json({ error: 'Staff not found' });
      }
      if (newNonStaffId) {
        const nonStaff = await NonStaff.findByPk(newNonStaffId);
        if (!nonStaff) return res.status(404).json({ error: 'Non‑staff not found' });
      }
      debt.staffId = newStaffId;
      debt.nonStaffId = newNonStaffId;
    }

    if (purpose !== undefined) debt.purpose = purpose;
    if (departmentId !== undefined) debt.departmentId = departmentId;
    if (description !== undefined) debt.description = description;
    if (isActive !== undefined) debt.isActive = isActive;

    await debt.save();

    const updatedDebt = await Debt.findByPk(id, {
      include: [
        { model: Staff, as: 'debtStaff' },
        { model: NonStaff, as: 'debtNonStaff' },
      ],
    });
    const receiver = updatedDebt.debtStaff
      ? { type: 'staff', data: updatedDebt.debtStaff }
      : updatedDebt.debtNonStaff
      ? { type: 'nonStaff', data: updatedDebt.debtNonStaff }
      : null;

    res.status(200).json({ success: true, data: { ...updatedDebt.toJSON(), receiver } });
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE a debt
export const deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const debt = await Debt.findByPk(id);
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    await debt.destroy();
    res.status(200).json({ success: true, message: 'Debt deleted successfully' });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: error.message });
  }
};