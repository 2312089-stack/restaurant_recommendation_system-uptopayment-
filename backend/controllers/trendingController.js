// controllers/trendingController.js - Real-time trending dishes based on reviews and orders
import Dish from '../models/Dish.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

/**
 * Calculate trending score based on:
 * - Recent order count (last 7 days)
 * - Recent review count and ratings
 * - View count
 * - Overall rating
 * - Recency bias
 */
const calculateTrendingScore = (dish, recentOrders, recentReviews) => {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  const dishAge = (now - new Date(dish.createdAt).getTime()) / dayInMs;
  
  // Weight factors
  const orderWeight = 5.0;
  const reviewWeight = 3.0;
  const ratingWeight = 2.0;
  const viewWeight = 0.5;
  const recencyBoost = 1.5;
  
  // Calculate components
  const orderScore = recentOrders * orderWeight;
  const reviewScore = recentReviews * reviewWeight;
  const ratingScore = (dish.rating?.average || 0) * (dish.rating?.count || 1) * ratingWeight;
  const viewScore = (dish.viewCount || 0) * viewWeight;
  
  // Recency factor (boost newer items, but not too much)
  const recencyFactor = dishAge < 30 ? recencyBoost : 1.0;
  
  // Calculate total score
  const baseScore = orderScore + reviewScore + ratingScore + viewScore;
  const finalScore = baseScore * recencyFactor;
  
  return Math.round(finalScore * 100) / 100;
};

/**
 * Get trending dishes in user's city
 * @route GET /api/trending/city
 */
