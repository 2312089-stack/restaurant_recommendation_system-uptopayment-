// backend/routes/adminAnalyticsRoutes.js
import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getRevenueAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
  getRestaurantAnalytics,
  getSystemStats
} from '../controllers/adminAnalyticsController.js';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Analytics endpoints
router.get('/revenue', getRevenueAnalytics);
router.get('/users', getUserAnalytics);
router.get('/orders', getOrderAnalytics);
router.get('/restaurants', getRestaurantAnalytics);
router.get('/system-stats', getSystemStats);

export default router;

// ============================================================
// backend/server.js or app.js - ADD THIS TO YOUR MAIN FILE
// ============================================================

// Import the analytics routes
