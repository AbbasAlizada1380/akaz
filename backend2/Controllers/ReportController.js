import { Op } from 'sequelize';
import Pay from '../Models/Finance/Pay.js';          // adjust path as needed
import Receive from '../Models/Finance/Receive.js';
import Return_Pay from '../Models/Finance/Return_Pay.js';


export const getReports = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;

        // Build date filter if dates are provided
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
        } else if (endDate) {
            dateFilter.createdAt = { [Op.lte]: new Date(endDate) };
        }

        // Helper to compute total amount for a model
        const getTotal = async (Model) => {
            const records = await Model.findAll({ where: dateFilter });
            return records.reduce((sum, r) => sum + r.amount, 0);
        };

        let result = {};

        if (!type || type === 'pay') {
            result.pay = await getTotal(Pay);
        }
        if (!type || type === 'receive') {
            result.receive = await getTotal(Receive);
        }
        if (!type || type === 'return') {
            result.return = await getTotal(Return_Pay);
        }

        // If a single type was requested, return only that total as a number
        if (type && ['pay', 'receive', 'return'].includes(type)) {
            return res.status(200).json({ [type]: result[type] });
        }

        // Otherwise return all totals and a combined sum
        const combinedTotal = (result.receive || 0) - (result.pay || 0) - (result.return || 0);

        res.status(200).json({
            ...result,
            combinedTotal,
            from: startDate || 'earliest',
            to: endDate || 'latest',
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};