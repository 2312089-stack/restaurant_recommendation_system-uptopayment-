// controllers/reorderController.js
import OrderHistory from '../models/OrderHistory.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';

/**
 * GET /api/reorder/history
 * Fetches user's order history with unique dishes for reorder feature
 */
export const getReorderHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    console.log('📦 Fetching reorder history for user:', userId);

    // Get all delivered orders for the user
    const orderHistory = await OrderHistory.find({
      customerId: userId,
      currentStatus: 'delivered',
      isTemporary: false  // Only permanent (completed) orders
    })
    .sort({ createdAt: -1 })  // Most recent first
    .limit(50)  // Limit to last 50 orders
    .lean();

    if (!orderHistory || orderHistory.length === 0) {
      return res.json({
        success: true,
        dishes: [],
        message: 'No order history found'
      });
    }

    // Extract unique dish IDs
    const dishIds = [...new Set(
      orderHistory
        .map(order => order.snapshot?.dishId)
        .filter(Boolean)
    )];

    console.log(`Found ${dishIds.length} unique dishes from ${orderHistory.length} orders`);

    // Fetch dish details (only available dishes)
    const dishes = await Dish.find({
      _id: { $in: dishIds },
      isActive: true,
      availability: true
    })
    .populate('seller', 'businessName address')
    .lean();

    // Enrich dishes with order metadata
    const enrichedDishes = dishes.map(dish => {
      // Find the most recent order for this dish
      const lastOrder = orderHistory.find(
        order => order.snapshot?.dishId?.toString() === dish._id.toString()
      );

      // Count total orders for this dish
      const orderCount = orderHistory.filter(
        order => order.snapshot?.dishId?.toString() === dish._id.toString()
      ).length;

      return {
        ...dish,
        // Order metadata
        lastOrderedAt: lastOrder?.createdAt,
        lastOrderId: lastOrder?.orderId,
        totalOrders: orderCount,
        restaurantName: dish.seller?.businessName || lastOrder?.snapshot?.restaurantName || 'Restaurant',
        
        // Formatting
        formattedPrice: `₹${dish.price}`,
        lastOrderedText: getTimeAgo(lastOrder?.createdAt),
        
        // Availability check
        isAvailable: dish.availability && dish.isActive
      };
    });

    // Sort by most recently ordered
    enrichedDishes.sort((a, b) => 
      new Date(b.lastOrderedAt) - new Date(a.lastOrderedAt)
    );

    res.json({
      success: true,
      dishes: enrichedDishes,
      count: enrichedDishes.length,
      totalOrders: orderHistory.length
    });

  } catch (error) {
    console.error('❌ Get reorder history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reorder history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/reorder/add-to-cart
 * Adds a previously ordered dish to cart
 */
export const reorderDish = async (req, res) => {
  try {
    const { dishId, quantity = 1 } = req.body;
    const userId = req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!dishId || !mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    // Verify dish exists and is available
    const dish = await Dish.findOne({
      _id: dishId,
      isActive: true,
      availability: true
    }).populate('seller', 'businessName');

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not available for reorder',
        errorCode: 'DISH_UNAVAILABLE'
      });
    }

    // Verify user has previously ordered this dish
    const previousOrder = await OrderHistory.findOne({
      customerId: userId,
      'snapshot.dishId': dishId,
      currentStatus: 'delivered'
    });

    if (!previousOrder) {
      return res.status(403).json({
        success: false,
        error: 'You have not ordered this dish before',
        errorCode: 'NO_ORDER_HISTORY'
      });
    }

    console.log(`✅ Reorder validated for dish: ${dish.name}`);

    res.json({
      success: true,
      message: 'Dish verified for reorder',
      dish: {
        _id: dish._id,
        name: dish.name,
        price: dish.price,
        image: dish.image,
        restaurantName: dish.seller?.businessName,
        quantity
      }
    });

  } catch (error) {
    console.error('❌ Reorder dish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process reorder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/reorder/popular
 * Get most frequently ordered dishes by the user
 */
export const getPopularReorders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;
    const limit = parseInt(req.query.limit) || 6;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Aggregate to find most ordered dishes
    const popularDishes = await OrderHistory.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(userId),
          currentStatus: 'delivered',
          isTemporary: false
        }
      },
      {
        $group: {
          _id: '$snapshot.dishId',
          orderCount: { $sum: 1 },
          lastOrdered: { $max: '$createdAt' },
          restaurantName: { $first: '$snapshot.restaurantName' },
          totalSpent: { $sum: '$snapshot.totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: limit }
    ]);

    // Fetch full dish details
    const dishIds = popularDishes.map(d => d._id).filter(Boolean);
    const dishes = await Dish.find({
      _id: { $in: dishIds },
      isActive: true,
      availability: true
    }).lean();

    // Merge data
    const result = dishes.map(dish => {
      const stats = popularDishes.find(
        p => p._id?.toString() === dish._id.toString()
      );
      return {
        ...dish,
        orderCount: stats?.orderCount || 0,
        lastOrderedAt: stats?.lastOrdered,
        totalSpent: stats?.totalSpent || 0,
        lastOrderedText: getTimeAgo(stats?.lastOrdered)
      };
    });

    res.json({
      success: true,
      dishes: result,
      count: result.length
    });

  } catch (error) {
    console.error('❌ Get popular reorders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular reorders'
    });
  }
};

// Helper function to format time ago
function getTimeAgo(date) {
  if (!date) return 'Never';
  
  const now = new Date();
  const orderDate = new Date(date);
  const diffMs = now - orderDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default {
  getReorderHistory,
  reorderDish,
  getPopularReorders
};