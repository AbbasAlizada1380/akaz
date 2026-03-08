import {Pay} from "../../Models/Association.js";
import {Seller} from "../../Models/Association.js";


// ==============================
// Create Pay
// ==============================
export const createPay = async (req, res) => {
  try {
    const { seller, amount, description } = req.body;

    const pay = await Pay.create({
      seller,
      amount,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};


// ==============================
// Get All Pays (Pagination)
// ==============================
export const getAllPays = async (req, res) => {
  try {
    const { page = 1, limit = 20, seller } = req.query;

    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const offset = (pageNumber - 1) * pageLimit;

    const where = {};
    if (seller) where.seller = seller;

    const { rows, count } = await Pay.findAndCountAll({
      where,
      include: [
        {
          model: Seller,
          as: "sellerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
      limit: pageLimit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      page: pageNumber,
      limit: pageLimit,
      totalRecords: count,
      totalPages: Math.ceil(count / pageLimit),
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};


// ==============================
// Get Single Pay
// ==============================
export const getSinglePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "sellerInfo",
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};


// ==============================
// Update Pay
// ==============================
export const updatePay = async (req, res) => {
  try {
    const { id } = req.params;
    const { seller, amount, description } = req.body;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.update({
      seller,
      amount,
      description,
    });

    res.json({
      success: true,
      message: "Payment updated successfully",
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: error.message,
    });
  }
};


// ==============================
// Delete Pay
// ==============================
export const deletePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.destroy();

    res.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message,
    });
  }
};