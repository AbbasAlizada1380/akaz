import CustomerAccount from "../../Models/Customer/CustomerAccount.js"
import Customer from '../../Models/Customer/Customers.js';
import sequelize from '../../dbconnection.js';
import Sell from "../../Models/Stock/Sells.js";
import { Op } from "sequelize";


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
                    attributes: ['id', 'fullname', 'phoneNumberNumberNumber', 'address'],
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
                    attributes: ['id', 'fullname', 'phoneNumberNumberNumber', 'address'],
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

        // 3. Sum the remained amount for each customer from the Sell table
        const results = await Sell.findAll({
            attributes: [
                'customer',
                [sequelize.fn('SUM', sequelize.col('remained')), 'totalDue'],
            ],
            where: {
                customer: customerIds.map(id => String(id)), // customer is STRING in Sell model
                remained: { [Op.gt]: 0 },
            },
            group: ['customer'],
            raw: true,
        });

        // Map customerId -> totalDue
        const dueMap = new Map();
        results.forEach((r) => dueMap.set(r.customer, parseFloat(r.totalDue) || 0));

        // Combine customer info with total due only
        const responseData = customers.map((cust) => ({
            customer: cust,
            totalDue: dueMap.get(String(cust.id)) || 0, // ensure key as string
        }));

        return res.status(200).json({
            success: true,
            data: responseData,
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