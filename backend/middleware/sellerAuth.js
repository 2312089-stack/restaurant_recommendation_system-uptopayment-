// middleware/sellerAuth.js - FIXED VERSION
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

export const authenticateSellerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Seller auth middleware - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Check if JWT_SECRET exists
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable is not set!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - JWT secret not found'
      });
    }

    // Verify the token - matches sellerAuth.js token structure
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Seller token decoded:', { sellerId: decoded.sellerId });

    // Validate sellerId format
    if (!decoded.sellerId || !mongoose.Types.ObjectId.isValid(decoded.sellerId)) {
      console.log('❌ Invalid seller ID format:', decoded.sellerId);
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Find seller by ID using the sellerId from token
    const seller = await Seller.findById(decoded.sellerId);
    if (!seller) {
      console.log('❌ Seller not found:', decoded.sellerId);
      return res.status(401).json({
        success: false,
        message: 'Seller no longer exists'
      });
    }

    // Check if seller is active (but allow inactive sellers to view their data)
    if (!seller.isActive && req.method !== 'GET') {
      console.log('❌ Seller account is inactive for write operations:', seller.email);
      return res.status(403).json({
        success: false,
        message: 'Seller account is inactive. Contact support to reactivate.'
      });
    }

    // Convert ObjectId to string to ensure consistency
    const sellerIdString = decoded.sellerId.toString();

    // Set req.seller with correct field names to match expectations across controllers
    req.seller = {
      id: sellerIdString,              // Primary ID field used in controllers
      sellerId: sellerIdString,        // Backup field name
      _id: decoded.sellerId,           // Original ObjectId for database queries
      email: seller.email,
      businessName: seller.businessName,
      businessType: seller.businessType,
      phone: seller.phone,
      isVerified: seller.isVerified,
      isActive: seller.isActive,
      onboardingCompleted: seller.onboardingCompleted,
      verificationStatus: seller.verificationStatus,
      // Include address for dish location data
      address: seller.address,
      // Include business details for dish creation
      businessDetails: seller.businessDetails
    };

    console.log('✅ Seller authentication successful for:', seller.email);
    console.log('🏪 Seller ID set as:', req.seller.id);
    next();

  } catch (error) {
    console.error('❌ Seller authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - please log in again'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired - please log in again'
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed - please try again'
    });
  }
};

// Enhanced middleware to check if seller has completed onboarding
export const requireOnboarding = (req, res, next) => {
  if (!req.seller) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.seller.onboardingCompleted) {
    console.log('❌ Seller onboarding incomplete:', req.seller.email);
    return res.status(403).json({
      success: false,
      message: 'Please complete your onboarding first',
      redirectTo: '/seller/onboarding',
      onboardingCompleted: false
    });
  }
  
  console.log('✅ Seller onboarding verified for:', req.seller.email);
  next();
};

// Enhanced middleware to check if seller is verified
export const requireVerification = (req, res, next) => {
  if (!req.seller) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.seller.isVerified) {
    console.log('❌ Seller not verified:', req.seller.email, 'Status:', req.seller.verificationStatus);
    return res.status(403).json({
      success: false,
      message: 'Your account is pending verification',
      verificationStatus: req.seller.verificationStatus || 'pending',
      isVerified: false
    });
  }
  
  console.log('✅ Seller verification confirmed for:', req.seller.email);
  next();
};

// NEW: Middleware to check if seller can manage dishes
export const requireDishManagement = (req, res, next) => {
  if (!req.seller) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Sellers must have completed onboarding to manage dishes
  if (!req.seller.onboardingCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Complete onboarding to manage your menu',
      redirectTo: '/seller/onboarding'
    });
  }

  // Sellers should preferably be verified, but allow unverified sellers to add dishes
  // This allows them to prepare their menu while waiting for verification
  if (!req.seller.isVerified) {
    console.log('⚠️ Unverified seller adding dishes:', req.seller.email);
  }

  console.log('✅ Dish management permissions verified for:', req.seller.email);
  next();
};

// NEW: Enhanced error handler for authentication issues
export const handleAuthError = (error, req, res, next) => {
  console.error('Auth Error Handler:', error);

  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      action: 'redirect_login'
    });
  }

  if (error.name === 'ForbiddenError' || error.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      action: 'show_message'
    });
  }

  // Pass to global error handler
  next(error);
};

export default {
  authenticateSellerToken,
  requireOnboarding,
  requireVerification,
  requireDishManagement,
  handleAuthError
};