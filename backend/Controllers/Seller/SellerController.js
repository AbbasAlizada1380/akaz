import Seller from "../../Models/Seller/Seller.js";
import StockIncome from "../../Models/Stock/StockIncome.js";
import { Sequelize } from "sequelize";
import sequelize from "../../dbconnection.js";
import { Op } from "sequelize";
import SellerAccount from "../../Models/Seller/SellerAccount.js";

export const getSellersWithUnpaidStockIncome = async (req, res) => {
  try {
    // 1. Find SellerAccount records where unpaid array has at least one item
    const accountsWithUnpaid = await SellerAccount.findAll({
      where: sequelize.where(
        sequelize.fn('JSON_LENGTH', sequelize.col('unpaid')),
        '>',
        0
      ),
      attributes: ['sellerId', 'unpaid'],
      raw: true,
    });

    if (!accountsWithUnpaid.length) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: "No sellers with unpaid stock incomes",
      });
    }

    // Collect all unpaid StockIncome IDs from all accounts
    let allUnpaidIncomeIds = [];
    const sellerUnpaidMap = new Map(); // sellerId -> array of its unpaid income IDs

    for (const account of accountsWithUnpaid) {
      let unpaidIds = account.unpaid;
      if (typeof unpaidIds === 'string') unpaidIds = JSON.parse(unpaidIds);
      if (Array.isArray(unpaidIds) && unpaidIds.length) {
        allUnpaidIncomeIds.push(...unpaidIds);
        sellerUnpaidMap.set(account.sellerId, unpaidIds);
      }
    }

    if (allUnpaidIncomeIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: "Unpaid arrays are empty after parsing",
      });
    }

    // 2. Fetch the relevant StockIncome records (unpaid, with remaind > 0)
    const unpaidIncomes = await StockIncome.findAll({
      where: {
        id: allUnpaidIncomeIds,
        remaind: { [Op.gt]: 0 },
      },
      attributes: ['id', 'sellerId', 'remaind'],
      raw: true,
    });

    if (unpaidIncomes.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: "No unpaid incomes with remaind > 0 found",
      });
    }

    // 3. Sum remaind per seller
    const sellerDueMap = new Map(); // sellerId -> total due
    for (const income of unpaidIncomes) {
      const sellerId = income.sellerId;
      const remaind = parseFloat(income.remaind) || 0;
      sellerDueMap.set(sellerId, (sellerDueMap.get(sellerId) || 0) + remaind);
    }

    // 4. Get seller details for those seller IDs
    const sellerIds = Array.from(sellerDueMap.keys());
    const sellers = await Seller.findAll({
      where: { id: sellerIds },
      attributes: ['id', 'fullname', 'phoneNumber', 'department', 'isActive'],
      raw: true,
    });

    // 5. Build response data
    const responseData = sellers.map(seller => ({
      seller: {
        id: seller.id,
        fullname: seller.fullname,
        phoneNumber: seller.phoneNumber,
        department: seller.department,
        isActive: seller.isActive,
      },
      totalDue: sellerDueMap.get(seller.id) || 0,
    }));

    const total = responseData.reduce((sum, item) => sum + item.totalDue, 0);

    res.status(200).json({
      success: true,
      data: responseData,
      total,
    });
  } catch (error) {
    console.error("Error in getSellersWithUnpaidStockIncome:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
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