import { Receive, Sells } from '../../Models/index.js';
import { Customer } from '../../Models/index.js';
import Sell from '../../Models/Stock/Sells.js';
import CustomerAccount from '../../Models/Customer/CustomerAccount.js';
import sequelize from '../../dbconnection.js';
import { Op } from 'sequelize';

export const getAllReceives = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Fetch paginated receives
        const { count, rows } = await Receive.findAndCountAll({
            include: [
                {
                    model: Customer,
                    as: 'customerInfo',
                    attributes: ['id', 'fullname', 'phoneNumber'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset,
        });

        // Pagination metadata
        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            success: true,
            data: rows,
            page: page,
            limit: limit,
            totalRecords: count,
            totalPages: totalPages,
        });
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
  const { customer, date, description, ...deptAmounts } = req.body;

  // Basic validation
  if (!customer) {
    return res.status(400).json({ message: 'مشتری الزامی است' });
  }

  // Check if department-specific amounts are provided
  const deptKeys = Object.keys(deptAmounts).filter(k => k.startsWith('department'));
  let totalPayment = 0;

  if (deptKeys.length > 0) {
    // Validate each department amount
    for (const key of deptKeys) {
      const val = parseFloat(deptAmounts[key]);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: `مبلغ نامعتبر برای ${key}` });
      }
      totalPayment += val;
    }
  } else {
    // Fallback: single amount (old behaviour)
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ message: 'مبلغ الزامی است' });
    }
    totalPayment = parseFloat(amount);
    if (isNaN(totalPayment) || totalPayment < 0) {
      return res.status(400).json({ message: 'مبلغ نامعتبر است' });
    }
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Verify customer exists
    const customerExists = await Customer.findByPk(customer, { transaction });
    if (!customerExists) {
      await transaction.rollback();
      return res.status(400).json({ message: 'مشتری مشخص‌شده وجود ندارد' });
    }

    // 2. Create the receive record (store total payment amount)
    const newReceive = await Receive.create(
      {
        customer,
        amount: totalPayment,
        date: date || new Date(),
        description: description || null,
      },
      { transaction }
    );

    // 3. Find CustomerAccount (must exist to have unpaid sells)
    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: customer },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customerAccount) {
      // No account – no sells, just commit
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    // 4. Get current unpaid structure (department -> array of sell IDs)
    let unpaidByDept = customerAccount.unpaid;
    if (typeof unpaidByDept === 'string') unpaidByDept = JSON.parse(unpaidByDept);
    if (!unpaidByDept || typeof unpaidByDept !== 'object') unpaidByDept = {};

    // 5. If no unpaid sells, just commit
    if (Object.keys(unpaidByDept).length === 0) {
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    // Helper to fetch sells with their current remaind (ordered by id)
    const fetchSells = async (ids) => {
      return await Sells.findAll({
        where: { id: ids },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    };

    // Structures to track updates
    const fullyPaidByDept = {};   // { deptId: [sellId, ...] }
    const remainingUnpaidByDept = JSON.parse(JSON.stringify(unpaidByDept)); // copy

    // 6. Handle payment allocation
    if (deptKeys.length > 0) {
      // --- Department-specific payment ---
      for (const deptKey of deptKeys) {
        const deptId = parseInt(deptKey.replace('department', ''));
        const paymentForDept = parseFloat(deptAmounts[deptKey]);
        if (paymentForDept === 0) continue;

        const unpaidIdsInDept = unpaidByDept[deptId] || [];
        if (unpaidIdsInDept.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ message: `بدهی برای دپارتمان ${deptId} وجود ندارد` });
        }

        // Fetch sells in this department
        const sells = await fetchSells(unpaidIdsInDept);
        const totalOwedInDept = sells.reduce((sum, s) => sum + parseFloat(s.remaind), 0);
        if (paymentForDept > totalOwedInDept) {
          await transaction.rollback();
          return res.status(400).json({
            message: `مبلغ پرداختی برای دپارتمان ${deptId} (${paymentForDept}) بیشتر از کل بدهی آن دپارتمان (${totalOwedInDept}) است`,
          });
        }

        // Allocate payment within this department
        let remaining = paymentForDept;
        const paidInThisDept = [];

        for (const sell of sells) {
          if (remaining <= 0) break;
          const remaind = parseFloat(sell.remaind);
          if (remaining >= remaind) {
            // Fully pay
            sell.receipt = parseFloat(sell.total);
            sell.remaind = 0;
            remaining -= remaind;
            paidInThisDept.push(sell.id);
          } else {
            // Partial
            sell.receipt = parseFloat(sell.receipt) + remaining;
            sell.remaind = remaind - remaining;
            remaining = 0;
          }
          await sell.save({ transaction });
        }

        if (paidInThisDept.length) {
          fullyPaidByDept[deptId] = paidInThisDept;
          // Remove from remainingUnpaidByDept
          remainingUnpaidByDept[deptId] = remainingUnpaidByDept[deptId]?.filter(id => !paidInThisDept.includes(id)) || [];
          if (remainingUnpaidByDept[deptId]?.length === 0) delete remainingUnpaidByDept[deptId];
        }
      }
    } else {
      // --- Fallback: single amount across all departments (oldest sells first, ignoring department) ---
      // Flatten all unpaid sell IDs
      const allUnpaidIds = Object.values(unpaidByDept).flat();
      const allSells = await fetchSells(allUnpaidIds);
      const totalOwed = allSells.reduce((sum, s) => sum + parseFloat(s.remaind), 0);
      if (totalPayment > totalOwed) {
        await transaction.rollback();
        return res.status(400).json({
          message: `مبلغ پرداختی (${totalPayment}) بیشتر از کل بدهی (${totalOwed}) است`,
        });
      }

      let remaining = totalPayment;
      const fullyPaidIds = [];

      for (const sell of allSells) {
        if (remaining <= 0) break;
        const remaind = parseFloat(sell.remaind);
        if (remaining >= remaind) {
          sell.receipt = parseFloat(sell.total);
          sell.remaind = 0;
          remaining -= remaind;
          fullyPaidIds.push(sell.id);
        } else {
          sell.receipt = parseFloat(sell.receipt) + remaining;
          sell.remaind = remaind - remaining;
          remaining = 0;
        }
        await sell.save({ transaction });
      }

      // Group fully paid IDs by department (need to fetch departmentId for each)
      if (fullyPaidIds.length) {
        const paidSells = await Sells.findAll({
          where: { id: fullyPaidIds },
          attributes: ['id', 'departmentId'],
          transaction,
        });
        for (const s of paidSells) {
          const dept = s.departmentId;
          if (!fullyPaidByDept[dept]) fullyPaidByDept[dept] = [];
          fullyPaidByDept[dept].push(s.id);
          // Remove from remainingUnpaidByDept
          if (remainingUnpaidByDept[dept]) {
            remainingUnpaidByDept[dept] = remainingUnpaidByDept[dept].filter(id => id !== s.id);
            if (remainingUnpaidByDept[dept].length === 0) delete remainingUnpaidByDept[dept];
          }
        }
      }
    }

    // 7. Update CustomerAccount's paid and unpaid structures
    let currentPaidByDept = customerAccount.paid;
    if (typeof currentPaidByDept === 'string') currentPaidByDept = JSON.parse(currentPaidByDept);
    if (!currentPaidByDept || typeof currentPaidByDept !== 'object') currentPaidByDept = {};

    // Merge fully paid IDs into paidByDept
    for (const [deptId, paidIds] of Object.entries(fullyPaidByDept)) {
      if (!currentPaidByDept[deptId]) currentPaidByDept[deptId] = [];
      // Avoid duplicates (though unlikely)
      const newIds = paidIds.filter(id => !currentPaidByDept[deptId].includes(id));
      currentPaidByDept[deptId] = [...currentPaidByDept[deptId], ...newIds];
    }

    // Update receive array: append new receive ID
    let receiveArray = customerAccount.receive;
    if (typeof receiveArray === 'string') receiveArray = JSON.parse(receiveArray);
    if (!Array.isArray(receiveArray)) receiveArray = [];
    receiveArray.push(newReceive.id);

    // Save updates
    await customerAccount.update(
      {
        paid: currentPaidByDept,
        unpaid: remainingUnpaidByDept,
        receive: receiveArray,
      },
      { transaction }
    );

    // 8. Commit transaction
    await transaction.commit();

    // 9. Return created receive
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


export const getReceivesByDateRange = async (req, res) => {
  const { from, to, customerId } = req.query;

  // Validate required date parameters
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "from and to dates are required",
    });
  }

  try {
    // Convert to full day range
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    // Build where clause for Receive
    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Add customer filter if provided
    if (customerId) {
      whereClause.customer = customerId;
    }

    // Fetch receives with associated customer info
    const receives = await Receive.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: "customerInfo", // Must match the alias defined in your index
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate total amount (sum of all receive amounts)
    const totalAmount = receives.reduce(
      (sum, r) => sum + parseFloat(r.amount || 0),
      0
    );

    // Return response
    return res.status(200).json({
      success: true,
      message: "Receives fetched successfully",
      data: {
        receives,
        totalCount: receives.length,
        totalAmount,
        filters: {
          from,
          to,
          customerId: customerId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in getReceivesByDateRange:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching receives",
      error: error.message,
    });
  }
};