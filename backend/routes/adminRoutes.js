// backend/routes/adminRoutes.js - SECURE VERSION
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Seller from '../models/Seller.js';
import Dish from '../models/Dish.js';
import {
  checkIPWhitelist,
  loginRateLimiter,
  adminApiRateLimiter,
  authenticateAdmin,
  logAdminActivity,
  adminSecurityHeaders,
  createAdminSession,
  invalidateAdminSession,
  validateAdminPassword
} from '../middleware/adminSecurity.js';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  blockUser,
  unblockUser,
  deleteUser,
  getAllRestaurants,
  approveRestaurant,
  rejectRestaurant,
  deactivateRestaurant,
  getAllOrders
} from '../controllers/adminController.js';

const router = express.Router();

// ==================== APPLY GLOBAL SECURITY ====================
// Apply security headers to all admin routes
router.use(adminSecurityHeaders);

// Check IP whitelist (if configured)
router.use(checkIPWhitelist);

// ==================== PUBLIC ROUTES (with rate limiting) ====================

/**
 * Admin Login - HIGHLY SECURED
 * POST /api/admin/login
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Admin login attempt:', { email, ip: req.ip });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Get user with password
    const user = await User.findByEmailWithPassword(email);

    if (!user) {
      console.log('❌ User not found:', email);
      // Generic error message to prevent user enumeration
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ User is not admin. Role:', user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ Admin account is deactivated');
      return res.status(403).json({ 
        success: false, 
        error: 'Account is deactivated. Contact system administrator.' 
      });
    }

    // Check if password exists
    if (!user.passwordHash) {
      console.log('❌ Admin has no password set');
      return res.status(500).json({ 
        success: false, 
        error: 'Account setup incomplete. Contact system administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0; // Reset failed attempts
    await user.save();

    // Generate JWT token with shorter expiry for admins
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        userId: user._id.toString(),
        email: user.emailId,
        role: user.role,
        type: 'admin' // Explicitly mark as admin token
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Shorter session for admins
    );

    // Create admin session
    const sessionId = createAdminSession(user._id.toString(), token, req);

    console.log('✅ Admin login successful:', {
      email: user.emailId,
      sessionId,
      ip: req.ip
    });

    res.json({
      success: true,
      token,
      sessionId,
      admin: {
        id: user._id,
        email: user.emailId,
        name: user.name,
        role: user.role
      },
      expiresIn: '8h',
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Admin Logout
 * POST /api/admin/logout
 */
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    // Invalidate admin session
    invalidateAdminSession(req.admin.id);

    console.log('🚪 Admin logged out:', req.admin.email);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * Change Admin Password
 * POST /api/admin/change-password
 */
router.post('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    // Validate password strength
    const validation = validateAdminPassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        requirements: validation.errors
      });
    }

    // Get admin with password
    const admin = await User.findByEmailWithPassword(req.admin.email);

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Set new password
    await admin.setPassword(newPassword);
    await admin.save();

    // Invalidate all existing sessions (force re-login)
    invalidateAdminSession(admin._id.toString());

    console.log('🔑 Admin password changed:', admin.emailId);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// ==================== PROTECTED ROUTES ====================
// Apply admin authentication and rate limiting to all routes below
router.use(authenticateAdmin);
router.use(adminApiRateLimiter);
router.use(logAdminActivity);

// ==================== ADMIN VERIFICATION ====================

/**
 * Verify admin token and session
 * GET /api/admin/verify
 */
router.get('/verify', (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role
    },
    message: 'Admin verified'
  });
});

/**
 * Test endpoint
 * GET /api/admin/test
 */
router.get('/test', (req, res) => {
  console.log('✅ Admin test endpoint accessed');
  res.json({
    success: true,
    message: 'Admin authentication working perfectly!',
    admin: req.admin,
    timestamp: new Date().toISOString()
  });
});

// ==================== DASHBOARD ====================
router.get('/dashboard', getDashboardStats);

// ==================== ANALYTICS ROUTES ====================

// Revenue Analytics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    const [summary, dailyRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: dateFilter, paymentStatus: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: dateFilter, paymentStatus: 'completed' } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        summary: summary[0] || { 
          totalRevenue: 0, 
          totalOrders: 0,
          avgOrderValue: 0
        },
        dailyRevenue: dailyRevenue || []
      }
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch revenue analytics' 
    });
  }
});

// User Analytics
router.get('/analytics/users', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    const [activeUsers, newUsers, userGrowth] = await Promise.all([
      User.aggregate([
        { $match: { role: { $in: ['customer', 'user'] } } },
        {
          $group: {
            _id: null,
            activeUserCount: { $sum: { $cond: ['$isActive', 1, 0] } },
            totalUsers: { $sum: 1 }
          }
        }
      ]),
      User.countDocuments({
        role: { $in: ['customer', 'user'] },
        createdAt: dateFilter
      }),
      User.aggregate([
        {
          $match: {
            role: { $in: ['customer', 'user'] },
            createdAt: dateFilter
          }
        },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        activeUsers: activeUsers[0] || { activeUserCount: 0, totalUsers: 0 },
        newUsers,
        userGrowth
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user analytics' 
    });
  }
});

// Order Analytics
router.get('/analytics/orders', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    const [ordersByStatus, orderTrend] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        ordersByStatus,
        orderTrend
      }
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch order analytics' 
    });
  }
});

// Restaurant Analytics
router.get('/analytics/restaurants', async (req, res) => {
  try {
    const [restaurantStats, topRestaurants] = await Promise.all([
      Seller.aggregate([
        {
          $group: {
            _id: null,
            totalRestaurants: { $sum: 1 },
            verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
            active: { $sum: { $cond: ['$isActive', 1, 0] } }
          }
        }
      ]),
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
        { $limit: 10 },
        {
          $lookup: {
            from: 'sellers',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurantInfo'
          }
        },
        { $unwind: '$restaurantInfo' }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        ...(restaurantStats[0] || { 
          totalRestaurants: 0, 
          verified: 0, 
          active: 0 
        }),
        topRestaurants
      }
    });
  } catch (error) {
    console.error('Restaurant analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch restaurant analytics' 
    });
  }
});

// System Stats
router.get('/analytics/system-stats', async (req, res) => {
  try {
    const [users, restaurants, orders, dishes, activeOrders] = await Promise.all([
      User.countDocuments({ role: { $in: ['customer', 'user'] } }),
      Seller.countDocuments(),
      Order.countDocuments(),
      Dish.countDocuments(),
      Order.countDocuments({
        orderStatus: { $nin: ['delivered', 'cancelled'] }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: users,
        totalRestaurants: restaurants,
        totalOrders: orders,
        activeOrders,
        totalDishes: dishes
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch system stats' 
    });
  }
});

// ==================== USER MANAGEMENT ====================
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.post('/users/:userId/block', blockUser);
router.post('/users/:userId/unblock', unblockUser);
router.delete('/users/:userId', deleteUser);

// ==================== RESTAURANT MANAGEMENT ====================
router.get('/restaurants', getAllRestaurants);
router.post('/restaurants/:sellerId/approve', approveRestaurant);
router.post('/restaurants/:sellerId/reject', rejectRestaurant);
router.post('/restaurants/:sellerId/deactivate', deactivateRestaurant);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', getAllOrders);

// ==================== HELPER FUNCTIONS ====================
function getDateFilter(period) {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);

  return { $gte: startDate, $lte: now };
}

export default router;