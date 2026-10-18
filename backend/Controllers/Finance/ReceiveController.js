import { Bill, Department, Receive, Sells, Benefit } from '../../Models/index.js';
import { Customer } from '../../Models/index.js';
import CustomerAccount from '../../Models/Customer/CustomerAccount.js';
import sequelize from '../../dbconnection.js';
import { Op } from 'sequelize';

/* ============================================================
   GET ALL RECEIVES
   ============================================================ */
export const getAllReceives = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Receive.findAndCountAll({
      include: [
        {
          model: Customer,
          as: 'receiveCustomer',
          attributes: ['id', 'fullname', 'phoneNumber'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      data: rows,
      page,
      limit,
      totalRecords: count,
      totalPages,
    });
  } catch (error) {
    console.error('خطا در دریافت لیست دریافت‌ها:', error);
    res.status(500).json({ message: 'خطای سرور', error: error.message });
  }
};

/* ============================================================
   GET RECEIVE BY ID
   ============================================================ */
export const getReceiveById = async (req, res) => {
  const { id } = req.params;
  try {
    const receive = await Receive.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'receiveCustomer',
          attributes: ['id', 'fullname', 'phoneNumber'],
        },
      ],
    });
    if (!receive) {
      return res.status(404).json({ message: 'دریافت‌کننده یافت نشد' });
    }
    res.status(200).json({ success: true, data: receive });
  } catch (error) {
    console.error('خطا در دریافت دریافت‌کننده:', error);
    res.status(500).json({ message: 'خطای سرور', error: error.message });
  }
};

/* ============================================================
   HELPER: realign Department benefits when a sell becomes fully settled
   (works for both positive sales -> realized, and negative sells -> realized)
   ============================================================ */
const updateDepartmentBenefitsOnFullPayment = async (sellIds, transaction) => {
  if (!sellIds || sellIds.length === 0) return;

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
    pending = pending.map((id) => (typeof id === 'number' ? id : Number(id)));

    let realized = department.realizedBenefit;
    if (typeof realized === 'string') realized = JSON.parse(realized);
    if (!Array.isArray(realized)) realized = [];
    realized = realized.map((id) => (typeof id === 'number' ? id : Number(id)));

    const numericBenefitIds = benefitIds.map((id) =>
      typeof id === 'number' ? id : Number(id)
    );

    const newPending = pending.filter((id) => !numericBenefitIds.includes(id));
    const newRealized = [...realized, ...numericBenefitIds];

    await department.update(
      { benifit: newPending, realizedBenefit: newRealized },
      { transaction }
    );
  }
};


