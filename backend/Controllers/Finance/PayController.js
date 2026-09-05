import { Pay, SellerAccount, sequelize, Factor, Seller, Department } from "../../Models/index.js";
import { Op } from "sequelize";

export const createPay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { seller, amount, description, departmentId } = req.body;

    // Validate input
    if (!seller) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // 1. Create the pay record
    const pay = await Pay.create(
      {
        seller,
        departmentId: departmentId || null,
        amount,
        description: description || `Payment of ${amount} for seller #${seller}`,
      },
      { transaction }
    );

    // 2. Find or create seller account
    let sellerAccount = await SellerAccount.findOne({
      where: { sellerId: seller },
      transaction,
    });

    if (!sellerAccount) {
      sellerAccount = await SellerAccount.create(
        {
          sellerId: seller,
          paid: [],
          unpaid: [],
          total: [],
        },
        { transaction }
      );
      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: "Payment created successfully (new seller account, no factors to pay)",
        data: { pay, sellerAccount },
      });
    }

    // 3. Get all unpaid factor IDs from seller account
    let allUnpaidFactorIds = Array.isArray(sellerAccount.unpaid) ? [...sellerAccount.unpaid] : [];
    if (allUnpaidFactorIds.length === 0) {
      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: "Payment created successfully (no unpaid factors to process)",
        data: { pay, sellerAccount },
      });
    }

    // 4. Build filter for factors to process
    const whereCondition = {
      id: allUnpaidFactorIds,
      sellerId: seller,
      remainingAmount: { [Op.gt]: 0 },
    };
    if (departmentId) {
      whereCondition.dep_Number = departmentId; // only factors of this department
    }

    // Fetch factors to process (those matching filter)
    const factorsToProcess = await Factor.findAll({
      where: whereCondition,
      order: [['id', 'ASC']],
      transaction,
    });

    if (factorsToProcess.length === 0) {
      // No matching factors, just record payment and keep unpaid list unchanged
      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: departmentId
          ? "Payment created but no unpaid factors found for the specified department"
          : "Payment created but no factors with positive remaining",
        data: { pay, sellerAccount },
      });
    }

    // 5. Process payments against factors (oldest first)
    let remainingPayment = parseFloat(amount);
    const fullyPaidIds = [];    // factors completely paid (will move to paid)
    const partiallyPaidIds = []; // factors partially paid (stay in unpaid)

    for (const factor of factorsToProcess) {
      if (remainingPayment <= 0) {
        // No more money, factor remains unpaid (not processed)
        break; // since we process oldest first, we stop; other factors after this will stay unpaid
      }

      const factorRemaining = parseFloat(factor.remainingAmount) || 0;
      if (factorRemaining <= 0) continue; // should not happen but safe

      if (remainingPayment >= factorRemaining) {
        // Fully pay this factor
        const newPaidAmount = (parseFloat(factor.paidAmount) || 0) + factorRemaining;
        await factor.update(
          {
            paidAmount: newPaidAmount,
            remainingAmount: 0,
            status: "paid",
          },
          { transaction }
        );
        remainingPayment -= factorRemaining;
        fullyPaidIds.push(factor.id);
      } else {
        // Partial payment
        const paymentUsed = remainingPayment;
        const newPaidAmount = (parseFloat(factor.paidAmount) || 0) + paymentUsed;
        const newRemaining = factorRemaining - paymentUsed;

        await factor.update(
          {
            paidAmount: newPaidAmount,
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? "paid" : "partial",
          },
          { transaction }
        );
        partiallyPaidIds.push(factor.id);
        remainingPayment = 0;
      }
    }

    // 6. Update seller account arrays
    // Start with the original unpaid set and remove fully paid ones
    const unpaidSet = new Set(allUnpaidFactorIds);
    fullyPaidIds.forEach(id => unpaidSet.delete(id));
    // Note: partially paid factors remain in unpaidSet because they are still unpaid
    // Also any factors from other departments (if department filter was used) remain in the set

    // Convert set back to array for final unpaid list
    const finalUnpaid = Array.from(unpaidSet);

    // Update paid array: add fully paid factor IDs (avoid duplicates)
    const currentPaid = Array.isArray(sellerAccount.paid) ? [...sellerAccount.paid] : [];
    fullyPaidIds.forEach(id => {
      if (!currentPaid.includes(id)) currentPaid.push(id);
    });

    await sellerAccount.update(
      {
        paid: currentPaid,
        unpaid: finalUnpaid,
      },
      { transaction }
    );

    await transaction.commit();

    // 7. Fetch updated data for response
    const updatedSellerAccount = await SellerAccount.findOne({ where: { sellerId: seller } });
    const affectedFactorIds = [...fullyPaidIds, ...partiallyPaidIds];
    const affectedFactors = await Factor.findAll({
      where: { id: affectedFactorIds },
      include: [
        {
          model: Department,
          as: 'factorDepartment',
          attributes: ['id', 'name', 'holding']
        }
      ]
    });

    const createdPay = await Pay.findByPk(pay.id, {
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Payment created and applied to unpaid factors successfully",
      data: {
        pay: createdPay,
        sellerAccount: updatedSellerAccount,
        paymentDistribution: {
          totalAmount: parseFloat(amount),
          appliedAmount: parseFloat(amount) - remainingPayment,
          remainingAmount: remainingPayment,
          fullyPaidFactorIds: fullyPaidIds,
          partiallyPaidFactorIds: partiallyPaidIds,
          unpaidFactorIds: finalUnpaid, // includes partially paid + untouched
        },
        affectedFactors,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};

// ==============================
// Get All Pays (Pagination) with Department
// ==============================
export const getAllPays = async (req, res) => {
  try {
    const { page = 1, limit = 20, seller, departmentId } = req.query;

    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const offset = (pageNumber - 1) * pageLimit;

    const where = {};
    if (seller) where.seller = seller;
    if (departmentId) where.departmentId = departmentId;

    const { rows, count } = await Pay.findAndCountAll({
      where,
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
      distinct: true,
      limit: pageLimit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      page: pageNumber,
      limit: pageLimit,
      totalRecords: count,
      totalPages: Math.ceil(count / pageLimit),
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};

// ==============================
// Get Single Pay with Department
// ==============================
export const getSinglePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
    });

    if (!pay) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: pay,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};

// ==============================
// Update Pay (allow departmentId update)
// ==============================
export const updatePay = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { seller, amount, description, departmentId } = req.body;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.update({
      seller: seller || pay.seller,
      departmentId: departmentId !== undefined ? departmentId : pay.departmentId,
      amount: amount || pay.amount,
      description: description || pay.description,
    }, { transaction });

    await transaction.commit();

    const updatedPay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Payment updated successfully",
      data: updatedPay,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: error.message,
    });
  }
};

