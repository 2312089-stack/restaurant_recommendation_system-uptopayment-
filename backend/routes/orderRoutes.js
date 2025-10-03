// routes/orderRoutes.js
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createOrder } from '../controllers/orderController.js';

router.post('/create', authenticateToken, createOrder);