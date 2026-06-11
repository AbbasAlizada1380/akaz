import { Pay, SellerAccount, sequelize, Factor } from "../../Models/index.js";
import { Seller } from "../../Models/index.js";
import { Op } from "sequelize";

export const createPay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { seller, amount, description } = req.body;

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

    // 1. Create the pay record (initial, will be updated with factor info later if needed)
    const pay = await Pay.create(
      {
        seller,
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
      // No account at all: just create with empty arrays and commit
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

    // 3. Get unpaid factor IDs and sort them (oldest first: by id or createdAt)
    let unpaidFactorIds = Array.isArray(sellerAccount.unpaid) ? [...sellerAccount.unpaid] : [];
    if (unpaidFactorIds.length === 0) {
      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: "Payment created successfully (no unpaid factors to process)",
        data: { pay, sellerAccount },
      });
    }

    // Fetch unpaid factors ordered by id (ascending = oldest first)
    const unpaidFactors = await Factor.findAll({
      where: {
        id: unpaidFactorIds,
        sellerId: seller,
        remainingAmount: { [Op.gt]: 0 }, // only those with remaining balance
      },
      order: [['id', 'ASC']], // oldest factor first
      transaction,
    });

    if (unpaidFactors.length === 0) {
      // All unpaid factors have zero remaining (inconsistent, fix by cleaning sellerAccount)
      await sellerAccount.update({ unpaid: [], paid: [...(sellerAccount.paid || []), ...unpaidFactorIds] }, { transaction });
      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: "Payment created but no factors with positive remaining (seller account cleaned)",
        data: { pay, sellerAccount },
      });
    }

    let remainingPayment = parseFloat(amount);
    const processedFactorIds = [];      // fully paid
    const remainingUnpaidFactorIds = []; // still unpaid (partial or untouched)

    // 4. Process factors one by one (oldest first)
    for (const factor of unpaidFactors) {
      if (remainingPayment <= 0) {
        // No more money left, keep this factor as unpaid
        remainingUnpaidFactorIds.push(factor.id);
        continue;
      }

      const factorRemaining = parseFloat(factor.remainingAmount) || 0;
      if (factorRemaining <= 0) {
        // Should not happen because of filter, but skip if zero
        processedFactorIds.push(factor.id);
        continue;
      }

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
        processedFactorIds.push(factor.id);
      } else {
        // Partial payment: reduce factor's remaining amount
        const paymentUsed = remainingPayment;
        const newPaidAmount = (parseFloat(factor.paidAmount) || 0) + paymentUsed;
        const newRemaining = factorRemaining - paymentUsed;

        await factor.update(
          {
            paidAmount: newPaidAmount,
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? "paid" : "partial", // partial -> remain >0
          },
          { transaction }
        );
        // This factor still has unpaid balance, keep it in unpaid array
        remainingUnpaidFactorIds.push(factor.id);
        remainingPayment = 0;
      }
    }

    // After the loop, any remaining unpaid factors that were not processed (e.g., due to filter)
    // are already in remainingUnpaidFactorIds? Actually we added all unpaidFactors either fully paid or kept.
    // Also need to add any factor IDs that existed in sellerAccount.unpaid but were not fetched because
    // they had remainingAmount=0 (should be moved to paid)
    const fetchedIds = unpaidFactors.map(f => f.id);
    const zeroRemainingIds = unpaidFactorIds.filter(id => !fetchedIds.includes(id));
    if (zeroRemainingIds.length > 0) {
      processedFactorIds.push(...zeroRemainingIds);
    }

    // 5. Update seller account arrays
    const currentPaid = Array.isArray(sellerAccount.paid) ? [...sellerAccount.paid] : [];
    const currentTotal = Array.isArray(sellerAccount.total) ? [...sellerAccount.total] : [];

    // Add newly fully paid factors to paid array (avoid duplicates)
    processedFactorIds.forEach(id => {
      if (!currentPaid.includes(id)) currentPaid.push(id);
    });

    // New unpaid array = partially paid factors + any untouched factors that we didn't reach
    // (remainingUnpaidFactorIds already contains partially paid factors, and any factors we didn't touch because payment ran out)
    // But we also need to include factors from unpaidFactors that were never processed (if payment exhausted earlier)
    // Actually we added all unpaidFactors: either into processedFactorIds or remainingUnpaidFactorIds.
    // So final unpaid = remainingUnpaidFactorIds.
    const newUnpaid = remainingUnpaidFactorIds;

    // Remove from paid if somehow appears in newUnpaid (should not happen)
    const finalPaid = currentPaid.filter(id => !newUnpaid.includes(id));

    await sellerAccount.update(
      {
        paid: finalPaid,
        unpaid: newUnpaid,
        // total remains unchanged
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch updated data for response
    const updatedSellerAccount = await SellerAccount.findOne({ where: { sellerId: seller } });
    const affectedFactors = await Factor.findAll({
      where: { id: [...processedFactorIds, ...remainingUnpaidFactorIds] },
    });

    res.status(201).json({
      success: true,
      message: "Payment created and applied to unpaid factors successfully",
      data: {
        pay,
        sellerAccount: updatedSellerAccount,
        paymentDistribution: {
          totalAmount: parseFloat(amount),
          appliedAmount: parseFloat(amount) - remainingPayment,
          remainingAmount: remainingPayment,
          fullyPaidFactorIds: processedFactorIds,
          partiallyPaidFactorIds: remainingUnpaidFactorIds.filter(id =>
            affectedFactors.find(f => f.id === id && parseFloat(f.remainingAmount) > 0)
          ),
          unpaidFactorIds: remainingUnpaidFactorIds,
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
// Get All Pays (Pagination)
// ==============================
export const getAllPays = async (req, res) => {
  try {
    const { page = 1, limit = 20, seller } = req.query;

    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const offset = (pageNumber - 1) * pageLimit;

    const where = {};
    if (seller) where.seller = seller;

    const { rows, count } = await Pay.findAndCountAll({
      where,
      include: [
        {
          model: Seller,
          as: "paySeller", // Fixed: changed from "sellerInfo" to "paySeller"
          attributes: ["id", "fullname", "phoneNumber"],
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
// Get Single Pay
// ==============================
export const getSinglePay = async (req, res) => {
  try {
    const { id } = req.params;

    const pay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "paySeller", // Fixed: changed from "sellerInfo" to "paySeller"
          attributes: ["id", "fullname", "phoneNumber"],
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
// Update Pay
// ==============================
export const updatePay = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { seller, amount, description } = req.body;

    const pay = await Pay.findByPk(id);

    if (!pay) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // If seller is being changed, we need to update seller account relationships
    if (seller && seller !== pay.seller) {
      // Remove payment from old seller's account logic would go here
      // This is complex and depends on your business rules
      // For now, we'll just update the payment
      console.warn(`Payment ${id} seller changed from ${pay.seller} to ${seller}`);
    }

    await pay.update({
      seller: seller || pay.seller,
      amount: amount || pay.amount,
      description: description || pay.description,
    }, { transaction });

    await transaction.commit();

    // Fetch updated payment with seller info
    const updatedPay = await Pay.findByPk(id, {
      include: [
        {
          model: Seller,
          as: "paySeller", // Fixed: changed from "sellerInfo" to "paySeller"
          attributes: ["id", "fullname", "phoneNumber"],
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

    // Remove payment reference from seller account if needed
    const sellerAccount = await SellerAccount.findOne({
      where: { sellerId: pay.seller },
      transaction,
    });

    if (sellerAccount) {
      // You might want to reverse the payment allocation to factors here
      // This is complex and depends on your business rules
      console.warn(`Payment ${id} deleted, but seller account ${sellerAccount.id} not updated automatically`);
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
// Get Pays by Date Range (with optional seller filter)
// ==============================
export const getPaysByDateRange = async (req, res) => {
  const { from, to, sellerId } = req.query;

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

    // Build where clause for Pay
    const whereClause = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Add seller filter if provided
    if (sellerId) {
      whereClause.seller = sellerId;
    }

    // Fetch pays with associated seller info
    const pays = await Pay.findAll({
      where: whereClause,
      include: [
        {
          model: Seller,
          as: "paySeller", // Fixed: changed from "sellerInfo" to "paySeller"
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Calculate total amount (sum of all pay amounts)
    const totalAmount = pays.reduce(
      (sum, p) => sum + parseFloat(p.amount || 0),
      0
    );

    // Return response
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
// Get Seller Payment Summary
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

    // Get all payments for this seller
    const payments = await Pay.findAll({
      where: { seller: sellerId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Seller,
          as: "paySeller", // Fixed: changed from "sellerInfo" to "paySeller"
          attributes: ["id", "fullname", "phoneNumber"],
        },
      ],
    });

    // Calculate summary statistics
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const paymentCount = payments.length;
    const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0;

    // Get latest payment date
    const latestPayment = payments.length > 0 ? payments[0].createdAt : null;
    const firstPayment = payments.length > 0 ? payments[payments.length - 1].createdAt : null;

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