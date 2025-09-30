// routes/wishlistRoutes.js - Backend API for Wishlist Management
import express from 'express';
import User from '../models/User.js';
import Dish from '../models/Dish.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/wishlist - Get user's wishlist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching wishlist for user:', userId);

    // Find user and populate wishlist with dish details
    const user = await User.findById(userId)
      .populate({
        path: 'wishlist',
        populate: {
          path: 'seller',
          select: 'businessName address businessDetails'
        }
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Format wishlist items with restaurant details
    const wishlistItems = (user.wishlist || []).map(dish => ({
      _id: dish._id,
      id: dish._id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      category: dish.category,
      type: dish.type,
      image: dish.image,
      rating: dish.rating,
      availability: dish.availability,
      isActive: dish.isActive,
      
      // Restaurant information
      restaurantName: dish.seller?.businessName || 'Restaurant',
      restaurant: dish.seller?.businessName || 'Restaurant',
      restaurantId: dish.seller?._id,
      
      // Location info
      address: dish.seller?.address,
      city: dish.seller?.address?.city || 'City',
      
      // Offer information
      offer: dish.offer,
      currentPrice: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date()
        ? `₹${Math.round(dish.price - (dish.price * dish.offer.discountPercentage / 100))}`
        : `₹${dish.price}`,
      
      // Formatted data
      formattedPrice: `₹${dish.price}`,
      ratingDisplay: dish.rating?.average > 0 ? dish.rating.average.toFixed(1) : 'New',
      
      // Additional display data
      deliveryTime: '25-30 min', // You can calculate this based on location
      distance: '1.2 km', // You can calculate this based on user and restaurant location
      
      // Metadata
      addedAt: user.wishlistAddedAt?.find(item => 
        item.dishId?.toString() === dish._id.toString()
      )?.addedAt || new Date()
    }));

    console.log(`Wishlist loaded: ${wishlistItems.length} items for user ${userId}`);

    res.json({
      success: true,
      items: wishlistItems,
      count: wishlistItems.length,
      message: 'Wishlist retrieved successfully'
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve wishlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/wishlist/add - Add dish to wishlist
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId } = req.body;

    console.log('Adding to wishlist - User:', userId, 'Dish:', dishId);

    // Validate input
    if (!dishId) {
      return res.status(400).json({
        success: false,
        error: 'Dish ID is required'
      });
    }

    // Validate dish ID format
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    // Check if dish exists and is available
    const dish = await Dish.findOne({
      _id: dishId,
      isActive: true
    }).populate('seller', 'businessName address businessDetails').lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found or not available'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize wishlist and wishlistAddedAt if they don't exist
    if (!user.wishlist) user.wishlist = [];
    if (!user.wishlistAddedAt) user.wishlistAddedAt = [];

    // Check if dish is already in wishlist
    const dishObjectId = new mongoose.Types.ObjectId(dishId);
    const isAlreadyInWishlist = user.wishlist.some(id => 
      id.toString() === dishObjectId.toString()
    );

    if (isAlreadyInWishlist) {
      return res.status(400).json({
        success: false,
        error: `${dish.name} is already in your wishlist`
      });
    }

    // Add dish to wishlist
    user.wishlist.push(dishObjectId);
    user.wishlistAddedAt.push({
      dishId: dishObjectId,
      addedAt: new Date()
    });

    await user.save();

    // Format the dish item for response
    const wishlistItem = {
      _id: dish._id,
      id: dish._id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      category: dish.category,
      type: dish.type,
      image: dish.image,
      rating: dish.rating,
      availability: dish.availability,
      isActive: dish.isActive,
      
      // Restaurant information
      restaurantName: dish.seller?.businessName || 'Restaurant',
      restaurant: dish.seller?.businessName || 'Restaurant',
      restaurantId: dish.seller?._id,
      
      // Location info
      address: dish.seller?.address,
      city: dish.seller?.address?.city || 'City',
      
      // Offer information
      offer: dish.offer,
      currentPrice: dish.offer?.hasOffer && new Date(dish.offer.validUntil) > new Date()
        ? `₹${Math.round(dish.price - (dish.price * dish.offer.discountPercentage / 100))}`
        : `₹${dish.price}`,
      
      // Formatted data
      formattedPrice: `₹${dish.price}`,
      ratingDisplay: dish.rating?.average > 0 ? dish.rating.average.toFixed(1) : 'New',
      
      // Additional display data
      deliveryTime: '25-30 min',
      distance: '1.2 km',
      
      // Metadata
      addedAt: new Date()
    };

    console.log(`Dish "${dish.name}" added to wishlist for user ${userId}`);

    res.json({
      success: true,
      message: `${dish.name} added to your wishlist`,
      item: wishlistItem,
      wishlistCount: user.wishlist.length
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to wishlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/wishlist/remove/:dishId - Remove dish from wishlist
router.delete('/remove/:dishId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId } = req.params;

    console.log('Removing from wishlist - User:', userId, 'Dish:', dishId);

    // Validate dish ID format
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Initialize wishlist if it doesn't exist
    if (!user.wishlist) user.wishlist = [];
    if (!user.wishlistAddedAt) user.wishlistAddedAt = [];

    // Check if dish is in wishlist
    const dishObjectId = new mongoose.Types.ObjectId(dishId);
    const dishIndex = user.wishlist.findIndex(id => 
      id.toString() === dishObjectId.toString()
    );

    if (dishIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in wishlist'
      });
    }

    // Get dish name for response
    let dishName = 'Item';
    try {
      const dish = await Dish.findById(dishId).select('name').lean();
      if (dish) dishName = dish.name;
    } catch (error) {
      console.warn('Could not fetch dish name for response:', error);
    }

    // Remove dish from wishlist
    user.wishlist.splice(dishIndex, 1);
    
    // Remove from wishlistAddedAt array
    user.wishlistAddedAt = user.wishlistAddedAt.filter(item =>
      item.dishId?.toString() !== dishObjectId.toString()
    );

    await user.save();

    console.log(`Dish "${dishName}" removed from wishlist for user ${userId}`);

    res.json({
      success: true,
      message: `${dishName} removed from your wishlist`,
      wishlistCount: user.wishlist.length
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from wishlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/wishlist/clear - Clear entire wishlist
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Clearing wishlist for user:', userId);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const previousCount = user.wishlist?.length || 0;

    // Clear wishlist
    user.wishlist = [];
    user.wishlistAddedAt = [];
    
    await user.save();

    console.log(`Wishlist cleared for user ${userId} - ${previousCount} items removed`);

    res.json({
      success: true,
      message: `Wishlist cleared successfully`,
      removedCount: previousCount,
      wishlistCount: 0
    });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear wishlist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/wishlist/check/:dishId - Check if dish is in wishlist
router.get('/check/:dishId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dishId } = req.params;

    // Validate dish ID format
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID format'
      });
    }

    // Find user
    const user = await User.findById(userId).select('wishlist').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if dish is in wishlist
    const dishObjectId = new mongoose.Types.ObjectId(dishId);
    const isInWishlist = (user.wishlist || []).some(id => 
      id.toString() === dishObjectId.toString()
    );

    res.json({
      success: true,
      isInWishlist,
      dishId
    });

  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check wishlist status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/wishlist/stats - Get wishlist statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .populate({
        path: 'wishlist',
        select: 'category type price'
      })
      .lean();

    if (!user || !user.wishlist) {
      return res.json({
        success: true,
        stats: {
          totalItems: 0,
          categories: {},
          types: { veg: 0, 'non-veg': 0 },
          averagePrice: 0
        }
      });
    }

    const wishlistItems = user.wishlist;
    const categories = {};
    const types = { veg: 0, 'non-veg': 0 };
    let totalPrice = 0;

    wishlistItems.forEach(item => {
      // Count categories
      categories[item.category] = (categories[item.category] || 0) + 1;
      
      // Count types
      types[item.type] = (types[item.type] || 0) + 1;
      
      // Sum prices
      totalPrice += item.price || 0;
    });

    const averagePrice = wishlistItems.length > 0 ? totalPrice / wishlistItems.length : 0;

    res.json({
      success: true,
      stats: {
        totalItems: wishlistItems.length,
        categories,
        types,
        averagePrice: Math.round(averagePrice)
      }
    });

  } catch (error) {
    console.error('Wishlist stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wishlist statistics'
    });
  }
});

export default router;