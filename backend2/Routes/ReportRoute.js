// routes/reportRoutes.js
import express from 'express';
import { getReports } from '../Controllers/ReportController.js';

const ReportRoute = express.Router();

// GET /api/reports – fetch financial reports with optional filters
ReportRoute.get('/', getReports);

export default ReportRoute;