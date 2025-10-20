// routes/sellerMenu.js - FIXED: Corrected authentication middleware usage
import express from 'express';
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
import { authenticateSellerToken } from '../middleware/sellerAuth.js';
import Dish from '../models/Dish.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSellerToken);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Seller menu routes are working',
    timestamp: new Date().toISOString(),
    seller: {
      id: req.seller.id,
      email: req.seller.email
    }
  });
});

// POST /api/seller/menu/dish - Add new dish
router.post('/dish', (req, res) => {
  uploadDishImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message.includes('File size') ? 'File size too large. Maximum 5MB allowed.' :
               err.message.includes('file type') ? 'Only image files (JPEG, PNG, WebP) are allowed.' :
               err.message
      });
    }
    addDish(req, res);
  });
});

// GET /api/seller/menu/dishes - Get all dishes
router.get('/dishes', getSellerDishes);

// GET /api/seller/menu/dish/:dishId - Get single dish
router.get('/dish/:dishId', getDish);

// PATCH /api/seller/menu/dish/:dishId - Update dish
router.patch('/dish/:dishId', (req, res) => {
  uploadDishImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message.includes('File size') ? 'File size too large. Maximum 5MB allowed.' :
               err.message.includes('file type') ? 'Only image files (JPEG, PNG, WebP) are allowed.' :
               err.message
      });
    }
    updateDish(req, res);
  });
});

// ✅ PATCH /api/seller/menu/dish/:dishId/offer - Update dish offer
// FIXED: Using authenticateSellerToken (already applied globally above)
router.patch('/dish/:dishId/offer', async (req, res) => {
  try {
    console.log('\n🎯 ========== BACKEND: UPDATE OFFER ==========');
    console.log('Dish ID:', req.params.dishId);
    console.log('Seller ID:', req.seller.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { hasOffer, discountPercentage, validUntil } = req.body;

    // Validate dish ownership
    const dish = await Dish.findOne({
      _id: req.params.dishId,
      seller: req.seller.id
    });

    if (!dish) {
      console.error('❌ Dish not found or unauthorized');
      return res.status(404).json({
        success: false,
        error: 'Dish not found or you do not have permission to modify it'
      });
    }

    console.log('✅ Dish found:', dish.name);

    // Update offer
    dish.offer = {
      hasOffer: hasOffer || false,
      discountPercentage: hasOffer ? (discountPercentage || 0) : 0,
      validUntil: hasOffer && validUntil ? new Date(validUntil) : null
    };

    await dish.save();

    console.log('✅ Offer updated successfully');
    console.log('Updated offer:', JSON.stringify(dish.offer, null, 2));
    console.log('🎯 ========== BACKEND: UPDATE COMPLETE ==========\n');

    res.json({
      success: true,
      message: hasOffer ? 'Offer activated successfully' : 'Offer removed successfully',
      dish: dish
    });

  } catch (error) {
    console.error('❌ Update offer error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to update offer',
      details: error.message
    });
  }
});

// DELETE /api/seller/menu/dish/:dishId - Delete dish
router.delete('/dish/:dishId', deleteDish);

// PATCH /api/seller/menu/dish/:dishId/toggle - Toggle availability
router.patch('/dish/:dishId/toggle', toggleAvailability);

// GET /api/seller/menu/analytics - Get analytics
router.get('/analytics', getDishAnalytics);

// GET /api/seller/menu/categories - Get categories
router.get('/categories', (req, res) => {
  const categories = [
    'Starters',
    'Main Course', 
    'Desserts',
    'Beverages',
    'Chinese',
    'Indian',
    'Continental',
    'South Indian'
  ];

  res.json({
    success: true,
    categories: categories
  });
});

// GET /api/seller/menu/stats - Get menu statistics
router.get('/stats', async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default;

    const sellerId = new mongoose.Types.ObjectId(req.seller.id);

    const stats = await Dish.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: null,
          totalDishes: { $sum: 1 },
          activeDishes: {
            $sum: { $cond: [{ $and: [{ $eq: ['$availability', true] }, { $eq: ['$isActive', true] }] }, 1, 0] }
          },
          totalOrders: { $sum: '$orderCount' },
          totalViews: { $sum: '$viewCount' },
          averageRating: { $avg: '$rating.average' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    const categoryStats = await Dish.aggregate([
      { $match: { seller: sellerId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalOrders: { $sum: '$orderCount' },
          avgRating: { $avg: '$rating.average' },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    const result = {
      overview: stats[0] || {
        totalDishes: 0,
        activeDishes: 0,
        totalOrders: 0,
        totalViews: 0,
        averageRating: 0,
        averagePrice: 0
      },
      categoryBreakdown: categoryStats
    };

    res.json({
      success: true,
      message: 'Menu statistics retrieved successfully',
      stats: result
    });

  } catch (error) {
    console.error('Get menu stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get menu statistics'
    });
  }
});

export default router;