export const createReceive = async (req, res) => {
  const { customer, date, description, ...deptAmounts } = req.body;

  if (!customer) {
    return res.status(400).json({ success: false, message: 'مشتری الزامی است' });
  }

  const deptKeys = Object.keys(deptAmounts).filter((k) => k.startsWith('department'));
  let totalPayment = 0;
  const deptPayments = {};

  if (deptKeys.length > 0) {
    for (const key of deptKeys) {
      const deptId = parseInt(key.replace('department', ''), 10);
      const val = parseFloat(deptAmounts[key]);
      if (isNaN(val)) {
        return res.status(400).json({ success: false, message: `مبلغ نامعتبر برای ${key}` });
      }
      deptPayments[deptId] = val;
      totalPayment += val;
    }
  } else {
    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'مبلغ الزامی است' });
    }
    totalPayment = parseFloat(amount);
    if (isNaN(totalPayment)) {
      return res.status(400).json({ success: false, message: 'مبلغ نامعتبر است' });
    }
  }

  const transaction = await sequelize.transaction();

  try {
    const customerExists = await Customer.findByPk(customer, { transaction });
    if (!customerExists) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'مشتری مشخص‌شده وجود ندارد' });
    }

    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: customer },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // Fallback if no customer account exists yet
    const persistReceivesOnly = async () => {
      const created = [];
      if (deptKeys.length > 0) {
        for (const [deptId, amount] of Object.entries(deptPayments)) {
          if (amount !== 0) {
            const rec = await Receive.create({
              customer, amount, date: date || new Date(),
              description: description || `پرداخت برای دپارتمان ${deptId}`,
              departmentId: parseInt(deptId, 10), billId: null, sellId: null,
            }, { transaction });
            created.push(rec);
          }
        }
      } else if (totalPayment !== 0) {
        const rec = await Receive.create({
          customer, amount: totalPayment, date: date || new Date(),
          description: description || 'پرداخت',
          departmentId: null, billId: null, sellId: null,
        }, { transaction });
        created.push(rec);
      }
      await transaction.commit();
      return created;
    };

    if (!customerAccount) {
      const created = await persistReceivesOnly();
      return res.status(201).json({ success: true, message: 'دریافت با موفقیت ایجاد شد', data: created.map((r) => r.toJSON()) });
    }

    // 1. Get all partially paid or unpaid bills for this customer (FIFO by ID)
    const openBills = await Bill.findAll({
      where: {
        customerId: customer,
        status: { [Op.ne]: 'paid' }
      },
      order: [['id', 'ASC']], // Strict FIFO
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (openBills.length === 0) {
      const created = await persistReceivesOnly();
      return res.status(201).json({ success: true, message: 'دریافت با موفقیت ایجاد شد', data: created.map((r) => r.toJSON()) });
    }

    const createdReceives = [];
    const affectedSells = new Set();

    // ==========================================
    // STRICT FIFO LOGIC (As Requested)
    // ==========================================
    const allocateFIFO = async (sells, initialPoolAmount) => {
      let remainingPool = initialPoolAmount;
      
      // 1. Calculate the NET owed first
      const netOwed = sells.reduce((sum, s) => sum + Number(s.remaind), 0);

      // 2. If the payment exactly equals the net owed, settle EVERYTHING.
      // This means if they owe 200 and have a -250 return, they pay 50.
      // Both bills are settled to 0.
      if (netOwed !== 0 && initialPoolAmount === netOwed) {
        for (const sell of sells) {
          const remaind = Number(sell.remaind);
          if (remaind === 0) continue;

          // Move receipt to total, meaning this bill is fully settled
          sell.receipt = Number(sell.total);
          sell.remaind = 0;
          affectedSells.add(sell.id);
        }
        return 0; // Pool is fully used
      }

      // 3. If they are paying PARTIALLY, go strictly FIFO
      for (const sell of sells) {
        if (remainingPool === 0) break;

        const remaind = Number(sell.remaind);
        if (remaind === 0) continue;

        if (remaind < 0) {
            // Partial payment on a return: reduce it toward 0
            const applicable = Math.min(Math.abs(remainingPool), Math.abs(remaind));
            const sgn = Math.sign(remaind);
            
            sell.receipt = Number(sell.receipt) + (sgn * applicable);
            sell.remaind = remaind - (sgn * applicable);
            affectedSells.add(sell.id);
            remainingPool -= (sgn * applicable);
        } else if (remaind > 0) {
            if (remainingPool < 0) continue; // Can't pay positive with negative pool

            const applicable = Math.min(remainingPool, remaind);
            sell.receipt = Number(sell.receipt) + applicable;
            sell.remaind = remaind - applicable;
            affectedSells.add(sell.id);
            remainingPool -= applicable; 
        }
      }
      return remainingPool;
    };

    // 2. Process per department
    if (deptKeys.length > 0) {
      for (const [deptIdStr, paymentAmount] of Object.entries(deptPayments)) {
        const deptId = parseInt(deptIdStr, 10);
        if (paymentAmount === 0) continue;

        // Get all open sells for this department (sorted by ID)
        const deptSells = await Sells.findAll({
          where: {
            billId: openBills.map(b => b.id),
            departmentId: deptId,
            remaind: { [Op.ne]: 0 }
          },
          order: [['id', 'ASC']], // FIFO
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (deptSells.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: `بدهی برای دپارتمان ${deptId} وجود ندارد` });
        }

        // Allocate using FIFO logic
        await allocateFIFO(deptSells, paymentAmount);

        // Save affected sells
        for (const sell of deptSells) {
          if (affectedSells.has(sell.id)) await sell.save({ transaction });
        }

        // Create Receive record
        const rec = await Receive.create({
          customer, amount: paymentAmount, date: date || new Date(),
          description: description || `پرداخت برای دپارتمان ${deptId}`,
          departmentId: deptId, billId: null, sellId: null,
        }, { transaction });
        createdReceives.push(rec);
      }
    } else {
      // ---- Global fallback ----
      const allSells = await Sells.findAll({
        where: { billId: openBills.map(b => b.id), remaind: { [Op.ne]: 0 } },
        order: [['id', 'ASC']], // FIFO
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (allSells.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'بدهی/اعتبار بازی وجود ندارد' });
      }

      await allocateFIFO(allSells, totalPayment);

      for (const sell of allSells) {
        if (affectedSells.has(sell.id)) await sell.save({ transaction });
      }

      const rec = await Receive.create({
        customer, amount: totalPayment, date: date || new Date(),
        description: description || 'پرداخت',
        departmentId: null, billId: null, sellId: null,
      }, { transaction });
      createdReceives.push(rec);
    }

    // 3. Recalculate Bills exactly based on the updated Sells
    for (const bill of openBills) {
      const allBillSells = await Sells.findAll({ where: { billId: bill.id }, attributes: ['receipt', 'total'], transaction });
      
      const newPaidAmount = allBillSells.reduce((sum, s) => sum + Number(s.receipt || 0), 0);
      const newTotal = allBillSells.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const newRemaining = newTotal - newPaidAmount;

      let newStatus = 'unpaid';
      if (newRemaining === 0) newStatus = 'paid';
      else if (
        (newTotal > 0 && newPaidAmount > 0) || 
        (newTotal < 0 && newPaidAmount < 0)
      ) newStatus = 'partial';
      else if (newPaidAmount !== 0) newStatus = 'partial';

      await bill.update({
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        status: newStatus
      }, { transaction });
    }

    // 4. Update Customer Account
    let currentPaidByDept = customerAccount.paid;
    if (typeof currentPaidByDept === 'string') currentPaidByDept = JSON.parse(currentPaidByDept);
    if (!currentPaidByDept || typeof currentPaidByDept !== 'object') currentPaidByDept = {};

    // Rebuild the complete unpaid array based on actual database state
    const allUnpaidSells = await Sells.findAll({
      where: { billId: openBills.map(b => b.id), remaind: { [Op.ne]: 0 } },
      transaction
    });
    
    const remainingUnpaidByDept = {};
    const newPaidByDept = {};
    
    for (const s of allUnpaidSells) {
      if (!remainingUnpaidByDept[s.departmentId]) remainingUnpaidByDept[s.departmentId] = [];
      remainingUnpaidByDept[s.departmentId].push(s.id);
    }

    const allSellsInBills = await Sells.findAll({
      where: { billId: openBills.map(b => b.id) },
      transaction
    });

    for (const s of allSellsInBills) {
      if (Number(s.remaind) === 0) {
        if (!newPaidByDept[s.departmentId]) newPaidByDept[s.departmentId] = [];
        newPaidByDept[s.departmentId].push(s.id);
      }
    }

    for (const [deptId, paidIds] of Object.entries(newPaidByDept)) {
      if (!currentPaidByDept[deptId]) currentPaidByDept[deptId] = [];
      const combined = new Set([...currentPaidByDept[deptId], ...paidIds]);
      currentPaidByDept[deptId] = Array.from(combined);
    }

    let receiveArray = customerAccount.receive;
    if (typeof receiveArray === 'string') receiveArray = JSON.parse(receiveArray);
    if (!Array.isArray(receiveArray)) receiveArray = [];
    receiveArray.push(...createdReceives.map(r => r.id));

    await customerAccount.update({
      paid: currentPaidByDept,
      unpaid: remainingUnpaidByDept,
      receive: receiveArray,
    }, { transaction });

    await transaction.commit();

    const receivesWithCustomer = await Receive.findAll({
      where: { id: createdReceives.map(r => r.id) },
      include: [{
        model: Customer,
        as: 'receiveCustomer',
        attributes: ['id', 'fullname', 'phoneNumber'],
      }],
    });

    res.status(201).json({
      success: true,
      message: 'دریافت با موفقیت ایجاد شد',
      data: receivesWithCustomer,
    });

  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error('خطا در ایجاد دریافت:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
      error: error.message,
    });
  }
};

