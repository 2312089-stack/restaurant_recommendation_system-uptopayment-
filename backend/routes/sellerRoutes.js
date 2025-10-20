// backend/routes/sellerRoutes.js - COMPLETE FIXED VERSION WITH OFFER ROUTE
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
  uploadDishImage,
  updateDishOffer // ← Make sure this is imported!
} from '../controllers/sellerDishController.js';
import {
  getSellerProfile,
  updateSellerProfile,
  uploadSellerDocuments
} from '../controllers/sellerProfileController.js';

const router = express.Router();

// ==================== ORDER MANAGEMENT ROUTES ====================
router.post('/orders/:orderId/accept', authenticateSeller, acceptOrder);
router.post('/orders/:orderId/reject', authenticateSeller, rejectOrder);
router.get('/orders', authenticateSeller, getSellerOrders);
router.get('/orders/stats', authenticateSeller, getOrderStats);
router.get('/orders/:orderId', authenticateSeller, getOrderDetails);
router.patch('/orders/:orderId/status', authenticateSeller, updateOrderStatus);
router.post('/orders/:orderId/cancel', authenticateSeller, cancelOrder);

// ==================== MENU MANAGEMENT ROUTES ====================
// ✅ CRITICAL: Offer route MUST be before the generic :dishId route!
router.patch('/menu/dish/:dishId/offer', authenticateSeller, updateDishOffer);

// Other dish routes
router.get('/menu/dishes', authenticateSeller, getSellerDishes);
router.get('/menu/dish/:dishId', authenticateSeller, getDish);
router.post('/menu/dish', authenticateSeller, uploadDishImage, addDish);
router.patch('/menu/dish/:dishId', authenticateSeller, uploadDishImage, updateDish);
router.delete('/menu/dish/:dishId', authenticateSeller, deleteDish);
router.patch('/menu/dish/:dishId/toggle', authenticateSeller, toggleAvailability);
router.get('/menu/stats', authenticateSeller, getDishAnalytics);
router.get('/menu/analytics', authenticateSeller, getDishAnalytics);

// ==================== PROFILE MANAGEMENT ROUTES ====================
router.get('/profile', authenticateSeller, getSellerProfile);
router.patch('/profile', authenticateSeller, uploadSellerDocuments, updateSellerProfile);

// ==================== DEBUG ROUTES ====================
// Test route without auth
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Seller routes are working',
    timestamp: new Date().toISOString()
  });
});

// Test route WITH auth to verify middleware
router.get('/test-auth', authenticateSeller, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    seller: {
      id: req.seller.id || req.seller._id,
      email: req.seller.email
    },
    timestamp: new Date().toISOString()
  });
});

// Test specific offer route
router.get('/menu/dish/:dishId/offer/test', authenticateSeller, async (req, res) => {
  try {
    const { dishId } = req.params;
    const sellerId = req.seller.id || req.seller._id;
    
    const dish = await Dish.findOne({
      _id: dishId,
      $or: [
        { seller: sellerId },
        { restaurantId: sellerId }
      ]
    });

    res.json({
      success: true,
      message: 'Offer route is accessible',
      dishFound: !!dish,
      dishName: dish?.name || 'N/A',
      currentOffer: dish?.offer || null,
      sellerId: sellerId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;