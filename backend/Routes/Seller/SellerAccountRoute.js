import express from 'express';
import {
  createSellerAccount,
  getSellerAccounts,
  getSellerAccountById,
  updateSellerAccount,
  deleteSellerAccount,
  getSellersWithUnpaid,
  getSellerSellsFromTotal,
  getSellerSellsDateRange,
  getSellerSellsByType,
} from '../../Controllers/Seller/SellerAccountController.js';

const SellerAccountRoute = express.Router();

// CRUD
SellerAccountRoute.post('/create', createSellerAccount);

// Date range (must come BEFORE /:sellerId/:type)
SellerAccountRoute.get('/seller/:sellerId/date_range', getSellerSellsDateRange);

// ✅ NEW — what the frontend is actually calling
SellerAccountRoute.get('/seller/:sellerId/sells', getSellerSellsFromTotal);

// Keep the trailing-slash variant too if other code uses it
SellerAccountRoute.get('/seller/:sellerId/', getSellerSellsFromTotal);

// Type-based (all, paid, unpaid) — MUST be after the specific routes
SellerAccountRoute.get('/:sellerId/:type', getSellerSellsByType);

// unpaid (debt)
SellerAccountRoute.get('/debt', getSellersWithUnpaid);

// get all / one / update / delete
SellerAccountRoute.get('/', getSellerAccounts);
SellerAccountRoute.get('/:id', getSellerAccountById);
SellerAccountRoute.put('/:id', updateSellerAccount);
SellerAccountRoute.delete('/:id', deleteSellerAccount);

export default SellerAccountRoute;