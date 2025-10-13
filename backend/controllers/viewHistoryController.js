// controllers/viewHistoryController.js - COMPLETE FIXED VERSION
import ViewHistory from '../models/ViewHistory.js';
import User from '../models/User.js';
import Dish from '../models/Dish.js';
import mongoose from 'mongoose';

/**
 * Track a dish view
 * @route POST /api/view-history/track
 */
export const trackView = async (req, res) => {
  try {
    const { dishId, sessionId } = req.body;
    const userId = req.user?.id || null;

    console.log('📊 Tracking view:', { dishId, userId, sessionId });

    if (!dishId) {
      return res.status(400).json({
        success: false,
        error: 'Dish ID is required'
      });
    }

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Either authentication or session ID is required'
      });
    }

    // Validate and get dish
    const dish = await Dish.findById(dishId).lean();
    
    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    // Track view in ViewHistory model
    const viewData = {
      userId,
      dishId,
      sessionId,
      dishData: {
        name: dish.name,
        price: dish.price,
        image: dish.image,
        restaurantName: dish.restaurantName || dish.restaurant
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      city: dish.location?.city
    };

    await ViewHistory.trackView(viewData);

    // Also update user's recently viewed if logged in
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        await user.addToRecentlyViewed(dishId);
      }
    }

    // Increment dish view count
    await Dish.findByIdAndUpdate(dishId, {
      $inc: { viewCount: 1 }
    });

    console.log('✅ View tracked successfully');

    res.json({
      success: true,
      message: 'View tracked successfully'
    });

  } catch (error) {
    console.error('❌ Track view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track view',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's recently viewed dishes
 * @route GET /api/view-history/recently-viewed
 */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    console.log('📋 Getting recently viewed for user:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get from ViewHistory model
    const recentViews = await ViewHistory.getRecentlyViewedByUser(
      userId,
      parseInt(limit)
    );

    // Enrich with full dish data
    const dishesWithDetails = recentViews.map(view => ({
      ...view.dish,
      lastViewed: view.lastViewed,
      viewCount: view.viewCount,
      _id: view.dishId
    }));

    console.log(`✅ Found ${dishesWithDetails.length} recently viewed dishes`);

    res.json({
      success: true,
      dishes: dishesWithDetails,
      count: dishesWithDetails.length
    });

  } catch (error) {
    console.error('❌ Get recently viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recently viewed dishes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get most viewed dishes globally
 * @route GET /api/view-history/most-viewed
 */
export const getMostViewed = async (req, res) => {
  try {
    const {
      limit = 10,
      days = 7,
      city = ''
    } = req.query;

    console.log('👀 Getting most viewed dishes:', { limit, days, city });

    const options = {
      limit: parseInt(limit),
      days: parseInt(days),
      city: city || null
    };

    const mostViewed = await ViewHistory.getMostViewed(options);

    // Format response
    const dishesWithStats = mostViewed.map(item => ({
      ...item.dish,
      _id: item.dishId,
      viewStats: {
        totalViews: item.viewCount,
        uniqueViewers: item.uniqueViewers,
        lastViewed: item.lastViewed,
        period: `${days} days`
      }
    }));

    console.log(`✅ Found ${dishesWithStats.length} most viewed dishes`);

    res.json({
      success: true,
      dishes: dishesWithStats,
      stats: {
        totalDishes: dishesWithStats.length,
        period: `${days} days`,
        city: city || 'all cities'
      }
    });

  } catch (error) {
    console.error('❌ Get most viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch most viewed dishes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get view statistics for a dish
 * @route GET /api/view-history/dish/:dishId/stats
 */
export const getDishViewStats = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { days = 7 } = req.query;

    console.log('📊 Getting view stats for dish:', dishId);

    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [totalViews, uniqueViewers, recentViews] = await Promise.all([
      // Total views
      ViewHistory.countDocuments({
        dish: dishId,
        viewedAt: { $gte: startDate }
      }),
      
      // Unique viewers
      ViewHistory.aggregate([
        {
          $match: {
            dish: new mongoose.Types.ObjectId(dishId),
            viewedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            uniqueViewers: {
              $addToSet: { $ifNull: ['$user', '$sessionId'] }
            }
          }
        },
        {
          $project: {
            count: { $size: '$uniqueViewers' }
          }
        }
      ]),
      
      // Recent views timeline
      ViewHistory.aggregate([
        {
          $match: {
            dish: new mongoose.Types.ObjectId(dishId),
            viewedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$viewedAt'
              }
            },
            views: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    const stats = {
      totalViews,
      uniqueViewers: uniqueViewers[0]?.count || 0,
      period: `${days} days`,
      timeline: recentViews,
      averageViewsPerDay: Math.round(totalViews / parseInt(days))
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Get dish view stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clear user's recently viewed history
 * @route DELETE /api/view-history/recently-viewed
 */
export const clearRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.clearRecentlyViewed();

    res.json({
      success: true,
      message: 'Recently viewed history cleared'
    });

  } catch (error) {
    console.error('❌ Clear recently viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check view history system status
 * @route GET /api/view-history/status
 */
export const getViewHistoryStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.query.sessionId; // ✅ FIX: Use req.query for GET request

    console.log('🔍 Checking view history status for:', { userId, sessionId });

    // Get counts
    const [totalViews, userViews, recentViews] = await Promise.all([
      // Total views in system
      ViewHistory.countDocuments(),
      
      // User's views (if logged in)
      userId ? ViewHistory.countDocuments({ user: userId }) : 0,
      
      // Recent views (last 24 hours)
      ViewHistory.countDocuments({
        viewedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get user's recently viewed dishes
    let recentlyViewed = [];
    if (userId) {
      recentlyViewed = await ViewHistory.getRecentlyViewedByUser(userId, 5);
    } else if (sessionId) {
      recentlyViewed = await ViewHistory.find({ sessionId })
        .sort({ viewedAt: -1 })
        .limit(5)
        .select('dishName dishPrice viewedAt')
        .lean();
    }

    // Get most viewed dishes
    const mostViewed = await ViewHistory.getMostViewed({ limit: 5, days: 7 });

    const status = {
      success: true,
      isWorking: true,
      timestamp: new Date().toISOString(),
      systemStats: {
        totalViews,
        recentViews24h: recentViews,
        mostViewedCount: mostViewed.length
      },
      userStats: userId ? {
        userId,
        totalUserViews: userViews,
        recentlyViewedCount: recentlyViewed.length,
        hasHistory: userViews > 0
      } : sessionId ? {
        sessionId,
        recentlyViewedCount: recentlyViewed.length,
        hasHistory: recentlyViewed.length > 0
      } : null,
      samples: {
        recentlyViewed: recentlyViewed.slice(0, 3).map(v => ({
          dishName: v.dish?.name || v.dishName,
          viewedAt: v.lastViewed || v.viewedAt
        })),
        mostViewed: mostViewed.slice(0, 3).map(v => ({
          dishName: v.dish?.name || v.dishName,
          viewCount: v.viewCount
        }))
      },
      features: {
        trackingEnabled: true,
        recentlyViewedEnabled: true,
        mostViewedEnabled: true,
        guestTrackingEnabled: true
      }
    };

    console.log('✅ Status check result:', {
      totalViews,
      userViews,
      hasData: totalViews > 0
    });

    res.json(status);

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      isWorking: false,
      error: 'Failed to get status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Test view tracking (development only)
 * @route POST /api/view-history/test
 */
export const testViewTracking = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    });
  }

  try {
    const { dishId, dishName = 'Test Dish', dishPrice = 100 } = req.body;
    const userId = req.user?.id;
    const sessionId = req.body.sessionId || `test_${Date.now()}`;

    if (!dishId) {
      return res.status(400).json({
        success: false,
        error: 'dishId is required for testing'
      });
    }

    console.log('🧪 Testing view tracking:', { dishId, userId, sessionId });

    // Create test view
    const viewData = {
      userId: userId || null,
      dishId,
      sessionId: !userId ? sessionId : undefined,
      dishData: {
        name: dishName,
        price: dishPrice,
        image: '/test-image.jpg',
        restaurantName: 'Test Restaurant'
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    const result = await ViewHistory.trackView(viewData);

    res.json({
      success: true,
      message: 'Test view tracked successfully',
      view: {
        id: result._id,
        dishName: result.dishName,
        viewedAt: result.viewedAt,
        userId: result.user,
        sessionId: result.sessionId
      }
    });

  } catch (error) {
    console.error('❌ Test tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Test tracking failed',
      details: error.message
    });
  }
};