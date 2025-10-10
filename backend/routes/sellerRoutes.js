// backend/routes/sellerRoutes.js - COMPLETE FIXED VERSION
import express from 'express';
import { authenticateSeller } from '../middleware/authMiddleware.js';
import {
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderDetails,
  getOrderStats
} from '../controllers/sellerOrderController.js';
import {
  addDish,
  getSellerDishes,
  getDish,
  updateDish,
  deleteDish,
  toggleAvailability,
  getDishAnalytics,
  uploadDishImage
} from '../controllers/sellerDishController.js';
import {
  getSellerProfile,
  updateSellerProfile,
  uploadSellerDocuments
} from '../controllers/sellerProfileController.js';

const router = express.Router();

// ==================== ORDER MANAGEMENT ROUTES ====================
// ✅ NEW: Accept/Reject order with email notifications
router.post('/orders/:orderId/accept', authenticateSeller, acceptOrder);
router.post('/orders/:orderId/reject', authenticateSeller, rejectOrder);

// Other order routes
router.get('/orders', authenticateSeller, getSellerOrders);
router.get('/orders/stats', authenticateSeller, getOrderStats);
router.get('/orders/:orderId', authenticateSeller, getOrderDetails);
router.patch('/orders/:orderId/status', authenticateSeller, updateOrderStatus);
router.post('/orders/:orderId/cancel', authenticateSeller, cancelOrder);

// ==================== MENU MANAGEMENT ROUTES ====================
router.get('/menu/dishes', authenticateSeller, getSellerDishes);
router.get('/menu/dish/:dishId', authenticateSeller, getDish);
router.post('/menu/dish', authenticateSeller, uploadDishImage, addDish);
router.patch('/menu/dish/:dishId', authenticateSeller, uploadDishImage, updateDish);
router.delete('/menu/dish/:dishId', authenticateSeller, deleteDish);
router.get('/menu/stats', authenticateSeller, getDishAnalytics);
router.patch('/menu/dish/:dishId/toggle', authenticateSeller, toggleAvailability);
router.get('/menu/analytics', authenticateSeller, getDishAnalytics); // ← FIXED PATH
router.get('/menu/stats', authenticateSeller, getDishAnalytics); // Keep both for compatibility
// ==================== PROFILE MANAGEMENT ROUTES ====================
router.get('/profile', authenticateSeller, getSellerProfile);
router.patch('/profile', authenticateSeller, uploadSellerDocuments, updateSellerProfile);

export default router;