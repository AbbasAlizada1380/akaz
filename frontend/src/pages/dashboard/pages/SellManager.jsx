export const createReceive = async (req, res) => {
  const { customer, amount, date, description, ...deptAmounts } = req.body;

  // Basic validation
  if (!customer) {
    return res.status(400).json({ message: 'مشتری الزامی است' });
  }

  // Determine if department-specific amounts are provided
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

    // 3. Find or create CustomerAccount
    let customerAccount = await CustomerAccount.findOne({
      where: { customerId: customer },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customerAccount) {
      // No account exists – no sells. Just commit and return.
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    // 4. Get the current unpaid structure (department -> array of sell IDs)
    let unpaidByDept = customerAccount.unpaid;
    if (typeof unpaidByDept === 'string') unpaidByDept = JSON.parse(unpaidByDept);
    if (!unpaidByDept || typeof unpaidByDept !== 'object') unpaidByDept = {};

    // Flatten all unpaid sell IDs (for the fallback case)
    const allUnpaidIds = Object.values(unpaidByDept).flat();

    if (allUnpaidIds.length === 0) {
      // No unpaid sells – just commit
      await transaction.commit();
      const createdReceive = await Receive.findByPk(newReceive.id, {
        include: [{ model: Customer, as: 'customerInfo', attributes: ['id', 'fullname', 'phoneNumber'] }],
      });
      return res.status(201).json(createdReceive);
    }

    // Helper: fetch sells with their departmentId
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
    const remainingUnpaidByDept = JSON.parse(JSON.stringify(unpaidByDept)); // copy to modify

    // Payment allocation logic
    if (deptKeys.length > 0) {
      // --- Department‑specific payment ---
      // Validate that each requested department exists in unpaidByDept and total matches
      let totalUnpaidInRequestedDepts = 0;
      for (const deptKey of deptKeys) {
        const deptId = parseInt(deptKey.replace('department', ''));
        const paymentForDept = parseFloat(deptAmounts[deptKey]);
        if (paymentForDept === 0) continue;

        const unpaidInThisDept = unpaidByDept[deptId] || [];
        if (unpaidInThisDept.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ message: `بدهی برای دپارتمان ${deptId} وجود ندارد` });
        }

        // Fetch sells in this department
        const sells = await fetchSells(unpaidInThisDept);
        const totalOwedInDept = sells.reduce((sum, s) => sum + parseFloat(s.remaind), 0);
        totalUnpaidInRequestedDepts += totalOwedInDept;

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

      // Optionally, ensure the sum of department payments equals totalPayment (already true by construction)
    } else {
      // --- Fallback: single amount allocated across all departments (oldest sells first regardless of department) ---
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

    // 6. Update CustomerAccount's paid and unpaid structures
    let currentPaidByDept = customerAccount.paid;
    if (typeof currentPaidByDept === 'string') currentPaidByDept = JSON.parse(currentPaidByDept);
    if (!currentPaidByDept || typeof currentPaidByDept !== 'object') currentPaidByDept = {};

    // Merge fully paid IDs into paidByDept
    for (const [deptId, paidIds] of Object.entries(fullyPaidByDept)) {
      if (!currentPaidByDept[deptId]) currentPaidByDept[deptId] = [];
      currentPaidByDept[deptId] = [...currentPaidByDept[deptId], ...paidIds];
    }

    // Update unpaid: replace with remainingUnpaidByDept
    const updatedUnpaid = remainingUnpaidByDept;

    // Update receive array: append new receive ID
    let receiveArray = customerAccount.receive;
    if (typeof receiveArray === 'string') receiveArray = JSON.parse(receiveArray);
    if (!Array.isArray(receiveArray)) receiveArray = [];
    receiveArray.push(newReceive.id);

    await customerAccount.update(
      {
        paid: currentPaidByDept,
        unpaid: updatedUnpaid,
        receive: receiveArray,
      },
      { transaction }
    );

    // 7. Commit transaction
    await transaction.commit();

    // 8. Return created receive with customer info
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