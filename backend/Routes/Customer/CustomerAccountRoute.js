import express from 'express';
import {
  createCustomerAccount,
  getCustomerAccounts,
  getCustomerAccountById,
  updateCustomerAccount,
  deleteCustomerAccount,
  getCustomersWithUnpaid,
  getCustomerSellsFromTotal,
  getCustomerOrderItemsByType,
  getCustomerOrderItemsByDateRange,
  getCustomerBenefits, // <-- Added
} from '../../Controllers/Customer/customerAccountController.js';

const CustomerAccountRoute = express.Router();

// --- Specific routes first ---
CustomerAccountRoute.get('/customer/:customerId/date_range', getCustomerOrderItemsByDateRange);
CustomerAccountRoute.get('/customer/:customerId/sells', getCustomerSellsFromTotal);
CustomerAccountRoute.get('/customer/:customerId/benefits', getCustomerBenefits); // <-- Added here

// CRUD routes
CustomerAccountRoute.post('/create', createCustomerAccount);
CustomerAccountRoute.get('/debt', getCustomersWithUnpaid);
CustomerAccountRoute.get('/', getCustomerAccounts);

// --- Generic/Dynamic routes last ---
CustomerAccountRoute.get('/:customerId/:type', getCustomerOrderItemsByType);
CustomerAccountRoute.get('/:id', getCustomerAccountById);
CustomerAccountRoute.put('/:id', updateCustomerAccount);
CustomerAccountRoute.delete('/:id', deleteCustomerAccount);

export default CustomerAccountRoute;