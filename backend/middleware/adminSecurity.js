// backend/middleware/adminSecurity.js - COMPREHENSIVE ADMIN SECURITY

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

// ==================== IP WHITELIST ====================
const ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS 
  ? process.env.ADMIN_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : []; // Empty array means allow all IPs

/**
 * IP Whitelist Middleware
 * Only allows requests from whitelisted IPs if configured
 */
export const checkIPWhitelist = (req, res, next) => {
  // Skip if no IPs configured (allow all)
  if (ALLOWED_IPS.length === 0) {
    return next();
  }

  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0];
  
  console.log('🔍 IP Check:', clientIP);

  if (!ALLOWED_IPS.includes(clientIP)) {
    console.log('❌ IP Blocked:', clientIP);
    return res.status(403).json({
      success: false,
      error: 'Access denied from this IP address',
      code: 'IP_BLOCKED'
    });
  }

  console.log('✅ IP Allowed:', clientIP);
  next();
};

// ==================== RATE LIMITING ====================

/**
 * Strict rate limiter for admin login attempts
 * Prevents brute force attacks
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key generator: Rate limit by IP + email combination
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body?.email || 'unknown';
    return `${ip}-${email}`;
  },
  // Skip successful requests (only count failures)
  skipSuccessfulRequests: true
});

/**
 * General admin API rate limiter
 */
export const adminApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
    code: 'API_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ==================== SESSION MANAGEMENT ====================

// Store active admin sessions (in production, use Redis)
const activeSessions = new Map();

/**
 * Create admin session
 */
export const createAdminSession = (userId, token, req) => {
  const sessionId = `${userId}-${Date.now()}`;
  const session = {
    sessionId,
    userId,
    token,
    createdAt: new Date(),
    lastActivity: new Date(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };

  activeSessions.set(sessionId, session);
  
  // Cleanup expired sessions
  cleanupExpiredSessions();
  
  return sessionId;
};

/**
 * Validate admin session
 */
export const validateAdminSession = (userId, token) => {
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId && session.token === token) {
      if (session.expiresAt < new Date()) {
        activeSessions.delete(sessionId);
        return false;
      }
      // Update last activity
      session.lastActivity = new Date();
      return true;
    }
  }
  return false;
};

/**
 * Invalidate admin session (logout)
 */
export const invalidateAdminSession = (userId) => {
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
    }
  }
};

/**
 * Cleanup expired sessions
 */
const cleanupExpiredSessions = () => {
  const now = new Date();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(sessionId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// ==================== ADMIN AUTHENTICATION ====================

/**
 * Enhanced admin authentication middleware
 * Validates token, session, and admin privileges
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('🔐 Admin authentication check');

    // Extract token
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-admin-token']) {
      token = req.headers['x-admin-token'];
    }

    if (!token) {
      console.log('❌ No admin token provided');
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN'
      });
    }

    // Validate session exists
    if (!validateAdminSession(userId, token)) {
      console.log('❌ Invalid or expired admin session');
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Fetch admin user
    const admin = await User.findById(userId).select('-passwordHash');

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Verify admin role
    if (admin.role !== 'admin') {
      console.log('❌ User is not admin:', admin.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
        code: 'NOT_ADMIN'
      });
    }

    // Verify account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Admin account is deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach admin to request
    req.admin = {
      id: admin._id.toString(),
      email: admin.emailId,
      name: admin.name,
      role: admin.role
    };

    req.user = req.admin; // For compatibility with existing middleware

    console.log('✅ Admin authenticated:', admin.emailId);
    next();

  } catch (error) {
    console.error('🚨 Admin authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Admin token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Admin authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// ==================== ADMIN ACTIVITY LOGGING ====================

/**
 * Log admin actions for audit trail
 */
export const logAdminActivity = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Log admin activity
    if (req.admin) {
      console.log('📝 Admin Activity:', {
        admin: req.admin.email,
        action: `${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        success: data.success !== false
      });

      // In production, save to database
      // await AdminActivityLog.create({
      //   adminId: req.admin.id,
      //   action: req.originalUrl,
      //   method: req.method,
      //   ip: req.ip,
      //   timestamp: new Date(),
      //   success: data.success !== false
      // });
    }

    return originalJson(data);
  };

  next();
};

// ==================== 2FA HELPER (Optional) ====================

/**
 * Generate 2FA code (6 digits)
 */
export const generate2FACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Verify 2FA code
 */
export const verify2FACode = (inputCode, storedCode, expiryTime) => {
  if (!storedCode || !expiryTime) {
    return false;
  }

  if (new Date() > new Date(expiryTime)) {
    return false; // Code expired
  }

  return inputCode === storedCode;
};

// ==================== PASSWORD STRENGTH VALIDATION ====================

/**
 * Validate strong admin password
 */
export const validateAdminPassword = (password) => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain uppercase letters');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain lowercase letters');
  }
  if (!hasNumbers) {
    errors.push('Password must contain numbers');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain special characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ==================== SECURITY HEADERS ====================

/**
 * Add security headers to admin responses
 */
export const adminSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
};

export default {
  checkIPWhitelist,
  loginRateLimiter,
  adminApiRateLimiter,
  authenticateAdmin,
  logAdminActivity,
  adminSecurityHeaders,
  createAdminSession,
  validateAdminSession,
  invalidateAdminSession,
  validateAdminPassword,
  generate2FACode,
  verify2FACode
};