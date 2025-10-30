// backend/middleware/adminSecurity.js - FIXED RATE LIMITER

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import rateLimit from 'express-rate-limit';

// ==================== IP WHITELIST ====================
const ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS 
  ? process.env.ADMIN_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : [];

export const checkIPWhitelist = (req, res, next) => {
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

// ==================== RATE LIMITING (FIXED) ====================

/**
 * ✅ FIXED: IPv6-compatible rate limiter for admin login
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
  // ✅ FIXED: Removed custom keyGenerator to use default (handles IPv6)
  skipSuccessfulRequests: true
});

/**
 * ✅ FIXED: IPv6-compatible general admin API rate limiter
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

const activeSessions = new Map();

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
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  activeSessions.set(sessionId, session);
  cleanupExpiredSessions();
  
  return sessionId;
};

export const validateAdminSession = (userId, token) => {
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId && session.token === token) {
      if (session.expiresAt < new Date()) {
        activeSessions.delete(sessionId);
        return false;
      }
      session.lastActivity = new Date();
      return true;
    }
  }
  return false;
};

export const invalidateAdminSession = (userId) => {
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(sessionId);
    }
  }
};

const cleanupExpiredSessions = () => {
  const now = new Date();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(sessionId);
    }
  }
};

setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// ==================== ADMIN AUTHENTICATION ====================

export const authenticateAdmin = async (req, res, next) => {
  try {
    console.log('🔐 Admin authentication check');

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN'
      });
    }

    if (!validateAdminSession(userId, token)) {
      console.log('❌ Invalid or expired admin session');
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    const admin = await User.findById(userId).select('-passwordHash');

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (admin.role !== 'admin') {
      console.log('❌ User is not admin:', admin.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
        code: 'NOT_ADMIN'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Admin account is deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    req.admin = {
      id: admin._id.toString(),
      email: admin.emailId,
      name: admin.name,
      role: admin.role
    };

    req.user = req.admin;

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

export const logAdminActivity = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (req.admin) {
      console.log('📝 Admin Activity:', {
        admin: req.admin.email,
        action: `${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        success: data.success !== false
      });
    }

    return originalJson(data);
  };

  next();
};

// ==================== 2FA HELPER ====================

export const generate2FACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verify2FACode = (inputCode, storedCode, expiryTime) => {
  if (!storedCode || !expiryTime) {
    return false;
  }

  if (new Date() > new Date(expiryTime)) {
    return false;
  }

  return inputCode === storedCode;
};

// ==================== PASSWORD STRENGTH VALIDATION ====================

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