/* ============================================================
   UPDATE / DELETE / DATE RANGE / CUSTOMER SUMMARY
   (unchanged except comment cleanups)
   ============================================================ */
export const updateReceive = async (req, res) => {
  const { id } = req.params;
  const { customer, amount, date, description } = req.body;

  try {
    const receive = await Receive.findByPk(id);
    if (!receive) {
      return res
        .status(404)
        .json({ success: false, message: 'دریافت‌کننده یافت نشد' });
    }

    if (customer && customer !== receive.customer) {
      const customerExists = await Customer.findByPk(customer);
      if (!customerExists) {
        return res
          .status(400)
          .json({ success: false, message: 'مشتری مشخص‌شده وجود ندارد' });
      }
    }

    await receive.update({
      customer: customer !== undefined ? customer : receive.customer,
      amount: amount !== undefined ? amount : receive.amount,
      date: date !== undefined ? date : receive.date,
      description: description !== undefined ? description : receive.description,
    });

    const updatedReceive = await Receive.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'receiveCustomer',
          attributes: ['id', 'fullname', 'phoneNumber'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'دریافت با موفقیت به‌روزرسانی شد',
      data: updatedReceive,
    });
  } catch (error) {
    console.error('خطا در به‌روزرسانی دریافت:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
      error: error.message,
    });
  }
};

