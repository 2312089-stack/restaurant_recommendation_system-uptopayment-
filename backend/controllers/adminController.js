// backend/controllers/adminController.js - COMPLETE ADMIN CONTROLLER
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import Review from '../models/Review.js';
import OrderHistory from '../models/OrderHistory.js';
import mongoose from 'mongoose';

// ==================== DASHBOARD ANALYTICS ====================

export const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching admin dashboard stats');

    const { period = 'week' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Parallel queries for performance
    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      revenueData,
      salesTrend,
      topRestaurants,
      recentOrders,
      userGrowth,
      restaurantGrowth
    ] = await Promise.all([
      // Total Users
      User.countDocuments({ role: { $ne: 'admin' } }),
      
      // Total Restaurants
      Seller.countDocuments({ isActive: true }),
      
      // Total Orders
      Order.countDocuments(),
      
      // Revenue Data
      Order.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: '$totalAmount' },
            completedOrders: { $sum: 1 }
          } 
        }
      ]),
      
      // Sales Trend (Last 7 days)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'completed'
          }
        },
        {
          $group: {
            _id: { 
              day: { $dayOfWeek: '$createdAt' },
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Top Performing Restaurants
      Order.aggregate([
        { $match: { paymentStatus: 'completed' } },
        {
          $group: {
            _id: '$seller',
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'sellers',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' }
      ]),
      
      // Recent Orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('seller', 'businessName')
        .lean(),
      
      // User Growth
      User.aggregate([
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
      ]),
      
      // Restaurant Growth
      Seller.aggregate([
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
      ])
    ]);

    // Format response
    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    
    // Format sales trend for frontend
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesOverview = salesTrend.map(item => ({
      day: dayNames[item._id.day - 1],
      revenue: Math.round(item.revenue * 100) / 100,
      orders: item.orders
    }));

    // Format top restaurants
    const topPerformingRestaurants = topRestaurants.map((item, index) => ({
      rank: index + 1,
      id: item._id,
      name: item.restaurant.businessName,
      revenue: Math.round(item.totalRevenue * 100) / 100,
      orders: item.orderCount,
      avgOrderValue: Math.round((item.totalRevenue / item.orderCount) * 100) / 100
    }));

    console.log('✅ Dashboard stats compiled successfully');

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalUsers,
          totalRestaurants,
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100
        },
        salesOverview,
        topPerformingRestaurants,
        recentOrders: recentOrders.map(order => ({
          orderId: order.orderId,
          customer: order.customerName,
          restaurant: order.seller?.businessName || 'N/A',
          amount: order.totalAmount,
          status: order.orderStatus,
          date: order.createdAt
        })),
        growth: {
          users: userGrowth,
          restaurants: restaurantGrowth
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== USER MANAGEMENT ====================

export const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '',
      status = '' 
    } = req.query;

    console.log('👥 Fetching all users - Page:', page);

    const query = { role: { $ne: 'admin' } };

    // Search filter
    if (search) {
      query.$or = [
        { emailId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'blocked') {
      query.isActive = false;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get order counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ 
          customerEmail: user.emailId 
        });
        
        const totalSpent = await Order.aggregate([
          { 
            $match: { 
              customerEmail: user.emailId,
              paymentStatus: 'completed'
            } 
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        return {
          ...user,
          orderCount,
          totalSpent: totalSpent[0]?.total || 0
        };
      })
    );

    console.log(`✅ Found ${total} users`);

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-passwordHash -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's orders
    const orders = await Order.find({ customerEmail: user.emailId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('seller', 'businessName')
      .lean();

    // Calculate stats
    const stats = await Order.aggregate([
      { $match: { customerEmail: user.emailId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      user: {
        ...user,
        orders,
        stats: stats[0] || {
          totalOrders: 0,
          totalSpent: 0,
          completedOrders: 0
        }
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        blockedAt: new Date(),
        blockReason: reason
      },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('🚫 User blocked:', user.emailId);

    res.json({
      success: true,
      message: 'User blocked successfully',
      user
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user'
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: true,
        blockedAt: null,
        blockReason: null
      },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User unblocked:', user.emailId);

    res.json({
      success: true,
      message: 'User unblocked successfully',
      user
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock user'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Soft delete - just deactivate
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('🗑️ User deleted:', user.emailId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// ==================== RESTAURANT MANAGEMENT ====================

export const getAllRestaurants = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      status = '',
      verified = ''
    } = req.query;

    console.log('🏪 Fetching all restaurants - Page:', page);

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Verified filter
    if (verified === 'true') {
      query.isVerified = true;
    } else if (verified === 'false') {
      query.isVerified = false;
    }

    const [restaurants, total] = await Promise.all([
      Seller.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Seller.countDocuments(query)
    ]);

    // Get stats for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const [orderCount, revenue, dishCount] = await Promise.all([
          Order.countDocuments({ seller: restaurant._id }),
          Order.aggregate([
            { 
              $match: { 
                seller: restaurant._id,
                paymentStatus: 'completed'
              } 
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ]),
          Dish.countDocuments({ seller: restaurant._id, isActive: true })
        ]);

        return {
          ...restaurant,
          stats: {
            orderCount,
            totalRevenue: revenue[0]?.total || 0,
            dishCount
          }
        };
      })
    );

    console.log(`✅ Found ${total} restaurants`);

    res.json({
      success: true,
      restaurants: restaurantsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRestaurants: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get all restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants'
    });
  }
};

export const approveRestaurant = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const seller = await Seller.findByIdAndUpdate(
      sellerId,
      { 
        isVerified: true,
        isActive: true,
        verifiedAt: new Date()
      },
      { new: true }
    ).select('-passwordHash');

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    console.log('✅ Restaurant approved:', seller.businessName);

    res.json({
      success: true,
      message: 'Restaurant approved successfully',
      restaurant: seller
    });

  } catch (error) {
    console.error('Approve restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve restaurant'
    });
  }
};

export const rejectRestaurant = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { reason } = req.body;

    const seller = await Seller.findByIdAndUpdate(
      sellerId,
      { 
        isVerified: false,
        isActive: false,
        rejectionReason: reason,
        rejectedAt: new Date()
      },
      { new: true }
    ).select('-passwordHash');

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    console.log('❌ Restaurant rejected:', seller.businessName);

    res.json({
      success: true,
      message: 'Restaurant rejected',
      restaurant: seller
    });

  } catch (error) {
    console.error('Reject restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject restaurant'
    });
  }
};

export const deactivateRestaurant = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { reason } = req.body;

    const seller = await Seller.findByIdAndUpdate(
      sellerId,
      { 
        isActive: false,
        deactivationReason: reason,
        deactivatedAt: new Date()
      },
      { new: true }
    ).select('-passwordHash');

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    console.log('🚫 Restaurant deactivated:', seller.businessName);

    res.json({
      success: true,
      message: 'Restaurant deactivated',
      restaurant: seller
    });

  } catch (error) {
    console.error('Deactivate restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate restaurant'
    });
  }
};

// ==================== ORDER MONITORING ====================

export const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '',
      paymentStatus = '',
      search = ''
    } = req.query;

    const query = {};

    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('seller', 'businessName')
        .populate('dish', 'name image')
        .lean(),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getDateRange(period) {
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
}