// ==============================
// Delete Pay
// ==============================
export const deletePay = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await pay.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message,
    });
  }
};

// ==============================
// Get Pays by Date Range (with department filter)
// ==============================
export const getPaysByDateRange = async (req, res) => {
  const { from, to, sellerId, departmentId } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      message: "from and to dates are required",
    });
  }

  try {
    const startDate = new Date(`${from}T00:00:00`);
    const endDate = new Date(`${to}T23:59:59`);

    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (sellerId) whereClause.seller = sellerId;
    if (departmentId) whereClause.departmentId = departmentId;

    const pays = await Pay.findAll({
      where: whereClause,
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalAmount = pays.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return res.status(200).json({
      success: true,
      message: "Pays fetched successfully",
      data: {
        pays,
        totalCount: pays.length,
        totalAmount,
        filters: {
          from,
          to,
          sellerId: sellerId || null,
          departmentId: departmentId || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in getPaysByDateRange:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pays",
      error: error.message,
    });
  }
};

// ==============================
// Get Seller Payment Summary (with department breakdown)
// ==============================
export const getSellerPaymentSummary = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    // Get all payments for this seller with department info
    const payments = await Pay.findAll({
      where: { seller: sellerId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Seller,
          as: "paySeller",
          attributes: ["id", "fullname", "phoneNumber"],
        },
        {
          model: Department,
          as: "payDepartment",
          attributes: ["id", "name", "holding"],
        },
      ],
    });

    // Summary statistics
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const paymentCount = payments.length;
    const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0;
    const latestPayment = payments.length > 0 ? payments[0].createdAt : null;
    const firstPayment = payments.length > 0 ? payments[payments.length - 1].createdAt : null;

    // Department breakdown
    const departmentMap = {};
    payments.forEach(p => {
      const deptId = p.departmentId;
      if (deptId) {
        if (!departmentMap[deptId]) {
          departmentMap[deptId] = {
            departmentId: deptId,
            departmentName: p.payDepartment?.name || 'Unknown',
            total: 0,
            count: 0,
          };
        }
        departmentMap[deptId].total += parseFloat(p.amount || 0);
        departmentMap[deptId].count += 1;
      }
    });
    const departmentBreakdown = Object.values(departmentMap);

    res.json({
      success: true,
      data: {
        sellerId,
        summary: {
          totalPaid,
          paymentCount,
          averagePayment,
          latestPayment,
          firstPayment,
        },
        departmentBreakdown,
        payments,
      },
    });
  } catch (error) {
    console.error("Error in getSellerPaymentSummary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching seller payment summary",
      error: error.message,
    });
  }
};