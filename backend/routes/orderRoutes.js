// routes/orderRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createOrder, getCustomerOrders, getOrderById } from '../controllers/orderController.js';

const router = express.Router();

// ✅ Create order (pending_seller status)
router.post('/', authenticateToken, createOrder);

// Get customer order history
router.get('/history', authenticateToken, getCustomerOrders);

// Get single order
router.get('/:orderId', authenticateToken, getOrderById);

export default router;