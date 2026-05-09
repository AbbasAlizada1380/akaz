import { Bill, Department, Receive, Sells, Benefit } from '../../Models/index.js';
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

/**
 * When a sell becomes fully paid, move its associated Benefit ID
 * from Department.benifit (pending) to Department.realizedBenefit (realized).
 * 
 * @param {number[]} sellIds - Array of Sells.id that just became fully paid
 * @param {Transaction} transaction - Sequelize transaction
 */
const updateDepartmentBenefitsOnFullPayment = async (sellIds, transaction) => {
  const benefits = await Benefit.findAll({
    where: { sellId: sellIds },
    attributes: ['id', 'departmentId'],
    transaction,
  });

  if (benefits.length === 0) return;

  const deptToBenefitIds = {};
  for (const benefit of benefits) {
    const deptId = benefit.departmentId;
    if (!deptToBenefitIds[deptId]) deptToBenefitIds[deptId] = [];
    deptToBenefitIds[deptId].push(benefit.id);
  }

for (const [deptId, benefitIds] of Object.entries(deptToBenefitIds)) {
  const department = await Department.findByPk(deptId, { transaction });
  if (!department) continue;

  let pending = department.benifit;
  if (typeof pending === 'string') pending = JSON.parse(pending);
  if (!Array.isArray(pending)) pending = [];
  // Convert existing pending IDs to numbers
  pending = pending.map(id => typeof id === 'number' ? id : Number(id));

  let realized = department.realizedBenefit;
  if (typeof realized === 'string') realized = JSON.parse(realized);
  if (!Array.isArray(realized)) realized = [];
  // Convert existing realized IDs to numbers
  realized = realized.map(id => typeof id === 'number' ? id : Number(id));

  // Ensure new benefitIds are numbers
  const numericBenefitIds = benefitIds.map(id => typeof id === 'number' ? id : Number(id));

  // Filter out numeric IDs
  const newPending = pending.filter(id => !numericBenefitIds.includes(id));
  const newRealized = [...realized, ...numericBenefitIds];

  await department.update(
    {
      benifit: newPending,
      realizedBenefit: newRealized,
    },
    { transaction }
  );
}
};