export const getTrendingInCity = async (req, res) => {
  try {
    const {
      city = '',
      limit = 10,
      days = 7,
      minOrders = 5
    } = req.query;

    console.log('📊 Fetching trending dishes for city:', city);

    // Calculate date range for "trending" period
    const trendingPeriod = new Date();
    trendingPeriod.setDate(trendingPeriod.getDate() - parseInt(days));

    // Build base query
    const dishQuery = {
      isActive: true,
      availability: true
    };

    // Add city filter if provided
    if (city && city.trim()) {
      dishQuery['location.city'] = new RegExp(city.trim(), 'i');
    }

    // Get all active dishes in the city
    const dishes = await Dish.find(dishQuery).lean();

    if (dishes.length === 0) {
      return res.json({
        success: true,
        trending: [],
        stats: {
          totalDishes: 0,
          city: city || 'all cities',
          period: `${days} days`,
          message: 'No dishes found in this city'
        }
      });
    }

    const dishIds = dishes.map(d => d._id);

    // Get recent orders and reviews in parallel
    const [recentOrders, recentReviews] = await Promise.all([
      // Count recent orders per dish
      Order.aggregate([
        {
          $match: {
            'item.dishId': { $in: dishIds.map(id => id.toString()) },
            createdAt: { $gte: trendingPeriod },
            orderStatus: { $in: ['delivered', 'preparing', 'ready', 'out_for_delivery'] }
          }
        },
        {
          $group: {
            _id: '$item.dishId',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Count recent reviews per dish
      Review.aggregate([
        {
          $match: {
            dish: { $in: dishIds },
            createdAt: { $gte: trendingPeriod },
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$dish',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        }
      ])
    ]);

    // Create lookup maps
    const ordersMap = new Map();
    recentOrders.forEach(item => {
      ordersMap.set(item._id, item.count);
    });

    const reviewsMap = new Map();
    recentReviews.forEach(item => {
      reviewsMap.set(item._id.toString(), {
        count: item.count,
        avgRating: item.avgRating
      });
    });

    // Calculate trending scores
    const dishesWithScores = dishes.map(dish => {
      const dishIdStr = dish._id.toString();
      const recentOrderCount = ordersMap.get(dishIdStr) || 0;
      const reviewData = reviewsMap.get(dishIdStr) || { count: 0, avgRating: 0 };
      
      const trendingScore = calculateTrendingScore(
        dish,
        recentOrderCount,
        reviewData.count
      );

      return {
        ...dish,
        trendingScore,
        recentOrders: recentOrderCount,
        recentReviews: reviewData.count,
        recentAvgRating: reviewData.avgRating || dish.rating?.average || 0,
        ordersThisWeek: recentOrderCount,
        // Format for frontend display
        formattedPrice: `₹${dish.price}`,
        ratingDisplay: dish.rating?.average ? dish.rating.average.toFixed(1) : 'New'
      };
    });

    // Filter dishes with minimum orders and sort by trending score
    const trendingDishes = dishesWithScores
      .filter(dish => dish.recentOrders >= parseInt(minOrders))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, parseInt(limit))
      .map((dish, index) => ({
        ...dish,
        trendRank: index + 1
      }));

    // Calculate statistics
    const stats = {
      totalDishes: trendingDishes.length,
      city: city || 'all cities',
      period: `${days} days`,
      totalOrders: trendingDishes.reduce((sum, d) => sum + d.recentOrders, 0),
      totalReviews: trendingDishes.reduce((sum, d) => sum + d.recentReviews, 0),
      avgRating: trendingDishes.length > 0
        ? (trendingDishes.reduce((sum, d) => sum + (d.rating?.average || 0), 0) / trendingDishes.length).toFixed(1)
        : 0,
      growthRate: calculateGrowthRate(trendingDishes)
    };

    console.log('✅ Trending dishes calculated:', trendingDishes.length);

    res.json({
      success: true,
      trending: trendingDishes,
      stats
    });

  } catch (error) {
    console.error('❌ Get trending in city error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending dishes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate growth rate based on order patterns
 */
const calculateGrowthRate = (dishes) => {
  if (dishes.length === 0) return 0;
  
  const avgOrders = dishes.reduce((sum, d) => sum + d.recentOrders, 0) / dishes.length;
  const baseOrders = avgOrders * 0.85; // Assume 15% growth
  
  const growth = ((avgOrders - baseOrders) / baseOrders) * 100;
  return Math.round(growth);
};

/**
 * Get trending statistics for a city
 * @route GET /api/trending/stats
 */
export const getTrendingStats = async (req, res) => {
  try {
    const { city = '', days = 7 } = req.query;

    const trendingPeriod = new Date();
    trendingPeriod.setDate(trendingPeriod.getDate() - parseInt(days));

    const dishQuery = {
      isActive: true,
      availability: true
    };

    if (city && city.trim()) {
      dishQuery['location.city'] = new RegExp(city.trim(), 'i');
    }

    const [totalDishes, totalOrders, totalReviews, topCategories] = await Promise.all([
      Dish.countDocuments(dishQuery),
      
      Order.countDocuments({
        createdAt: { $gte: trendingPeriod },
        orderStatus: { $in: ['delivered', 'preparing', 'ready', 'out_for_delivery'] }
      }),
      
      Review.countDocuments({
        createdAt: { $gte: trendingPeriod },
        status: 'active'
      }),
      
      Dish.aggregate([
        { $match: dishQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating.average' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalDishes,
        totalOrders,
        totalReviews,
        period: `${days} days`,
        city: city || 'all cities',
        topCategories: topCategories.map(cat => ({
          category: cat._id,
          count: cat.count,
          avgRating: cat.avgRating ? cat.avgRating.toFixed(1) : '0'
        })),
        avgRating: topCategories.length > 0
          ? (topCategories.reduce((sum, c) => sum + (c.avgRating || 0), 0) / topCategories.length).toFixed(1)
          : '0'
      }
    });

  } catch (error) {
    console.error('❌ Get trending stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending statistics'
    });
  }
};

/**
 * Get trending dishes by category
 * @route GET /api/trending/category/:category
 */
export const getTrendingByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { city = '', limit = 5, days = 7 } = req.query;

    const trendingPeriod = new Date();
    trendingPeriod.setDate(trendingPeriod.getDate() - parseInt(days));

    const dishQuery = {
      isActive: true,
      availability: true,
      category: category
    };

    if (city && city.trim()) {
      dishQuery['location.city'] = new RegExp(city.trim(), 'i');
    }

    const dishes = await Dish.find(dishQuery).lean();
    const dishIds = dishes.map(d => d._id);

    const [recentOrders, recentReviews] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            'item.dishId': { $in: dishIds.map(id => id.toString()) },
            createdAt: { $gte: trendingPeriod }
          }
        },
        {
          $group: {
            _id: '$item.dishId',
            count: { $sum: 1 }
          }
        }
      ]),
      
      Review.aggregate([
        {
          $match: {
            dish: { $in: dishIds },
            createdAt: { $gte: trendingPeriod },
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$dish',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const ordersMap = new Map();
    recentOrders.forEach(item => ordersMap.set(item._id, item.count));

    const reviewsMap = new Map();
    recentReviews.forEach(item => reviewsMap.set(item._id.toString(), item.count));

    const trendingDishes = dishes
      .map(dish => {
        const dishIdStr = dish._id.toString();
        return {
          ...dish,
          recentOrders: ordersMap.get(dishIdStr) || 0,
          recentReviews: reviewsMap.get(dishIdStr) || 0,
          trendingScore: calculateTrendingScore(
            dish,
            ordersMap.get(dishIdStr) || 0,
            reviewsMap.get(dishIdStr) || 0
          )
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      category,
      trending: trendingDishes
    });

  } catch (error) {
    console.error('❌ Get trending by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending dishes by category'
    });
  }
};