import Seller from "../Models/Seller/Seller.js";

/* =========================
   CREATE SELLER
========================= */
export const createSeller = async (req, res) => {
  try {
    const { fullname, phoneNumber, address, department, isActive } = req.body;

    if (!fullname) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    const seller = await Seller.create({
      fullname,
      phoneNumber,
      address,
      department,
      isActive: isActive ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Seller created successfully",
      data: seller,
    });
  } catch (error) {
    console.error("Create Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating seller",
    });
  }
};

/* =========================
   GET ALL SELLERS (PAGINATED)
========================= */
export const getAllSellers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Seller.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) {
    console.error("Get Sellers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching sellers",
    });
  }
};

/* =========================
   GET SINGLE SELLER
========================= */
export const getSellerById = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findByPk(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: seller,
    });
  } catch (error) {
    console.error("Get Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching seller",
    });
  }
};

/* =========================
   UPDATE SELLER
========================= */
export const updateSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, phoneNumber, address, department, isActive } = req.body;

    const seller = await Seller.findByPk(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    await seller.update({
      fullname: fullname ?? seller.fullname,
      phoneNumber: phoneNumber ?? seller.phoneNumber,
      address: address ?? seller.address,
      department: department ?? seller.department,
      isActive: isActive ?? seller.isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Seller updated successfully",
      data: seller,
    });
  } catch (error) {
    console.error("Update Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating seller",
    });
  }
};

/* =========================
   DELETE SELLER
========================= */
export const deleteSeller = async (req, res) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findByPk(id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    await seller.destroy();

    return res.status(200).json({
      success: true,
      message: "Seller deleted successfully",
    });
  } catch (error) {
    console.error("Delete Seller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting seller",
    });
  }
};