export const createReceive = async (req, res) => {
  const { customer, date, description, ...deptAmounts } = req.body;

  // Basic validation
  if (!customer) {
    return res.status(400).json({ message: 'مشتری الزامی است' });
  }

  const deptKeys = Object.keys(deptAmounts).filter(k => k.startsWith('department'));
  let totalPayment = 0;

  if (deptKeys.length > 0) {
    for (const key of deptKeys) {
      const val = parseFloat(deptAmounts[key]);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: `مبلغ نامعتبر برای ${key}` });
      }
      totalPayment += val;
    }
  } else {
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
    const customerExists = await Customer.findByPk(customer, { transaction });
    if (!customerExists) {
      await transaction.rollback();
      return res.status(400).json({ message: 'مشتری مشخص‌شده وجود ندارد' });
    }

    const newReceive = await Receive.create(
      {
        customer,
        amount: totalPayment,
        date: date || new Date(),
        description: description || null,
      },
      { transaction }
    );

    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: customer },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customerAccount) {
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    let unpaidByDept = customerAccount.unpaid;
    if (typeof unpaidByDept === 'string') unpaidByDept = JSON.parse(unpaidByDept);
    if (!unpaidByDept || typeof unpaidByDept !== 'object') unpaidByDept = {};

    if (Object.keys(unpaidByDept).length === 0) {
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    const fetchSells = async (ids) => {
      return await Sells.findAll({
        where: { id: ids },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    };

    const fullyPaidByDept = {};
    const remainingUnpaidByDept = JSON.parse(JSON.stringify(unpaidByDept));
    const affectedSellIds = [];

    if (deptKeys.length > 0) {
      for (const deptKey of deptKeys) {
        const deptId = parseInt(deptKey.replace('department', ''));
        const paymentForDept = parseFloat(deptAmounts[deptKey]);
        if (paymentForDept === 0) continue;

        const unpaidIdsInDept = unpaidByDept[deptId] || [];
        if (unpaidIdsInDept.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ message: `بدهی برای دپارتمان ${deptId} وجود ندارد` });
        }

        const sells = await fetchSells(unpaidIdsInDept);
        const totalOwedInDept = sells.reduce((sum, s) => sum + parseFloat(s.remaind), 0);
        if (paymentForDept > totalOwedInDept) {
          await transaction.rollback();
          return res.status(400).json({
            message: `مبلغ پرداختی برای دپارتمان ${deptId} (${paymentForDept}) بیشتر از کل بدهی آن دپارتمان (${totalOwedInDept}) است`,
          });
        }

        let remaining = paymentForDept;
        const paidInThisDept = [];

        for (const sell of sells) {
          if (remaining <= 0) break;
          const remaind = parseFloat(sell.remaind);
          if (remaining >= remaind) {
            sell.receipt = parseFloat(sell.total);
            sell.remaind = 0;
            remaining -= remaind;
            paidInThisDept.push(sell.id);
          } else {
            sell.receipt = parseFloat(sell.receipt) + remaining;
            sell.remaind = remaind - remaining;
            remaining = 0;
          }
          await sell.save({ transaction });
          affectedSellIds.push(sell.id);
        }

        if (paidInThisDept.length) {
          fullyPaidByDept[deptId] = paidInThisDept;
          remainingUnpaidByDept[deptId] = remainingUnpaidByDept[deptId]?.filter(id => !paidInThisDept.includes(id)) || [];
          if (remainingUnpaidByDept[deptId]?.length === 0) delete remainingUnpaidByDept[deptId];
        }
      }
    } else {
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
        affectedSellIds.push(sell.id);
      }

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
          if (remainingUnpaidByDept[dept]) {
            remainingUnpaidByDept[dept] = remainingUnpaidByDept[dept].filter(id => id !== s.id);
            if (remainingUnpaidByDept[dept].length === 0) delete remainingUnpaidByDept[dept];
          }
        }
      }
    }

    // 6. Update CustomerAccount paid/unpaid structures
    let currentPaidByDept = customerAccount.paid;
    if (typeof currentPaidByDept === 'string') currentPaidByDept = JSON.parse(currentPaidByDept);
    if (!currentPaidByDept || typeof currentPaidByDept !== 'object') currentPaidByDept = {};

    for (const [deptId, paidIds] of Object.entries(fullyPaidByDept)) {
      if (!currentPaidByDept[deptId]) currentPaidByDept[deptId] = [];
      const newIds = paidIds.filter(id => !currentPaidByDept[deptId].includes(id));
      currentPaidByDept[deptId] = [...currentPaidByDept[deptId], ...newIds];
    }

    let receiveArray = customerAccount.receive;
    if (typeof receiveArray === 'string') receiveArray = JSON.parse(receiveArray);
    if (!Array.isArray(receiveArray)) receiveArray = [];
    receiveArray.push(newReceive.id);

    await customerAccount.update(
      {
        paid: currentPaidByDept,
        unpaid: remainingUnpaidByDept,
        receive: receiveArray,
      },
      { transaction }
    );

    // 7. Update Bills
    if (affectedSellIds.length > 0) {
      const affectedSells = await Sells.findAll({
        where: { id: affectedSellIds },
        attributes: ['id', 'billId', 'receipt'],
        transaction,
      });

      const billReceiptSum = new Map();
      for (const sell of affectedSells) {
        const billId = sell.billId;
        const receipt = parseFloat(sell.receipt) || 0;
        billReceiptSum.set(billId, (billReceiptSum.get(billId) || 0) + receipt);
      }

      for (const [billId] of billReceiptSum.entries()) {
        const bill = await Bill.findByPk(billId, { transaction });
        if (bill) {
          const allSellsOfBill = await Sells.findAll({
            where: { billId },
            attributes: ['receipt'],
            transaction,
          });
          const newPaidAmount = allSellsOfBill.reduce((sum, s) => sum + parseFloat(s.receipt), 0);
          const newRemaining = bill.totalAmount - newPaidAmount;
          const newStatus = newRemaining === 0 ? "paid" : (newPaidAmount > 0 ? "partial" : "unpaid");

          await bill.update(
            {
              paidAmount: newPaidAmount,
              remainingAmount: newRemaining,
              status: newStatus,
            },
            { transaction }
          );
        }
      }
    }

    // ========== ADDED: Realize benefits for fully paid sells ==========
    const allFullyPaidSellIds = Object.values(fullyPaidByDept).flat();
    if (allFullyPaidSellIds.length > 0) {
      await updateDepartmentBenefitsOnFullPayment(allFullyPaidSellIds, transaction);
    }
    // =================================================================

    await transaction.commit();

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