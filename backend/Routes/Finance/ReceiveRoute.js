import express from 'express';
import {
  getAllReceives,
  getReceiveById,
  createReceive,
  updateReceive,
  deleteReceive,
} from '../../Controllers/Finance/ReceiveController.js';

const ReceiveRoute = express.Router();

// مسیرهای CRUD
ReceiveRoute.get('/', getAllReceives);           // GET /api/receives
ReceiveRoute.get('/:id', getReceiveById);        // GET /api/receives/:id
ReceiveRoute.post('/', createReceive);            // POST /api/receives
ReceiveRoute.put('/:id', updateReceive);          // PUT /api/receives/:id
ReceiveRoute.delete('/:id', deleteReceive);       // DELETE /api/receives/:id

export default ReceiveRoute;