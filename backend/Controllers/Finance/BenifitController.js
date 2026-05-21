import {Benefit,Department} from "../../Models/index.js";

// Create a new benefit
export const createBenefit = async (req, res) => {
  try {
    const { amount, sellId, departmentId } = req.body;
    const benefit = await Benefit.create({ amount, sellId, departmentId });
    res.status(201).json(benefit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create benefit", error: error.message });
  }
};

export const getAllBenefits = async (req, res) => {
  try {
    // Get pagination parameters from query string (defaults: page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: benefits } = await Benefit.findAndCountAll({
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
      offset,
      limit,
      order: [["createdAt", "DESC"]], // optional: newest first
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      data: benefits,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch benefits", error: error.message });
  }
};

// Get a single benefit by ID (with department name)
export const getBenefitById = async (req, res) => {
  try {
    const { id } = req.params;
    const benefit = await Benefit.findByPk(id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
    });
    if (!benefit) {
      return res.status(404).json({ message: "Benefit not found" });
    }
    res.status(200).json(benefit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch benefit", error: error.message });
  }
};

// Update a benefit by ID
export const updateBenefit = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, sellId, departmentId } = req.body;
    const benefit = await Benefit.findByPk(id);
    if (!benefit) {
      return res.status(404).json({ message: "Benefit not found" });
    }
    await benefit.update({ amount, sellId, departmentId });
    res.status(200).json(benefit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update benefit", error: error.message });
  }
};

// Delete a benefit by ID
export const deleteBenefit = async (req, res) => {
  try {
    const { id } = req.params;
    const benefit = await Benefit.findByPk(id);
    if (!benefit) {
      return res.status(404).json({ message: "Benefit not found" });
    }
    await benefit.destroy();
    res.status(200).json({ message: "Benefit deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete benefit", error: error.message });
  }
};