// authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to authenticate regular users
 */
export const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware called');
    console.log('Headers:', req.headers);

    let token = null;

    // 1. Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('✅ Token found in Authorization header');
    }

    // 2. x-access-token header
    if (!token && req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
      console.log('✅ Token found in x-access-token header');
    }

    // 3. token header
    if (!token && req.headers.token) {
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

    // Verify token
    console.log('🔍 Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified. User ID:', decoded.id || decoded.userId);

    const userId = decoded.id || decoded.userId || decoded.user?.id;

    if (!userId) {
      console.log('❌ No user ID in token payload');
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    // Lookup user
    console.log('👤 Looking up user in database...');
    const user = await User.findById(userId).select('-password');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('✅ User authenticated:', user.emailId);

    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.emailId,
      user
    };

    next();
  } catch (error) {
    console.error('🚨 Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, error: 'Token not active yet', code: 'TOKEN_NOT_ACTIVE' });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware to authenticate sellers (optional)
 */
export const authenticateSellerToken = async (req, res, next) => {
  try {
    console.log('🏪 Seller authentication middleware called');

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      console.log('❌ No seller token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No seller token provided.',
        code: 'NO_SELLER_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sellerId = decoded.id || decoded.sellerId;

    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid seller token payload',
        code: 'INVALID_SELLER_TOKEN_PAYLOAD'
      });
    }

    // If you add a Seller model:
    // const seller = await Seller.findById(sellerId);
    // if (!seller) return res.status(401).json({ success: false, error: 'Seller not found', code: 'SELLER_NOT_FOUND' });

    req.seller = { id: sellerId, sellerId };
    console.log('✅ Seller authenticated:', sellerId);

    next();
  } catch (error) {
    console.error('🚨 Seller authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid seller token', code: 'INVALID_SELLER_TOKEN' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Seller token expired', code: 'SELLER_TOKEN_EXPIRED' });
    }

    return res.status(401).json({ success: false, error: 'Seller authentication failed', code: 'SELLER_AUTH_FAILED' });
  }
};

// 👇 Export alias for backwards compatibility
export { authenticateToken as authenticateUser };
