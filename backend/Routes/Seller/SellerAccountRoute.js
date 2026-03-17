import express from 'express';
import {
  createSellerAccount,
  getSellerAccounts,
  getSellerAccountById,
  updateSellerAccount,
  deleteSellerAccount,
  getSellersWithUnpaid,
  getSellerSellsFromTotal,
} from '../../Controllers/Seller/SellerAccountController.js';

const SellerAccountRoute = express.Router();

// CRUD routes
SellerAccountRoute.post('/create', createSellerAccount);

// unpaid (debt)
SellerAccountRoute.get('/debt', getSellersWithUnpaid);

// seller sells
SellerAccountRoute.get('/seller/:sellerId/sells', getSellerSellsFromTotal);

// get all
SellerAccountRoute.get('/', getSellerAccounts);

// get one
SellerAccountRoute.get('/:id', getSellerAccountById);

// update
SellerAccountRoute.put('/:id', updateSellerAccount);

// delete
SellerAccountRoute.delete('/:id', deleteSellerAccount);

export default SellerAccountRoute;