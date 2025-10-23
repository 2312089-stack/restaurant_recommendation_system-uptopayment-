// backend/controllers/adminAnalyticsController.js
import Order from '../models/Order.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';

// Helper function to get date range based on period
const getDateRange = (period) => {
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

// ==================== REVENUE ANALYTICS ====================
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    console.log('📊 Fetching revenue analytics for period:', period);

    // Revenue summary
    const summary = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
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

    // Daily revenue trend
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
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

    // Top restaurants by revenue
    const topRestaurants = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
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
          as: 'restaurantData'
        }
      },
      { $unwind: '$restaurantData' },
      {
        $project: {
          restaurantName: '$restaurantData.businessName',
          revenue: 1,
          orders: 1
        }
      }
    ]);

    // Payment method breakdown
    const paymentMethodBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    console.log('✅ Revenue analytics fetched successfully');

    res.json({
      success: true,
      analytics: {
        summary: summary[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
        dailyRevenue,
        topRestaurants,
        paymentMethodBreakdown
      }
    });

  } catch (error) {
    console.error('❌ Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== USER ANALYTICS ====================
export const getUserAnalytics = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    console.log('👥 Fetching user analytics for period:', period);

    // New users in period
    const newUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          role: { $ne: 'admin' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Active users (users who placed orders in the period)
    const activeUsers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$customerEmail'
        }
      },
      {
        $count: 'activeUserCount'
      }
    ]);

    // User retention (users who placed multiple orders)
    const returningUsers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$customerEmail',
          orderCount: { $sum: 1 }
        }
      },
      {
        $match: { orderCount: { $gt: 1 } }
      },
      {
        $count: 'returningUserCount'
      }
    ]);

    // User distribution by order count
    const userDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$customerEmail',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $bucket: {
          groupBy: '$totalOrders',
          boundaries: [1, 2, 5, 10, 20, 50],
          default: '50+',
          output: {
            count: { $sum: 1 },
            avgSpent: { $avg: '$totalSpent' }
          }
        }
      }
    ]);

    console.log('✅ User analytics fetched successfully');

    res.json({
      success: true,
      analytics: {
        newUsers,
        activeUsers: activeUsers[0] || { activeUserCount: 0 },
        returningUsers: returningUsers[0] || { returningUserCount: 0 },
        userDistribution
      }
    });

  } catch (error) {
    console.error('❌ User analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== ORDER ANALYTICS ====================
export const getOrderAnalytics = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    console.log('📦 Fetching order analytics for period:', period);

    // Order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Orders by time of day
    const ordersByHour = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Average delivery time
    const deliveryTimeStats = await Order.aggregate([
      {
        $match: {
          orderStatus: 'delivered',
          createdAt: { $gte: startDate, $lte: endDate },
          deliveredAt: { $exists: true }
        }
      },
      {
        $project: {
          deliveryTimeMinutes: {
            $divide: [
              { $subtract: ['$deliveredAt', '$createdAt'] },
              60000
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryTime: { $avg: '$deliveryTimeMinutes' },
          minDeliveryTime: { $min: '$deliveryTimeMinutes' },
          maxDeliveryTime: { $max: '$deliveryTimeMinutes' }
        }
      }
    ]);

    // Cancellation rate
    const cancellationStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          totalOrders: 1,
          cancelledOrders: 1,
          cancellationRate: {
            $multiply: [
              { $divide: ['$cancelledOrders', '$totalOrders'] },
              100
            ]
          }
        }
      }
    ]);

    console.log('✅ Order analytics fetched successfully');

    res.json({
      success: true,
      analytics: {
        orderStatusBreakdown,
        ordersByHour,
        deliveryTimeStats: deliveryTimeStats[0] || { avgDeliveryTime: 0 },
        cancellationStats: cancellationStats[0] || { totalOrders: 0, cancelledOrders: 0, cancellationRate: 0 }
      }
    });

  } catch (error) {
    console.error('❌ Order analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== RESTAURANT ANALYTICS ====================
export const getRestaurantAnalytics = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    console.log('🏪 Fetching restaurant analytics for period:', period);

    // Restaurant performance
    const restaurantPerformance = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'completed'
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
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 },
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
          avgOrderValue: 1
        }
      }
    ]);

    // New restaurant registrations
    const newRestaurants = await Seller.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Verification status
    const verificationStatus = await Seller.aggregate([
      {
        $group: {
          _id: '$isVerified',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('✅ Restaurant analytics fetched successfully');

    res.json({
      success: true,
      analytics: {
        restaurantPerformance,
        newRestaurants,
        verificationStatus
      }
    });

  } catch (error) {
    console.error('❌ Restaurant analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== SYSTEM STATS ====================
export const getSystemStats = async (req, res) => {
  try {
    console.log('⚙️ Fetching system stats');

    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalDishes,
      activeOrders,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Seller.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Dish.countDocuments({ isActive: true }),
      Order.countDocuments({ 
        orderStatus: { 
          $in: ['pending', 'seller_accepted', 'preparing', 'out_for_delivery'] 
        } 
      }),
      Seller.countDocuments({ isVerified: false, isActive: true })
    ]);

    console.log('✅ System stats fetched successfully');

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
    console.error('❌ System stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};