import express from 'express';
import {
  getAllReceives,
  getReceiveById,
  createReceive,
  updateReceive,
  deleteReceive,
  getReceivesByDateRange,   // <-- Add this import
} from '../../Controllers/Finance/ReceiveController.js';

const ReceiveRoute = express.Router();

// New route: GET /api/receives/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD&customerId=optional
ReceiveRoute.get('/date_range', getReceivesByDateRange);

// Existing CRUD routes
ReceiveRoute.get('/', getAllReceives);           // GET /api/receives
ReceiveRoute.get('/:id', getReceiveById);        // GET /api/receives/:id
ReceiveRoute.post('/', createReceive);            // POST /api/receives
ReceiveRoute.put('/:id', updateReceive);          // PUT /api/receives/:id
ReceiveRoute.delete('/:id', deleteReceive);       // DELETE /api/receives/:id

export default ReceiveRoute;