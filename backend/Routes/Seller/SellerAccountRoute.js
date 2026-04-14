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

// CRUD routes
SellerAccountRoute.post('/create', createSellerAccount);
SellerAccountRoute.get('/seller/:sellerId/date_range', getSellerSellsDateRange);

// Type-based reports (all, paid, unpaid)
SellerAccountRoute.get('/:sellerId/:type', getSellerSellsByType);
// unpaid (debt)
SellerAccountRoute.get('/debt', getSellersWithUnpaid);

// seller sells
SellerAccountRoute.get('/seller/:sellerId/', getSellerSellsFromTotal);

// get all
SellerAccountRoute.get('/', getSellerAccounts);

// get one
SellerAccountRoute.get('/:id', getSellerAccountById);

// update
SellerAccountRoute.put('/:id', updateSellerAccount);

// delete
SellerAccountRoute.delete('/:id', deleteSellerAccount);

export default SellerAccountRoute;