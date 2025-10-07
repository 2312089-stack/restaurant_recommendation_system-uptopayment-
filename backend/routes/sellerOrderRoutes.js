// backend/routes/sellerOrderRoutes.js
import express from 'express';
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import {
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderDetails,
  getOrderStats
} from '../controllers/sellerOrderController.js';

const router = express.Router();

// ==================== ORDER STATISTICS ====================
// IMPORTANT: Stats route must come before :orderId routes to avoid conflicts
router.get('/stats', authenticateSellerToken, getOrderStats);

// ==================== ORDER LISTING ====================
// Get all orders with optional filters (status, date range, etc.)
router.get('/', authenticateSellerToken, getSellerOrders);

// ==================== ORDER DETAILS ====================
// Get specific order details by ID
router.get('/:orderId', authenticateSellerToken, getOrderDetails);

// ==================== ORDER ACTIONS ====================
// Accept an incoming order
router.post('/:orderId/accept', authenticateSellerToken, acceptOrder);

// Reject an incoming order
router.post('/:orderId/reject', authenticateSellerToken, rejectOrder);

// Update order status (preparing, ready, completed, etc.)
router.patch('/:orderId/status', authenticateSellerToken, updateOrderStatus);

// Cancel an order
router.post('/:orderId/cancel', authenticateSellerToken, cancelOrder);

export default router;