// middleware/sellerAuthMiddleware.js
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-sellers';

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

    // Verify the token - Your sellerAuth.js uses 'sellerId' in the token payload
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Seller token decoded:', { sellerId: decoded.sellerId });

    // Find seller by ID using the sellerId from token
    const seller = await Seller.findById(decoded.sellerId);
    if (!seller) {
      console.log('❌ Seller not found:', decoded.sellerId);
      return res.status(401).json({
        success: false,
        message: 'Seller no longer exists'
      });
    }

    // Check if seller is active
    if (!seller.isActive) {
      console.log('❌ Seller account is inactive:', seller.email);
      return res.status(401).json({
        success: false,
        message: 'Seller account is inactive'
      });
    }

    // Set req.seller with correct field names to match your token structure
    req.seller = {
      id: decoded.sellerId,     // Use sellerId from your sellerAuth.js token
      sellerId: decoded.sellerId,
      email: seller.email,
      businessName: seller.businessName
    };

    console.log('✅ Seller authentication successful for:', seller.email);
    next();

  } catch (error) {
    console.error('❌ Seller authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional middleware to check if seller has completed onboarding
export const requireOnboarding = (req, res, next) => {
  // This assumes seller data is already loaded by authenticateSellerToken
  if (req.seller && !req.seller.onboardingCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Please complete your onboarding first',
      redirectTo: '/seller/onboarding'
    });
  }
  next();
};

// Optional middleware to check if seller is verified
export const requireVerification = (req, res, next) => {
  if (req.seller && !req.seller.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending verification',
      verificationStatus: req.seller.verificationStatus
    });
  }
  next();
};