export const deleteReceive = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const receive = await Receive.findByPk(id);
    if (!receive) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: 'دریافت‌کننده یافت نشد' });
    }

    const customerAccount = await CustomerAccount.findOne({
      where: { customerId: receive.customer },
      transaction,
    });

    if (customerAccount) {
      let receiveArray = customerAccount.receive;
      if (typeof receiveArray === 'string')
        receiveArray = JSON.parse(receiveArray);
      if (Array.isArray(receiveArray)) {
        const updatedReceiveArray = receiveArray.filter(
          (rid) => rid !== receive.id
        );
        await customerAccount.update(
          { receive: updatedReceiveArray },
          { transaction }
        );
      }
    }

    await receive.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'دریافت‌کننده با موفقیت حذف شد',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('خطا در حذف دریافت:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سرور',
      error: error.message,
    });
  }
};

export const getReceivesByDateRange = async (req, res) => {
  const { from, to, customerId } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: 'from and to dates are required',
    });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      createdAt: { [Op.between]: [startDate, endDate] },
    };

    if (customerId) whereClause.customer = customerId;

    const receives = await Receive.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'receiveCustomer',
          attributes: ['id', 'fullname', 'phoneNumber'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const totalAmount = receives.reduce(
      (sum, r) => sum + parseFloat(r.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      message: 'Receives fetched successfully',
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
    console.error('Error in getReceivesByDateRange:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching receives',
      error: error.message,
    });
  }
};

export const getCustomerReceiveSummary = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res
        .status(400)
        .json({ success: false, message: 'Customer ID is required' });
    }

    const receives = await Receive.findAll({
      where: { customer: customerId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Customer,
          as: 'receiveCustomer',
          attributes: ['id', 'fullname', 'phoneNumber'],
        },
      ],
    });

    const totalReceived = receives.reduce(
      (sum, r) => sum + parseFloat(r.amount || 0),
      0
    );
    const receiveCount = receives.length;
    const averageReceive = receiveCount > 0 ? totalReceived / receiveCount : 0;

    const latestReceive = receives.length > 0 ? receives[0].createdAt : null;
    const firstReceive =
      receives.length > 0 ? receives[receives.length - 1].createdAt : null;

    res.json({
      success: true,
      data: {
        customerId,
        summary: {
          totalReceived,
          receiveCount,
          averageReceive,
          latestReceive,
          firstReceive,
        },
        receives,
      },
    });
  } catch (error) {
    console.error('Error in getCustomerReceiveSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer receive summary',
      error: error.message,
    });
  }
};