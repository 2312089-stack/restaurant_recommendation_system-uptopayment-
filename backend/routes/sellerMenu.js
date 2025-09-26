// routes/sellerMenu.js - FIXED Menu management routes for sellers
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

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateSellerToken);

// Health check for menu routes
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

// Debug route for testing authentication
router.get('/test-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Seller auth working!',
    seller: {
      id: req.seller.id,
      email: req.seller.email,
      businessName: req.seller.businessName
    },
    timestamp: new Date().toISOString()
  });
});

// POST /api/seller/menu/dish - Add new dish with image upload
router.post('/dish', (req, res) => {
  console.log('📝 Adding new dish - seller:', req.seller.id);
  console.log('📦 Request headers:', {
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  uploadDishImage(req, res, (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message.includes('File size') ? 'File size too large. Maximum 5MB allowed.' :
               err.message.includes('file type') ? 'Only image files (JPEG, PNG, WebP) are allowed.' :
               err.message
      });
    }
    
    console.log('✅ File upload middleware passed');
    console.log('📁 Uploaded file:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file uploaded');
    
    addDish(req, res);
  });
});

// GET /api/seller/menu/dishes - Get all dishes for seller with filters
router.get('/dishes', getSellerDishes);

// GET /api/seller/menu/dish/:dishId - Get single dish
router.get('/dish/:dishId', getDish);

// PATCH /api/seller/menu/dish/:dishId - Update dish with optional image upload
router.patch('/dish/:dishId', (req, res) => {
  console.log('📝 Updating dish:', req.params.dishId, 'for seller:', req.seller.id);

  uploadDishImage(req, res, (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
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

// DELETE /api/seller/menu/dish/:dishId - Delete dish
router.delete('/dish/:dishId', deleteDish);

// PATCH /api/seller/menu/dish/:dishId/toggle - Toggle availability
router.patch('/dish/:dishId/toggle', toggleAvailability);

// GET /api/seller/menu/analytics - Get dish analytics
router.get('/analytics', getDishAnalytics);

// GET /api/seller/menu/categories - Get available categories
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
    const Dish = (await import('../models/Dish.js')).default;
    const mongoose = (await import('mongoose')).default;

    const sellerId = new mongoose.Types.ObjectId(req.seller.id);

    console.log('📊 Getting menu stats for seller:', sellerId);

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

    console.log('📊 Menu stats calculated:', result.overview);

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