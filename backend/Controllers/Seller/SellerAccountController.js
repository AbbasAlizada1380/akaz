import SellerAccount from "../../Models/Seller/SellerAccount.js";
import Seller from "../../Models/Seller/Seller.js"
import sequelize from '../../dbconnection.js';
import Sell from "../../Models/Stock/Sells.js";
import { Op } from "sequelize";
import { StockIncome } from "../../Models/Association.js";


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
        // 1. Find sellers with at least one unpaid item in their account
        const accountsWithUnpaid = await SellerAccount.findAll({
            where: sequelize.where(
                sequelize.fn('JSON_LENGTH', sequelize.col('unpaid')),
                '>',
                0
            ),
            attributes: ['sellerId'],
            raw: true,
        });

        const sellerIds = accountsWithUnpaid.map(a => a.sellerId);

        // If no sellers have unpaid items, return empty response
        if (sellerIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
            });
        }

        // 2. Fetch seller details
        const sellers = await Seller.findAll({
            where: { id: sellerIds },
            attributes: ['id', 'fullname'],
            raw: true,
        });

        // 3. Sum remaining amount per seller from StockIncome
        const results = await StockIncome.findAll({
            attributes: [
                'sellerId',
                [sequelize.fn('SUM', sequelize.col('remaining')), 'totalDue'],
            ],
            where: {
                sellerId: sellerIds,
                remaining: { [Op.gt]: 0 },
            },
            group: ['sellerId'],
            raw: true,
        });

        // Build a map of sellerId -> totalDue (as number)
        const dueMap = new Map();
        results.forEach(r => {
            // Ensure totalDue is a number (Sequelize may return a string for DECIMAL)
            const totalDue = parseFloat(r.totalDue) || 0;
            dueMap.set(r.sellerId, totalDue);
        });

        // 4. Combine seller info with due amount
        const data = sellers.map(s => ({
            seller: {
                id: s.id,
                fullname: s.fullname,
            },
            totalDue: dueMap.get(s.id) || 0,  // use s.id directly (no string conversion)
        }));

        // 5. Calculate grand total
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
            error: error.message 
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