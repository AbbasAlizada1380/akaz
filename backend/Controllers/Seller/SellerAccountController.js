import SellerAccount from "../../Models/Seller/SellerAccount.js";
import Seller from "../../Models/Seller/Seller.js"
import sequelize from '../../dbconnection.js';
import Sell from "../../Models/Stock/Sells.js";
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
        // 1. Find all factors that are not fully paid (remainingAmount > 0)
        const unpaidFactors = await Factor.findAll({
            where: {
                remainingAmount: { [Op.gt]: 0 }
            },
            attributes: ['sellerId', 'remainingAmount'],
            raw: true,
        });

        if (unpaidFactors.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
            });
        }

        // 2. Aggregate total remaining amount per seller
        const sellerDueMap = new Map();
        for (const factor of unpaidFactors) {
            const sellerId = factor.sellerId;
            const amount = parseFloat(factor.remainingAmount) || 0;
            sellerDueMap.set(sellerId, (sellerDueMap.get(sellerId) || 0) + amount);
        }

        const sellerIds = Array.from(sellerDueMap.keys());

        // 3. Fetch seller details (fullname)
        const sellers = await Seller.findAll({
            where: { id: sellerIds },
            attributes: ['id', 'fullname'],
            raw: true,
        });

        // 4. Build response array
        const data = sellers.map(seller => ({
            seller: {
                id: seller.id,
                fullname: seller.fullname,
            },
            totalDue: sellerDueMap.get(seller.id) || 0,
        }));

        // 5. Grand total of all remaining amounts
        const total = data.reduce((sum, item) => sum + item.totalDue, 0);

        res.status(200).json({
            success: true,
            data,
            total,
        });
    } catch (error) {
        console.error('Error in getSellersWithUnpaid:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
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