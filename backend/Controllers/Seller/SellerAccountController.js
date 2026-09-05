import SellerAccount from "../../Models/Seller/SellerAccount.js";
import Seller from "../../Models/Seller/Seller.js"
import sequelize from '../../dbconnection.js';
import Sell from "../../Models/Stock/Sells.js";
import {Department} from "../../Models/index.js";
import { Op } from "sequelize";
import { StockIncome,Factor } from "../../Models/index.js";


// @desc    Create a new seller account
export const createSellerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { sellerId, paid, unpaid, total } = req.body;

        if (!sellerId) {
            await transaction.rollback();
            return res.status(400).json({ message: 'sellerId is required' });
        }

        const seller = await Seller.findByPk(sellerId, { transaction });
        if (!seller) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Seller not found' });
        }

        const accountData = {
            sellerId,
            paid: Array.isArray(paid) ? paid : [],
            unpaid: Array.isArray(unpaid) ? unpaid : [],
            total: Array.isArray(total) ? total : [],
        };

        const newAccount = await SellerAccount.create(accountData, { transaction });
        await transaction.commit();

        res.status(201).json({
            message: 'Seller account created successfully',
            data: newAccount,
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc Get all seller accounts
export const getSellerAccounts = async (req, res) => {
    try {
        const accounts = await SellerAccount.findAll({
            include: [
                {
                    model: Seller,
                    as: 'seller',
                    attributes: ['id', 'fullname', 'phoneNumber', 'address'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc Get single seller account
export const getSellerAccountById = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await SellerAccount.findByPk(id, {
            include: [
                {
                    model: Seller,
                    as: 'seller',
                    attributes: ['id', 'fullname', 'phoneNumber', 'address'],
                },
            ],
        });

        if (!account) {
            return res.status(404).json({ message: 'Seller account not found' });
        }

        res.status(200).json(account);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc Update seller account
export const updateSellerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { sellerId, paid, unpaid, total } = req.body;

        const account = await SellerAccount.findByPk(id, { transaction });
        if (!account) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Seller account not found' });
        }

        if (sellerId && sellerId !== account.sellerId) {
            const seller = await Seller.findByPk(sellerId, { transaction });
            if (!seller) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Seller not found' });
            }
        }

        if (sellerId !== undefined) account.sellerId = sellerId;
        if (paid !== undefined) account.paid = Array.isArray(paid) ? paid : [];
        if (unpaid !== undefined) account.unpaid = Array.isArray(unpaid) ? unpaid : [];
        if (total !== undefined) account.total = Array.isArray(total) ? total : [];

        await account.save({ transaction });
        await transaction.commit();

        res.status(200).json({
            message: 'Seller account updated successfully',
            data: account,
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc Delete seller account
export const deleteSellerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;

        const account = await SellerAccount.findByPk(id, { transaction });
        if (!account) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Seller account not found' });
        }

        await account.destroy({ transaction });
        await transaction.commit();

        res.status(200).json({ message: 'Seller account deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc Get sellers with unpaid
// @desc Get sellers with unpaid

export const getSellersWithUnpaid = async (req, res) => {
  try {
    const { departmentId } = req.query; // optional filter by department (Factor.dep_Number)

    // 1. Build filter for unpaid factors (remainingAmount > 0)
    const whereCondition = {
      remainingAmount: { [Op.gt]: 0 },
    };
    if (departmentId) {
      whereCondition.dep_Number = departmentId; // filter by department
    }

    // 2. Fetch all unpaid factors with seller and department details
    const unpaidFactors = await Factor.findAll({
      where: whereCondition,
      attributes: ['id', 'sellerId', 'remainingAmount', 'dep_Number'],
      include: [
        {
          model: Seller,
          as: 'factorSeller',
          attributes: ['id', 'fullname', 'phoneNumber', 'department', 'isActive'],
        },
        {
          model: Department,
          as: 'factorDepartment', // make sure this association exists in Factor model
          attributes: ['id', 'name', 'holding'],
        }
      ],
      raw: true,
      nest: true,
    });

    if (!unpaidFactors.length) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: "No sellers with unpaid factors",
      });
    }

    // 3. Aggregate remaining amounts per seller and per department
    const sellerTotalMap = new Map(); // sellerId -> total due
    const sellerDepartmentMap = new Map(); // sellerId -> Map(departmentId -> { departmentName, total })
    const departmentTotalMap = new Map(); // departmentId -> total due (overall)

    for (const factor of unpaidFactors) {
      const sellerId = factor.sellerId;
      const remaind = parseFloat(factor.remainingAmount) || 0;
      const depId = factor.dep_Number;
      const departmentName = factor.factorDepartment?.name || 'Unknown Department';
      const departmentHolding = factor.factorDepartment?.holding || '';

      // Update seller total
      sellerTotalMap.set(sellerId, (sellerTotalMap.get(sellerId) || 0) + remaind);

      // Update department total (overall)
      departmentTotalMap.set(depId, (departmentTotalMap.get(depId) || 0) + remaind);

      // Initialize department breakdown for this seller
      if (!sellerDepartmentMap.has(sellerId)) {
        sellerDepartmentMap.set(sellerId, new Map());
      }
      const sellerDeptMap = sellerDepartmentMap.get(sellerId);
      if (!sellerDeptMap.has(depId)) {
        sellerDeptMap.set(depId, {
          departmentId: depId,
          departmentName,
          departmentHolding,
          total: 0,
        });
      }
      sellerDeptMap.get(depId).total += remaind;
    }

    // 4. Build seller info (unique sellers from factors)
    const sellerMap = new Map();
    for (const factor of unpaidFactors) {
      if (!sellerMap.has(factor.sellerId)) {
        sellerMap.set(factor.sellerId, {
          id: factor.sellerId,
          fullname: factor.factorSeller?.fullname || 'Unknown',
          phoneNumber: factor.factorSeller?.phoneNumber || null,
          department: factor.factorSeller?.department || null,
          isActive: factor.factorSeller?.isActive ?? true,
        });
      }
    }

    // 5. Build response data with department breakdown for each seller
    const responseData = Array.from(sellerMap.values()).map(seller => {
      const sellerDeptMap = sellerDepartmentMap.get(seller.id) || new Map();
      const departmentBreakdown = Array.from(sellerDeptMap.values());
      return {
        seller,
        totalDue: sellerTotalMap.get(seller.id) || 0,
        departmentBreakdown: departmentBreakdown.sort((a, b) => b.total - a.total),
        departmentsCount: departmentBreakdown.length,
      };
    });

    // Sort sellers by total due (highest first)
    responseData.sort((a, b) => b.totalDue - a.totalDue);

    // Overall totals
    const totalOverall = responseData.reduce((sum, item) => sum + item.totalDue, 0);

    // Department summary (overall)
    const departmentSummary = Array.from(departmentTotalMap.entries()).map(([depId, total]) => {
      let deptName = 'Unknown';
      let deptHolding = '';
      for (const seller of responseData) {
        const found = seller.departmentBreakdown.find(d => d.departmentId === depId);
        if (found) {
          deptName = found.departmentName;
          deptHolding = found.departmentHolding;
          break;
        }
      }
      return {
        departmentId: depId,
        departmentName: deptName,
        departmentHolding: deptHolding,
        total: total,
        sellerCount: responseData.filter(s => s.departmentBreakdown.some(d => d.departmentId === depId)).length,
      };
    }).sort((a, b) => b.total - a.total);

    res.status(200).json({
      success: true,
      data: responseData,
      summary: {
        totalSellers: responseData.length,
        totalOverall: totalOverall,
        departmentSummary,
      },
      filters: {
        departmentId: departmentId || null,
      },
    });
  } catch (error) {
    console.error("Error in getSellersWithUnpaid:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc Get seller sells from total
export const getSellerSellsFromTotal = async (req, res) => {
    try {
        const { sellerId } = req.params;

        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;

        const offset = (page - 1) * limit;

        const account = await SellerAccount.findOne({
            where: { sellerId },
        });

        if (!account) {
            return res.status(404).json({ message: 'Seller account not found' });
        }

        const sellIds = account.total || [];
        const totalItems = sellIds.length;

        const sells = await StockIncome.findAll({
            where: { id: sellIds },
            order: [['createdAt', 'DESC']],
            offset,
            limit,
        });

        res.status(200).json({
            data: sells,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
            },
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// @desc    Get seller sells within a date range (for PDF report)
// @route   GET /api/sellerAccount/seller/:sellerId/date_range?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getSellerSellsDateRange = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'Both from and to dates are required' });
        }

        // Validate seller existence
        const seller = await Seller.findByPk(sellerId, {
            attributes: ['id', 'fullname', 'phoneNumber', 'address']
        });
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Build date filter
        const dateFilter = {
            [Op.between]: [new Date(from), new Date(to)]
        };

        // Fetch all sells for this seller within the date range
        const sells = await StockIncome.findAll({
            where: {
                sellerId,
                createdAt: dateFilter
            },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // Prepare summary totals
        let totalItems = sells.length;
        let totalMoney = 0;
        let totalReceipt = 0;
        let totalRemaining = 0;

        sells.forEach(sell => {
            totalMoney += parseFloat(sell.money) || 0;
            totalReceipt += parseFloat(sell.receipt) || 0;
            totalRemaining += parseFloat(sell.remaind) || 0;
        });

        // Format items as expected by frontend (keys: remaining, receipt, money, qnty, fileName, createdAt, id)
        const items = sells.map(sell => ({
            id: sell.id,
            remaind: sell.remaind,
            receipt: sell.receipt,
            money: sell.money,
            qnty: sell.qnty,
            fileName: sell.fileName,
            createdAt: sell.createdAt
        }));

        res.status(200).json({
            success: true,
            data: {
                items,
                seller: {
                    id: seller.id,
                    fullname: seller.fullname
                },
                summary: {
                    totalItems,
                    totalMoney,
                    totalReceipt,
                    totalRemaining
                }
            }
        });
    } catch (error) {
        console.error('Error in getSellerSellsDateRange:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get seller sells by type: all (orderId), paid (receiptOrders), unpaid (remainOrders)
// @route   GET /api/sellerAccount/:sellerId/:type
//         type can be "orderId", "receiptOrders", "remainOrders"
export const getSellerSellsByType = async (req, res) => {
    try {
        const { sellerId, type } = req.params;

        // Validate seller existence
        const seller = await Seller.findByPk(sellerId, {
            attributes: ['id', 'fullname']
        });
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found' });
        }

        // Find the seller's account
        const account = await SellerAccount.findOne({
            where: { sellerId }
        });
        if (!account) {
            return res.status(404).json({ message: 'Seller account not found' });
        }

        let sellIds = [];
        switch (type) {
            case 'orderId':       // all sells
                sellIds = account.total || [];
                break;
            case 'receiptOrders': // paid sells
                sellIds = account.paid || [];
                break;
            case 'remainOrders':  // unpaid sells
                sellIds = account.unpaid || [];
                break;
            default:
                return res.status(400).json({ message: 'Invalid type. Use orderId, receiptOrders, or remainOrders' });
        }

        if (!sellIds.length) {
            // Return empty response with zero totals
            return res.status(200).json({
                success: true,
                data: {
                    items: [],
                    sellerName: seller.fullname,
                    totalCount: 0,
                    totalMoney: 0,
                    totalReceipt: 0,
                    totalRemaining: 0
                }
            });
        }

        // Fetch all sells by their IDs (no pagination – needed for PDF)
        const sells = await StockIncome.findAll({
            where: { id: sellIds },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // Calculate totals
        let totalMoney = 0, totalReceipt = 0, totalRemaining = 0;
        sells.forEach(sell => {
            totalMoney += parseFloat(sell.money) || 0;
            totalReceipt += parseFloat(sell.receipt) || 0;
            totalRemaining += parseFloat(sell.remaind) || 0;
        });

        // Format items for frontend
        const items = sells.map(sell => ({
            id: sell.id,
            remaind: sell.remaind,
            receipt: sell.receipt,
            money: sell.money,
            qnty: sell.qnty,
            name: sell.name,
            createdAt: sell.createdAt
        }));

        res.status(200).json({
            success: true,
            data: {
                items,
                sellerName: seller.fullname,
                totalCount: sells.length,
                totalMoney,
                totalReceipt,
                totalRemaining
            }
        });
    } catch (error) {
        console.error('Error in getSellerSellsByType:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};