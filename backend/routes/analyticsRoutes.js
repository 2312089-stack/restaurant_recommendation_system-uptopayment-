// backend/routes/analyticsRoutes.js
import express from 'express';
import { authenticateSeller } from '../middleware/authMiddleware.js';
import analyticsController from '../controllers/sellerAnalyticsController.js';

const router = express.Router();

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/seller/analytics
 * @desc    Get comprehensive analytics for seller dashboard
 * @query   range - Time range: 'week' | 'month' | 'year' (default: 'week')
 * @access  Private (Seller only)
 * @returns {Object} Analytics data including:
 *   - overview: Total revenue, orders, AOV, rating
 *   - revenue: Growth, AOV growth, daily data
 *   - orders: Status distribution, payment methods, hourly data
 *   - dishes: Top performing dishes
 *   - customers: Total, new, repeat customers
 *   - performance: Prep time, acceptance rate, cancellation rate
 *   - trends: Peak hours, top category, growth rate
 */
router.get('/', authenticateSeller, analyticsController.getAnalytics);

export default router;