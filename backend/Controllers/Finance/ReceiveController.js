import { Receive } from '../../Models/Association.js';
import { Customer } from '../../Models/Association.js';
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

// ایجاد یک Receive جدید
export const createReceive = async (req, res) => {
    const { customer, amount, date, description } = req.body; // customer = customerId
    // اعتبارسنجی ساده
    if (!customer || !amount) {
        return res.status(400).json({ message: 'مشتری و مبلغ الزامی هستند' });
    }
    try {
        // بررسی وجود مشتری
        const customerExists = await Customer.findByPk(customer);
        if (!customerExists) {
            return res.status(400).json({ message: 'مشتری مشخص‌شده وجود ندارد' });
        }

        const newReceive = await Receive.create({
            customer,
            amount,
            date: date || new Date(),
            description,
        });

        const createdReceive = await Receive.findByPk(newReceive.id, {
            include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
        });
        res.status(201).json(createdReceive);
    } catch (error) {
        console.error('خطا در ایجاد دریافت:', error);
        res.status(500).json({ message: 'خطای سرور' });
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