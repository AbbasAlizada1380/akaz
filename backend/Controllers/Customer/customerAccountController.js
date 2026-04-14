import CustomerAccount from "../../Models/Customer/CustomerAccount.js"
import Customer from '../../Models/Customer/Customers.js';
import sequelize from '../../dbconnection.js';
import Sell from "../../Models/Stock/Sells.js";
import { Op } from "sequelize";
import { StockIncome } from "../../Models/Association.js";


// @desc    Create a new customer account
// @route   POST /api/customer-account
// @access  Private
export const createCustomerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { customerId, paid, unpaid, total } = req.body;

        // Validate required fields
        if (!customerId) {
            await transaction.rollback();
            return res.status(400).json({ message: 'customerId is required' });
        }

        // Check if the referenced customer exists
        const customer = await Customer.findByPk(customerId, { transaction });
        if (!customer) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Prepare data (use provided arrays or default to [])
        const accountData = {
            customerId,
            paid: Array.isArray(paid) ? paid : [],
            unpaid: Array.isArray(unpaid) ? unpaid : [],
            total: Array.isArray(total) ? total : [],
        };

        const newAccount = await CustomerAccount.create(accountData, { transaction });
        await transaction.commit();

        res.status(201).json({
            message: 'Customer account created successfully',
            data: newAccount,
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Create CustomerAccount Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all customer accounts
// @route   GET /api/customer-account
// @access  Private
export const getCustomerAccounts = async (req, res) => {
    try {
        const accounts = await CustomerAccount.findAll({
            include: [
                {
                    model: Customer,
                    as: 'customer', // ensure this alias matches the association
                    attributes: ['id', 'fullname', 'phoneNumber', 'address'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(accounts);
    } catch (error) {
        console.error('Get CustomerAccounts Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get a single customer account by ID
// @route   GET /api/customer-account/:id
// @access  Private
export const getCustomerAccountById = async (req, res) => {
    try {
        const { id } = req.params;
        const account = await CustomerAccount.findByPk(id, {
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'fullname', 'phoneNumber', 'address'],
                },
            ],
        });

        if (!account) {
            return res.status(404).json({ message: 'Customer account not found' });
        }

        res.status(200).json(account);
    } catch (error) {
        console.error('Get CustomerAccount By ID Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update a customer account
// @route   PUT /api/customer-account/:id
// @access  Private
export const updateCustomerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { customerId, paid, unpaid, total } = req.body;

        const account = await CustomerAccount.findByPk(id, { transaction });
        if (!account) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Customer account not found' });
        }

        // If customerId is being updated, verify the new customer exists
        if (customerId && customerId !== account.customerId) {
            const customer = await Customer.findByPk(customerId, { transaction });
            if (!customer) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Customer not found' });
            }
        }

        // Update fields (only if provided)
        if (customerId !== undefined) account.customerId = customerId;
        if (paid !== undefined) account.paid = Array.isArray(paid) ? paid : [];
        if (unpaid !== undefined) account.unpaid = Array.isArray(unpaid) ? unpaid : [];
        if (total !== undefined) account.total = Array.isArray(total) ? total : [];

        await account.save({ transaction });
        await transaction.commit();

        res.status(200).json({
            message: 'Customer account updated successfully',
            data: account,
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Update CustomerAccount Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a customer account
// @route   DELETE /api/customer-account/:id
// @access  Private
export const deleteCustomerAccount = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const account = await CustomerAccount.findByPk(id, { transaction });

        if (!account) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Customer account not found' });
        }

        await account.destroy({ transaction });
        await transaction.commit();

        res.status(200).json({ message: 'Customer account deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Delete CustomerAccount Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


export const getCustomersWithUnpaid = async (req, res) => {
    try {
        // 1. Find CustomerAccount records where unpaid array length > 0
        const accountsWithUnpaid = await CustomerAccount.findAll({
            where: sequelize.where(
                sequelize.fn('JSON_LENGTH', sequelize.col('unpaid')),
                '>',
                0
            ),
            attributes: ['customerId'],
            raw: true,
        });

        if (!accountsWithUnpaid.length) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                message: "No customers with unpaid entries",
            });
        }

        // Extract customer IDs
        const customerIds = accountsWithUnpaid.map((a) => a.customerId);

        // 2. Fetch customer details
        const customers = await Customer.findAll({
            where: { id: customerIds },
            attributes: ['id', 'fullname'],
            raw: true,
        });

        // 3. Sum remained amount per customer
        const results = await Sell.findAll({
            attributes: [
                'customer',
                [sequelize.fn('SUM', sequelize.col('remained')), 'totalDue'],
            ],
            where: {
                customer: customerIds.map(id => String(id)),
                remained: { [Op.gt]: 0 },
            },
            group: ['customer'],
            raw: true,
        });

        // Map customerId -> totalDue
        const dueMap = new Map();
        results.forEach((r) => dueMap.set(r.customer, parseFloat(r.totalDue) || 0));

        // Combine customer info with total due
        const responseData = customers.map((cust) => ({
            customer: cust,
            totalDue: dueMap.get(String(cust.id)) || 0,
        }));

        // ✅ Calculate total due of all customers
        const total = responseData.reduce((sum, item) => sum + item.totalDue, 0);

        return res.status(200).json({
            success: true,
            data: responseData,
            total: total,   // 👈 added total property
        });

    } catch (error) {
        console.error('Error fetching customers with unpaid sells:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

export const getCustomerSellsFromTotal = async (req, res) => {
    try {
        const { customerId } = req.params;
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        const account = await CustomerAccount.findOne({
            where: { customerId },
        });

        if (!account) {
            return res.status(404).json({ message: 'Customer account not found' });
        }

        const sellIds = account.total || [];
        const totalItems = sellIds.length;

        if (totalItems === 0) {
            return res.status(200).json({
                data: [],
                pagination: { page, limit, totalItems: 0, totalPages: 0 },
            });
        }

        // ✅ Fixed: use alias 'stock'
        const sells = await Sell.findAll({
            where: { id: sellIds },
            include: [
                {
                    model: StockIncome,
                    as: 'stock',
                    attributes: ['name'],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit,
        });

        const sellsWithName = sells.map(sell => {
            const sellData = sell.toJSON();
            sellData.name = sellData.stock ? sellData.stock.name : null;
            delete sellData.stock;
            return sellData;
        });

        const totalPages = Math.ceil(totalItems / limit);
        res.status(200).json({
            data: sellsWithName,
            pagination: { page, limit, totalItems, totalPages },
        });
    } catch (error) {
        console.error('Error fetching customer sells from total:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper to format a sell record for frontend
const formatSellForFrontend = (sell) => {
    const sellData = sell.toJSON();
    return {
        id: sellData.id,
        fileName: sellData.stock?.name || null,       // product name from StockIncome
        size: null,                                    // not available in current schema
        qnty: sellData.amount,
        price: parseFloat(sellData.unitPrice) || 0,
        money: parseFloat(sellData.total) || 0,
        receipt: parseFloat(sellData.received) || 0,
        remaining: parseFloat(sellData.remained) || 0,
        createdAt: sellData.createdAt,
        name: sellData.stock?.name || null,            // for consistency
    };
};

// @desc    Get customer order items by type (all, paid, unpaid)
// @route   GET /api/orderItems/:customerId/:type
// @access  Private
export const getCustomerOrderItemsByType = async (req, res) => {
    try {
        const { customerId, type } = req.params;

        // Validate type
        const validTypes = ['orderId', 'receiptOrders', 'remainOrders'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid type. Use orderId, receiptOrders, or remainOrders' });
        }

        // Find customer account
        const account = await CustomerAccount.findOne({
            where: { customerId },
        });
        if (!account) {
            return res.status(404).json({ message: 'Customer account not found' });
        }

        let sellIds = [];
        // Determine which array to use based on type
        if (type === 'orderId') {
            sellIds = account.total || [];
        } else if (type === 'receiptOrders') {
            sellIds = account.paid || [];
        } else if (type === 'remainOrders') {
            sellIds = account.unpaid || [];
        }

        if (sellIds.length === 0) {
            return res.status(200).json({
                items: [],
                totalCount: 0,
                totalMoney: 0,
                totalReceipt: 0,
                totalRemaining: 0,
                customerName: null,
            });
        }

        // Fetch sells with associated StockIncome (for product name)
        const sells = await Sell.findAll({
            where: { id: sellIds },
            include: [
                {
                    model: StockIncome,
                    as: 'stock',
                    attributes: ['name'],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        // Format items
        const items = sells.map(formatSellForFrontend);

        // Calculate totals
        const totalCount = items.length;
        const totalMoney = items.reduce((sum, item) => sum + item.money, 0);
        const totalReceipt = items.reduce((sum, item) => sum + item.receipt, 0);
        const totalRemaining = items.reduce((sum, item) => sum + item.remaining, 0);

        // Get customer name
        const customer = await Customer.findByPk(customerId, { attributes: ['fullname'] });
        const customerName = customer ? customer.fullname : null;

        res.status(200).json({
            items,
            totalCount,
            totalMoney,
            totalReceipt,
            totalRemaining,
            customerName,
        });
    } catch (error) {
        console.error('Error in getCustomerOrderItemsByType:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get customer order items within a date range
// @route   GET /api/orderItems/customer/:customerId/date_range
// @query   from (YYYY-MM-DD), to (YYYY-MM-DD)
// @access  Private
export const getCustomerOrderItemsByDateRange = async (req, res) => {
    try {
        const { customerId } = req.params;
        let { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'Both "from" and "to" dates are required' });
        }

        // Parse dates (assume UTC or local; Sequelize will handle)
        const startDate = new Date(from);
        const endDate = new Date(to);
        if (isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        // Set endDate to end of day
        endDate.setHours(23, 59, 59, 999);

        // Find all sells for this customer within date range
        const sells = await Sell.findAll({
            where: {
                customer: customerId,
                createdAt: {
                    [Op.between]: [startDate, endDate],
                },
            },
            include: [
                {
                    model: StockIncome,
                    as: 'stock',
                    attributes: ['name'],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        const items = sells.map(formatSellForFrontend);

        // Summary
        const totalItems = items.length;
        const totalMoney = items.reduce((sum, item) => sum + item.money, 0);
        const totalReceipt = items.reduce((sum, item) => sum + item.receipt, 0);
        const totalRemaining = items.reduce((sum, item) => sum + item.remaining, 0);

        // Get customer details
        const customer = await Customer.findByPk(customerId, {
            attributes: ['id', 'fullname', 'phoneNumber', 'address'],
        });

        res.status(200).json({
            success: true,
            data: {
                customer,
                items,
                summary: {
                    totalItems,
                    totalMoney,
                    totalReceipt,
                    totalRemaining,
                },
            },
        });
    } catch (error) {
        console.error('Error in getCustomerOrderItemsByDateRange:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};