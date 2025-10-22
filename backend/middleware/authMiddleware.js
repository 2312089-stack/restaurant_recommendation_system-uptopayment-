// middleware/authMiddleware.js - COMPLETE FIXED VERSION
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ============================================================
// EXISTING FUNCTION - Keep this as is
// ============================================================
export const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware called');
    console.log('Request URL:', req.method, req.originalUrl);
    console.log('🔐 Auth middleware - Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      authLength: req.headers.authorization?.length,
      xAccessToken: req.headers['x-access-token'] ? 'Present' : 'Missing'
    });
    let token = null;

    // Extract token from headers
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('✅ Token found in Authorization header');
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
      console.log('✅ Token found in x-access-token header');
    } else if (req.headers.token) {
      token = req.headers.token;
      console.log('✅ Token found in token header');
    }

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    token = token.trim();
    console.log('🔍 Verifying JWT token...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', {
      id: decoded.id,
      userId: decoded.userId,
      email: decoded.email || decoded.emailId,
      phone: decoded.phone || decoded.phoneNumber || decoded.mobileNumber
    });

    // Extract user ID
    const userId = decoded.id || decoded.userId || decoded.user?.id || decoded._id;

    if (!userId) {
      console.log('❌ No user ID in token payload');
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload - no user ID',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    // Lookup user in database
    console.log('👤 Looking up user in database:', userId);
    const user = await User.findById(userId).select('-passwordHash');

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('✅ User found in database:', {
      id: user._id,
      emailId: user.emailId,
      hasPhone: !!user.phone || !!user.phoneNumber || !!user.mobileNumber
    });

    // Comprehensive field mapping
    req.user = {
      // ID fields
      id: user._id.toString(),
      userId: user._id.toString(),
      _id: user._id.toString(),
      
      // Email fields - map ALL possible variations
      email: user.emailId || user.email || decoded.email || decoded.emailId,
      emailId: user.emailId || user.email || decoded.email || decoded.emailId,
      
      // Phone fields - map ALL possible variations
      phone: user.phone || user.phoneNumber || user.mobileNumber || decoded.phone || decoded.phoneNumber,
      phoneNumber: user.phone || user.phoneNumber || user.mobileNumber || decoded.phoneNumber,
      mobileNumber: user.phone || user.phoneNumber || user.mobileNumber,
      
      // Name fields
      name: user.name || user.fullName || decoded.name,
      fullName: user.fullName || user.name || decoded.name,
      
      // Other fields
      role: user.role,
      preferences: user.preferences,
      onboardingCompleted: user.onboardingCompleted,
      
      // Full user object for additional access
      user: user
    };

    console.log('✅ User authenticated successfully');
    console.log('📋 req.user fields:', {
      id: req.user.id,
      email: req.user.email,
      emailId: req.user.emailId,
      phone: req.user.phone,
      phoneNumber: req.user.phoneNumber,
      mobileNumber: req.user.mobileNumber
    });

    next();
  } catch (error) {
    console.error('🚨 Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token', 
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please login again.', 
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// EXISTING FUNCTION - Keep this as is
// ============================================================
export const authenticateSellerToken = async (req, res, next) => {
  try {
    console.log('🏪 Seller authentication middleware called');

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No seller token provided',
        code: 'NO_SELLER_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SELLER_JWT_SECRET);
    const sellerId = decoded.id || decoded.sellerId;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid seller token payload',
        code: 'INVALID_SELLER_TOKEN_PAYLOAD'
      });
    }

    req.seller = { 
      id: sellerId,
      sellerId: sellerId,
      email: decoded.email,
      businessName: decoded.businessName
    };

    console.log('✅ Seller authenticated:', sellerId);
    next();
  } catch (error) {
    console.error('🚨 Seller authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid seller token', 
        code: 'INVALID_SELLER_TOKEN' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Seller token expired', 
        code: 'SELLER_TOKEN_EXPIRED' 
      });
    }

    return res.status(401).json({ 
      success: false, 
      error: 'Seller authentication failed', 
      code: 'SELLER_AUTH_FAILED'
    });
  }
};

// ============================================================
// NEW FUNCTION - Optional Authentication
// ============================================================
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    if (token) {
      try {
        token = token.trim();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId || decoded.user?.id || decoded._id;

        if (userId) {
          const user = await User.findById(userId).select('-passwordHash');
          
          if (user) {
            req.user = {
              id: user._id.toString(),
              userId: user._id.toString(),
              email: user.emailId || user.email,
              emailId: user.emailId || user.email,
              phone: user.phone || user.phoneNumber || user.mobileNumber,
              phoneNumber: user.phone || user.phoneNumber || user.mobileNumber,
              name: user.name || user.fullName,
              fullName: user.fullName || user.name,
              role: user.role,
              user: user
            };
            console.log('✅ Optional auth: User authenticated');
          }
        }
      } catch (error) {
        // Invalid token, but continue without user
        console.log('⚠️ Optional auth: Invalid token, continuing without user');
        req.user = null;
      }
    } else {
      console.log('ℹ️ Optional auth: No token provided, continuing without user');
    }

    next();
  } catch (error) {
    console.log('⚠️ Optional auth error, continuing without user:', error.message);
    next();
  }
};
// middleware/authMiddleware.js - ADD THIS FUNCTION

// Add this function to your existing backend/middleware/authMiddleware.js

/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin privileges
 * Must be used AFTER authenticateToken middleware
 */
export const requireAdmin = async (req, res, next) => {
  try {
    console.log('🔐 Admin authorization check');
    
    // User is already authenticated by authenticateToken
    const user = req.user;
    
    if (!user) {
      console.log('❌ No user found in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    console.log('👤 Checking admin privileges for:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.log('❌ Access denied: User role is', user.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
        code: 'NOT_ADMIN',
        requiredRole: 'admin',
        currentRole: user.role
      });
    }

    console.log('✅ Admin access granted:', user.email);
    
    // Add admin flag for convenience
    req.isAdmin = true;
    
    next();
  } catch (error) {
    console.error('🚨 Admin authorization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional Admin Check
 * Checks if user is admin but doesn't block request if not
 * Useful for routes that have different behavior for admins
 */
export const checkAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    req.isAdmin = user && user.role === 'admin';
    console.log('ℹ️ Admin check:', req.isAdmin ? 'Is admin' : 'Not admin');
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    req.isAdmin = false;
    next();
  }
};

// Export both middlewares
export default { requireAdmin, checkAdmin };

// ============================================================
// EXPORTS - These MUST come AFTER the function definitions
// ============================================================
export { authenticateToken as authenticateUser };
export { authenticateSellerToken as authenticateSeller };
export const protect = authenticateToken; // Alias for customer support routes