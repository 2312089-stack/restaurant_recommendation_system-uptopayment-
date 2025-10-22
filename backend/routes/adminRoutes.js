// backend/routes/adminRoutes.js - IMPROVED VERSION WITH BETTER ERROR HANDLING
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
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

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

/**
 * Admin Login Route
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Admin login attempt:', {
      email,
      hasPassword: !!password,
      passwordLength: password?.length
    });

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Find admin user - use select('+passwordHash') to include passwordHash field
    const user = await User.findOne({ 
      emailId: email.toLowerCase().trim()
    }).select('+passwordHash');
    
    console.log('🔍 User lookup result:', {
      found: !!user,
      email: user?.emailId,
      role: user?.role,
      hasPasswordHash: !!user?.passwordHash,
      isActive: user?.isActive
    });

    // Check if user exists
    if (!user) {
      console.log('❌ User not found in database:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ User is not admin:', user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ Admin account is deactivated');
      return res.status(403).json({ 
        success: false, 
        error: 'Admin account is deactivated' 
      });
    }

    // Check if password hash exists
    if (!user.passwordHash) {
      console.log('❌ Admin has no password set');
      return res.status(500).json({ 
        success: false, 
        error: 'Account setup incomplete. Please contact support.' 
      });
    }

    // Verify password
    console.log('🔒 Comparing passwords...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    console.log('🔑 Password verification result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        userId: user._id.toString(),
        email: user.emailId,
        emailId: user.emailId,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Admin login successful:', {
      email: user.emailId,
      role: user.role,
      tokenGenerated: !!token
    });

    // Send response
    res.json({
      success: true,
      token,
      admin: {
        id: user._id,
        email: user.emailId,
        name: user.name,
        role: user.role
      },
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
 * Check Admin Status (for debugging)
 * GET /api/admin/check-user/:email
 */
router.get('/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ emailId: email });
    
    if (!user) {
      return res.json({
        success: false,
        message: 'User not found',
        email
      });
    }

    res.json({
      success: true,
      user: {
        email: user.emailId,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        hasPasswordHash: !!user.passwordHash,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PROTECTED ROUTES (AUTH + ADMIN REQUIRED) ====================
// All routes below require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.post('/users/:userId/block', blockUser);
router.post('/users/:userId/unblock', unblockUser);
router.delete('/users/:userId', deleteUser);

// Restaurant Management
router.get('/restaurants', getAllRestaurants);
router.post('/restaurants/:sellerId/approve', approveRestaurant);
router.post('/restaurants/:sellerId/reject', rejectRestaurant);
router.post('/restaurants/:sellerId/deactivate', deactivateRestaurant);

// Order Management
router.get('/orders', getAllOrders);

// Test Route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin authentication working',
    admin: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    },
    timestamp: new Date().toISOString()
  });
});

export default router;