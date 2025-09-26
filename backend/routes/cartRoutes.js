// cartRoutes.js - ENHANCED DEBUG VERSION
import express from 'express';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart,
  getCartSummary,
  getCartCount
} from '../controllers/cartController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware for all cart routes
router.use((req, res, next) => {
  console.log('🛒 CART ROUTE HIT:', {
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    query: req.query,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    },
    timestamp: new Date().toISOString()
  });
  next();
});

// Apply authentication to all cart routes
router.use(authenticateToken);

// Debug middleware after authentication
router.use((req, res, next) => {
  console.log('🔐 CART AUTH SUCCESS:', {
    userId: req.user?.id,
    userEmail: req.user?.email,
    path: req.path
  });
  next();
});

// GET routes (specific routes first)
router.get('/count', (req, res, next) => {
  console.log('📊 GET /cart/count - Getting cart count');
  getCartCount(req, res, next);
});

router.get('/summary', (req, res, next) => {
  console.log('📋 GET /cart/summary - Getting cart summary');
  getCartSummary(req, res, next);
});

router.get('/', (req, res, next) => {
  console.log('🛒 GET /cart - Getting full cart');
  getCart(req, res, next);
});

// POST routes
router.post('/add', (req, res, next) => {
  console.log('➕ POST /cart/add - Adding to cart:', {
    dishId: req.body.dishId,
    quantity: req.body.quantity,
    specialInstructions: req.body.specialInstructions
  });
  addToCart(req, res, next);
});

// PUT routes
router.put('/item/:dishId', (req, res, next) => {
  console.log('🔄 PUT /cart/item/:dishId - Updating quantity:', {
    dishId: req.params.dishId,
    newQuantity: req.body.quantity
  });
  updateCartItem(req, res, next);
});

// DELETE routes
router.delete('/clear', (req, res, next) => {
  console.log('🗑️ DELETE /cart/clear - Clearing cart');
  clearCart(req, res, next);
});

router.delete('/item/:dishId', (req, res, next) => {
  console.log('❌ DELETE /cart/item/:dishId - Removing item:', {
    dishId: req.params.dishId
  });
  removeFromCart(req, res, next);
});

// Error handling middleware for cart routes
router.use((error, req, res, next) => {
  console.error('🚨 CART ROUTE ERROR:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  res.status(500).json({
    success: false,
    error: 'Cart operation failed',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;