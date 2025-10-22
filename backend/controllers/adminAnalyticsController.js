// backend/controllers/adminAnalyticsController.js
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';

// ==================== REVENUE ANALYTICS ====================

export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    const dateFilter = getDateFilter(period, startDate, endDate);

    // Total revenue
    const revenueStats = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Revenue by day
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Revenue by restaurant
    const revenueByRestaurant = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$seller',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'sellers',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantName: '$restaurant.businessName',
          revenue: 1,
          orders: 1
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        summary: revenueStats[0] || {
          totalRevenue: 0,
          totalOrders: 0,
          avgOrderValue: 0
        },
        dailyRevenue,
        topRestaurants: revenueByRestaurant
      }
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics'
    });
  }
};

// ==================== USER ANALYTICS ====================

export const getUserAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: dateFilter,
          role: { $ne: 'admin' }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          newUsers: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Active users (users who placed orders)
    const activeUsers = await Order.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$customerEmail',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $group: {
          _id: null,
          activeUserCount: { $sum: 1 },
          avgOrdersPerUser: { $avg: '$orderCount' },
          avgSpentPerUser: { $avg: '$totalSpent' }
        }
      }
    ]);

    // User segmentation
    const userSegmentation = await User.aggregate([
      {
        $match: {
          role: { $ne: 'admin' }
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { userEmail: '$emailId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customerEmail', '$$userEmail'] },
                paymentStatus: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 }
              }
            }
          ],
          as: 'orderStats'
        }
      },
      {
        $addFields: {
          totalSpent: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalSpent', 0] }, 0] },
          orderCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.orderCount', 0] }, 0] }
        }
      },
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 100, 500, 1000, 5000, 999999],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgOrders: { $avg: '$orderCount' }
          }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        growth: userGrowth,
        activeUsers: activeUsers[0] || {
          activeUserCount: 0,
          avgOrdersPerUser: 0,
          avgSpentPerUser: 0
        },
        segmentation: userSegmentation
      }
    });

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
};

// ==================== ORDER ANALYTICS ====================

export const getOrderAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    // Order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Peak hours
    const peakHours = await Order.aggregate([
      {
        $match: {
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Average delivery time
    const avgDeliveryTime = await Order.aggregate([
      {
        $match: {
          orderStatus: 'delivered',
          createdAt: dateFilter
        }
      },
      {
        $project: {
          deliveryTime: {
            $subtract: ['$deliveredAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryTimeMs: { $avg: '$deliveryTime' }
        }
      }
    ]);

    // Payment method distribution
    const paymentMethods = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        orderStats,
        peakHours,
        avgDeliveryTime: avgDeliveryTime[0]?.avgDeliveryTimeMs 
          ? Math.round(avgDeliveryTime[0].avgDeliveryTimeMs / 60000) // Convert to minutes
          : 0,
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order analytics'
    });
  }
};

// ==================== RESTAURANT ANALYTICS ====================

export const getRestaurantAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    // Restaurant performance
    const restaurantPerformance = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: '$seller',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'sellers',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantName: '$restaurant.businessName',
          totalOrders: 1,
          totalRevenue: 1,
          avgOrderValue: 1,
          isVerified: '$restaurant.isVerified'
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);

    // Popular cuisines
    const popularCuisines = await Dish.aggregate([
      {
        $group: {
          _id: '$cuisine',
          dishCount: { $sum: 1 }
        }
      },
      { $sort: { dishCount: -1 } },
      { $limit: 10 }
    ]);

    // New restaurant signups
    const newRestaurants = await Seller.countDocuments({
      createdAt: dateFilter
    });

    res.json({
      success: true,
      analytics: {
        performance: restaurantPerformance,
        popularCuisines,
        newRestaurants
      }
    });

  } catch (error) {
    console.error('Restaurant analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant analytics'
    });
  }
};

// ==================== SYSTEM STATISTICS ====================

export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalDishes,
      activeOrders,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Seller.countDocuments(),
      Order.countDocuments(),
      Dish.countDocuments({ isActive: true }),
      Order.countDocuments({ 
        orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'out_for_delivery'] } 
      }),
      Seller.countDocuments({ isVerified: false })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalRestaurants,
        totalOrders,
        totalDishes,
        activeOrders,
        pendingVerifications
      }
    });

  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics'
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getDateFilter(period, startDate, endDate) {
  const now = new Date();
  let filter = {};

  if (startDate && endDate) {
    filter = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else {
    switch (period) {
      case 'today':
        filter = {
          $gte: new Date(now.setHours(0, 0, 0, 0))
        };
        break;
      case 'week':
        filter = {
          $gte: new Date(now.setDate(now.getDate() - 7))
        };
        break;
      case 'month':
        filter = {
          $gte: new Date(now.setMonth(now.getMonth() - 1))
        };
        break;
      case 'year':
        filter = {
          $gte: new Date(now.setFullYear(now.getFullYear() - 1))
        };
        break;
      default:
        filter = {
          $gte: new Date(now.setMonth(now.getMonth() - 1))
        };
    }
  }

  return filter;
}

export default {
  getRevenueAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
  getRestaurantAnalytics,
  getSystemStats
};