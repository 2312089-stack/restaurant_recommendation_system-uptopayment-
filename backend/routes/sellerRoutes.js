// backend/routes/sellerRoutes.js - Add these order routes
import express from 'express';
import { authenticateSeller } from '../middleware/authMiddleware.js';
import {
  getSellerOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderDetails,
  getOrderStats
} from '../controllers/sellerOrderController.js';

const router = express.Router();

// ORDER MANAGEMENT ROUTES
router.get('/orders', authenticateSeller, getSellerOrders);
router.get('/orders/stats', authenticateSeller, getOrderStats);
router.get('/orders/:orderId', authenticateSeller, getOrderDetails);
router.patch('/orders/:orderId/status', authenticateSeller, updateOrderStatus);
router.post('/orders/:orderId/cancel', authenticateSeller, cancelOrder);

export default router;