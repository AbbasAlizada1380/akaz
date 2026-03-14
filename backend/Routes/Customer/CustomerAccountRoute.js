import express from 'express';
import {
  createCustomerAccount,
  getCustomerAccounts,
  getCustomerAccountById,
  updateCustomerAccount,
  deleteCustomerAccount,
  getCustomersWithUnpaid,
  getCustomerSellsFromTotal,
} from '../../Controllers/Customer/customerAccountController.js';

const CustomerAccountRoute = express.Router();

// CRUD routes
CustomerAccountRoute.post('/create', createCustomerAccount);
CustomerAccountRoute.get('/debt', getCustomersWithUnpaid);
CustomerAccountRoute.get('/customer/:customerId/sells', getCustomerSellsFromTotal );
CustomerAccountRoute.get('/', getCustomerAccounts);


CustomerAccountRoute.get('/:id', getCustomerAccountById);
CustomerAccountRoute.put('/:id', updateCustomerAccount);
CustomerAccountRoute.delete('/:id', deleteCustomerAccount);

export default CustomerAccountRoute;