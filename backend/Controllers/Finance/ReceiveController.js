import { Receive } from '../../Models/Association.js';
import { Customer } from '../../Models/Association.js';
import Sell from '../../Models/Stock/Sells.js';
import CustomerAccount from '../../Models/Customer/CustomerAccount.js';
import sequelize from '../../dbconnection.js';
import { Op } from 'sequelize';

export const getAllReceives = async (req, res) => {
    try {
        const receives = await Receive.findAll({
            include: [
                {
                    model: Customer,
                    as: 'customerInfo',   // تغییر به customerInfo
                    attributes: ['id', 'fullname', 'phoneNumber'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(receives);
    } catch (error) {
        console.error('خطا در دریافت لیست دریافت‌ها:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
};

// دریافت یک Receive بر اساس ID
export const getReceiveById = async (req, res) => {
    const { id } = req.params;
    try {
        const receive = await Receive.findByPk(id, {
            include: [
                {
                    model: Customer,
                    as: 'customerInfo',   // تغییر به customerInfo
                    attributes: ['id', 'fullname', 'phoneNumber'],
                },
            ],
        });
        if (!receive) {
            return res.status(404).json({ message: 'دریافت‌کننده یافت نشد' });
        }
        res.status(200).json(receive);
    } catch (error) {
        console.error('خطا در دریافت دریافت‌کننده:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
};


export const createReceive = async (req, res) => {
    const { customer, amount, date, description } = req.body;
    if (!customer || !amount) {
        return res.status(400).json({ message: 'مشتری و مبلغ الزامی هستند' });
    }

    const transaction = await sequelize.transaction();

    try {
        // 1. Verify customer exists
        const customerExists = await Customer.findByPk(customer, { transaction });
        if (!customerExists) {
            await transaction.rollback();
            return res.status(400).json({ message: 'مشتری مشخص‌شده وجود ندارد' });
        }

        // 2. Create the receive record
        const newReceive = await Receive.create(
            {
                customer,
                amount,
                date: date || new Date(),
                description,
            },
            { transaction }
        );

        // 3. Get the customer account (lock it)
        let customerAccount = await CustomerAccount.findOne({
            where: { customerId: customer },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!customerAccount) {
            // No account exists – maybe no sells yet. Just return the receive.
            await transaction.commit();
            const createdReceive = await Receive.findByPk(newReceive.id, {
                include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
            });
            return res.status(201).json(createdReceive);
        }

        // 4. Get the unpaid sell IDs from the account (ensure array)
        const unpaidIds = Array.isArray(customerAccount.unpaid) ? customerAccount.unpaid : [];
        if (unpaidIds.length === 0) {
            // No unpaid sells – just return the receive
            await transaction.commit();
            const createdReceive = await Receive.findByPk(newReceive.id, {
                include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
            });
            return res.status(201).json(createdReceive);
        }

        // 5. Fetch the corresponding Sell records in the same order as unpaidIds
        //    We need to preserve the order (oldest first). Use a CASE or FIELD for ordering.
        const unpaidSells = await Sell.findAll({
            where: { id: unpaidIds },
            transaction,
            lock: transaction.LOCK.UPDATE, // lock each sell row
        });

        // Sort them manually to match unpaidIds order (oldest first = ascending ID)
        unpaidSells.sort((a, b) => a.id - b.id);

        // 6. Calculate total owed and validate payment amount
        const totalOwed = unpaidSells.reduce((sum, sell) => sum + parseFloat(sell.remained), 0);
        const paymentAmount = parseFloat(amount);

        if (paymentAmount > totalOwed) {
            await transaction.rollback();
            return res.status(400).json({
                message: `مبلغ پرداختی (${paymentAmount}) بیشتر از کل بدهی (${totalOwed}) است`,
            });
        }

        // 7. Allocate payment to sells (oldest first)
        let remaining = paymentAmount;
        const updatedSells = []; // track which sells became fully paid

        for (const sell of unpaidSells) {
            if (remaining <= 0) break;

            const owed = parseFloat(sell.remained);
            const receivedSoFar = parseFloat(sell.received) || 0;

            if (remaining >= owed) {
                // Fully pay this sell
                sell.remained = 0;
                sell.received = receivedSoFar + owed; // or sell.total
                remaining -= owed;
                updatedSells.push(sell.id); // mark as fully paid
            } else {
                // Partial payment
                sell.remained = owed - remaining;
                sell.received = receivedSoFar + remaining;
                remaining = 0;
                // Not fully paid, so not added to updatedSells
            }

            await sell.save({ transaction });
        }

        // 8. Update CustomerAccount: move fully paid IDs from unpaid to paid
        const newPaid = Array.isArray(customerAccount.paid) ? [...customerAccount.paid] : [];
        const newUnpaid = unpaidIds.filter(id => !updatedSells.includes(id)); // keep those not fully paid

        // Add fully paid IDs to paid array (avoid duplicates)
        updatedSells.forEach(id => {
            if (!newPaid.includes(id)) newPaid.push(id);
        });

        await customerAccount.update(
            {
                paid: newPaid,
                unpaid: newUnpaid,
            },
            { transaction }
        );

        // 9. Commit transaction
        await transaction.commit();

        // 10. Return created receive
        const createdReceive = await Receive.findByPk(newReceive.id, {
            include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
        });
        res.status(201).json(createdReceive);

    } catch (error) {
        await transaction.rollback();
        console.error('خطا در ایجاد دریافت:', error);
        res.status(500).json({ message: 'خطای سرور', error: error.message });
    }
};

// به‌روزرسانی یک Receive
export const updateReceive = async (req, res) => {
    const { id } = req.params;
    const { customer, amount, date, description } = req.body;

    try {
        const receive = await Receive.findByPk(id);
        if (!receive) {
            return res.status(404).json({ message: 'دریافت‌کننده یافت نشد' });
        }

        // اگر مشتری جدید داده شده، بررسی وجود آن
        if (customer && customer !== receive.customer) {
            const customerExists = await Customer.findByPk(customer);
            if (!customerExists) {
                return res.status(400).json({ message: 'مشتری مشخص‌شده وجود ندارد' });
            }
        }

        // به‌روزرسانی فقط فیلدهای ارسال‌شده
        await receive.update({
            customer: customer !== undefined ? customer : receive.customer,
            amount: amount !== undefined ? amount : receive.amount,
            date: date !== undefined ? date : receive.date,
            description: description !== undefined ? description : receive.description,
        });

        const updatedReceive = await Receive.findByPk(id, {
            include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
        });
        res.status(200).json(updatedReceive);
    } catch (error) {
        console.error('خطا در به‌روزرسانی دریافت:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
};

// حذف یک Receive
export const deleteReceive = async (req, res) => {
    const { id } = req.params;
    try {
        const receive = await Receive.findByPk(id);
        if (!receive) {
            return res.status(404).json({ message: 'دریافت‌کننده یافت نشد' });
        }
        await receive.destroy();
        res.status(200).json({ message: 'دریافت‌کننده با موفقیت حذف شد' });
    } catch (error) {
        console.error('خطا در حذف دریافت:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
};