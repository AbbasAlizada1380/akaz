import Member from "../Models/Member.js";

// ✅ Create Member
export const createMember = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const member = await Member.create({
      name,
      description,
      isActive,
    });

    res.status(201).json({
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating member",
      error: error.message,
    });
  }
};

// ✅ Get All Members (Optional ?active=true)
export const getAllMembers = async (req, res) => {
  try {
    const { active } = req.query;

    const whereClause = {};

    if (active !== undefined) {
      whereClause.isActive = active === "true";
    }

    const members = await Member.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      message: "Members fetched successfully",
      count: members.length,
      data: members,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching members",
      error: error.message,
    });
  }
};

// ✅ Get Member By ID
export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.json({
      message: "Member fetched successfully",
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching member",
      error: error.message,
    });
  }
};

// ✅ Update Member
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    await member.update({
      name,
      description,
      isActive,
    });

    res.json({
      message: "Member updated successfully",
      data: member,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating member",
      error: error.message,
    });
  }
};

// ✅ Delete Member
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    await member.destroy();

    res.json({
      message: "Member deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting member",
      error: error.message,
    });
  }
};