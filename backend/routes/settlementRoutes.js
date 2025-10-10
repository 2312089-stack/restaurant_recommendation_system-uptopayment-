// routes/settlementRoutes.js
import express from 'express';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import { getSettlementDashboard, downloadSettlementReport } from '../controllers/settlementController.js';

const router = express.Router();

// Get settlement dashboard data (seller only)
router.get('/dashboard', authenticateSellerToken, getSettlementDashboard);

// Download settlement report (CSV) (seller only)
router.get('/report/download', authenticateSellerToken, downloadSettlementReport);

export default router;