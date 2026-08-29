import { NonStaff, Debt } from "../../Models/index.js";
import { Op } from "sequelize";

// Create a new non‑staff debtor
export const createNonStaff = async (req, res) => {
  try {
    const { name, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const nonStaff = await NonStaff.create({ name, address, notes });
    res.status(201).json({ success: true, data: nonStaff });
  } catch (error) {
    console.error("Error creating non‑staff:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all non‑staff debtors (with optional search)
export const getNonStaffs = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await NonStaff.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [["name", "ASC"]],
    });
    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching non‑staffs:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single non‑staff debtor by ID
export const getNonStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const nonStaff = await NonStaff.findByPk(id);
    if (!nonStaff) return res.status(404).json({ error: "Non‑staff debtor not found" });
    res.status(200).json({ success: true, data: nonStaff });
  } catch (error) {
    console.error("Error fetching non‑staff:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update a non‑staff debtor
export const updateNonStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, notes } = req.body;
    const nonStaff = await NonStaff.findByPk(id);
    if (!nonStaff) return res.status(404).json({ error: "Non‑staff debtor not found" });

    if (name !== undefined) nonStaff.name = name;
    if (address !== undefined) nonStaff.address = address;
    if (notes !== undefined) nonStaff.notes = notes;
    await nonStaff.save();

    res.status(200).json({ success: true, data: nonStaff });
  } catch (error) {
    console.error("Error updating non‑staff:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a non‑staff debtor (only if no debts reference it)
export const deleteNonStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const nonStaff = await NonStaff.findByPk(id);
    if (!nonStaff) return res.status(404).json({ error: "Non‑staff debtor not found" });

    // Check if any debts reference this non‑staff
    const debts = await Debt.count({ where: { nonStaffId: id } });
    if (debts > 0) {
      return res.status(400).json({ error: "Cannot delete: this debtor has associated debts" });
    }

    await nonStaff.destroy();
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting non‑staff:", error);
    res.status(500).json({ error: error.message });
  }
};