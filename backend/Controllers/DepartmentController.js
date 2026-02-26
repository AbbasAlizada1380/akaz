import Department from "../Models/Department.js";

// ✅ Create Department
export const createDepartment = async (req, res) => {
  try {
    const { name, isActive, holding } = req.body;

    // Validate holding (should be an object)
    if (holding && typeof holding !== "object") {
      return res.status(400).json({
        message: "Holding must be an object, e.g., { user1: 20, user2: 80 }",
      });
    }

    const department = await Department.create({
      name,
      isActive,
      holding: holding || {}, // default empty object
    });

    res.status(201).json({
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating department",
      error: error.message,
    });
  }
};

// ✅ Get All Departments
export const getAllDepartments = async (req, res) => {
  try {
    const { active } = req.query;

    const whereClause = {};
    if (active !== undefined) {
      whereClause.isActive = active === "true";
    }

    const departments = await Department.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      message: "Departments fetched successfully",
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

// ✅ Get Single Department
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({
      message: "Department fetched successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching department",
      error: error.message,
    });
  }
};

// ✅ Update Department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, holding } = req.body;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    // Validate holding
    if (holding && typeof holding !== "object") {
      return res.status(400).json({
        message: "Holding must be an object, e.g., { user1: 20, user2: 80 }",
      });
    }

    await department.update({
      name: name !== undefined ? name : department.name,
      isActive: isActive !== undefined ? isActive : department.isActive,
      holding: holding !== undefined ? holding : department.holding,
    });

    res.json({
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating department",
      error: error.message,
    });
  }
};

// ✅ Delete Department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    await department.destroy();

    res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting department",
      error: error.message,
    });
  }
};