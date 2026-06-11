import sequelize from "../../dbconnection.js";
import {Bill} from "../../Models/index.js";
import Customer from "../../Models/Customer/Customers.js";
import Sells from "../../Models/Stock/Sells.js";
import StockExist from "../../Models/Stock/StockExist.js";
import { Op } from "sequelize";

/* ===============================
   GET ALL BILLS (with customer, sells items, products)
================================ */
export const getAllBills = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Bill.findAndCountAll({
      distinct: true, // essential: counts distinct bills
      include: [
        {
          model: Customer,
          as: "billCustomer", // Changed from "customer" to "billCustomer"
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "billSells", // Changed from "items" to "billSells" (based on your association)
          include: [
            {
              model: StockExist,
              as: "sellStockExist", // Changed from "product" to "sellStockExist"
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      bills: rows,
      pagination: {
        totalItems: count, // now correctly counts bills, not joined rows
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in getAllBills:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bills", error: error.message });
  }
};

/* ===============================
   GET SINGLE BILL BY ID
================================ */
export const getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByPk(id, {
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "fullname", "phoneNumber", "address"],
        },
        {
          model: Sells,
          as: "items",
          include: [
            {
              model: StockExist,
              as: "product",
              attributes: ["id", "name", "departmentId", "unit_price", "sell_price"],
            },
          ],
        },
      ],
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    // Extract sells (items) into a separate array for clarity
    const sells = bill.items || [];

    res.json({
      success: true,
      bill: {
        ...bill.toJSON(),
        items: undefined, // remove items from bill to avoid duplication (optional)
      },
      sells, // return sells separately
    });
  } catch (error) {
    console.error("Error in getBillById:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ===============================
   GET BILLS BY DATE RANGE
================================ */
export const getBillsByDateRange = async (req, res) => {
  const { from, to, customerId } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: "from and to dates are required" });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
    };
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const bills = await Bill.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Sells,
          as: "items",
          include: [
            {
              model: StockExist,
              as: "product",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["date", "DESC"]],
    });

    const totalBilled = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paidAmount), 0);
    const totalRemaining = totalBilled - totalPaid;

    res.json({
      success: true,
      bills,
      summary: {
        totalBills: bills.length,
        totalAmount: totalBilled,
        totalPaid,
        totalRemaining,
      },
      filters: { from, to, customerId: customerId || null },
    });
  } catch (error) {
    console.error("Error in getBillsByDateRange:", error);
    res.status(500).json({ success: false, message: "Error fetching bills", error: error.message });
  }
};

/* ===============================
   GET BILLS BY CUSTOMER ID
================================ */
export const getBillsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const bills = await Bill.findAll({
      where: { customerId },
      include: [
        {
          model: Sells,
          as: "items",
          include: [
            {
              model: StockExist,
              as: "product",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalSpent = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.paidAmount), 0);

    res.json({
      success: true,
      customer: { id: customer.id, fullname: customer.fullname },
      bills,
      summary: {
        totalBills: bills.length,
        totalSpent,
        totalPaid,
        outstandingBalance: totalSpent - totalPaid,
      },
    });
  } catch (error) {
    console.error("Error in getBillsByCustomer:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};