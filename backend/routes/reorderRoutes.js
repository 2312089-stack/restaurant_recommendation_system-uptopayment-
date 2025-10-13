// routes/reorderRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getReorderHistory, reorderDish, getPopularReorders } from '../controllers/reorderController.js';

const router = express.Router();

// Get reorder history (unique dishes from order history)
router.get('/history', authenticateToken, getReorderHistory);

// Validate dish for reorder
router.post('/add-to-cart', authenticateToken, reorderDish);

// Get most popular reorders

export default router;