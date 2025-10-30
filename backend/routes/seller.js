// routes/seller.js - COMPLETE WORKING VERSION
import express from 'express';
import { authenticateSeller } from '../middleware/authMiddleware.js';

// Import sub-route modules
import sellerAuthRoutes from './seller/auth.js';
import sellerOtpRoutes from './seller/otp.js';

// Import analytics controller
import analyticsController from '../controllers/sellerAnalyticsController.js';

// Import other seller controllers
import {
  addDish,
  getSellerDishes,
  updateDish,
  deleteDish,
  toggleAvailability,
  getDish,
  getDishAnalytics,
  updateDishOffer,
  uploadDishImage
} from '../controllers/sellerDishController.js';

import {
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  getSellerOrders,
  getOrderDetails,
  getOrderStats
} from '../controllers/sellerOrderController.js';

const router = express.Router();

// ==================== PUBLIC ROUTES (NO AUTH) ====================
// These routes don't require authentication
router.use('/auth', sellerAuthRoutes);
router.use('/otp', sellerOtpRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Seller routes are working',
    timestamp: new Date().toISOString()
  });
});

// ==================== PROTECTED ROUTES ====================
// All routes below require seller authentication

// ✅ CRITICAL: Analytics must come BEFORE any :id routes
router.get('/analytics', authenticateSeller, analyticsController.getAnalytics);

// ==================== MENU/DISH ROUTES ====================
router.get('/menu/dishes', authenticateSeller, getSellerDishes);
router.get('/menu/stats', authenticateSeller, getDishAnalytics);
router.post('/menu/dish', authenticateSeller, uploadDishImage, addDish);
router.get('/menu/dish/:dishId', authenticateSeller, getDish);
router.patch('/menu/dish/:dishId', authenticateSeller, uploadDishImage, updateDish);
router.delete('/menu/dish/:dishId', authenticateSeller, deleteDish);
router.patch('/menu/dish/:dishId/availability', authenticateSeller, toggleAvailability);
router.patch('/menu/dish/:dishId/offer', authenticateSeller, updateDishOffer);

// ==================== ORDER ROUTES ====================
router.get('/orders', authenticateSeller, getSellerOrders);
router.get('/orders/stats', authenticateSeller, getOrderStats);
router.get('/orders/:orderId', authenticateSeller, getOrderDetails);
router.post('/orders/:orderId/accept', authenticateSeller, acceptOrder);
router.post('/orders/:orderId/reject', authenticateSeller, rejectOrder);
router.patch('/orders/:orderId/status', authenticateSeller, updateOrderStatus);

// ==================== PROFILE ROUTES ====================
// These are handled by separate route files mounted in server.js
// If you want to include them here, import and add them

console.log('✅ Seller routes configured successfully');

export default router;