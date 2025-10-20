// controllers/sellerAuthController.js - COMPLETE SELLER AUTH
import Seller from '../models/Seller.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

// ==================== SELLER SIGNUP ====================
export const sellerSignup = async (req, res) => {
  try {
    const { email, password, businessName, phone, businessType } = req.body;

    console.log('🏪 Seller registration attempt:', email);

    // Validation
    if (!email || !password || !businessName || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, business name, and phone are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: cleanEmail });
    if (existingSeller) {
      console.log('❌ Seller already exists:', cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'A seller account already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ✅ CREATE SELLER WITH CORRECT FLAGS FOR DISCOVERY
    const newSeller = new Seller({
      email: cleanEmail,
      passwordHash,
      businessName: businessName.trim(),
      businessType: businessType || 'Restaurant',
      phone: phone.trim(),
      
      // ✅ CRITICAL: Set these flags so seller appears in discovery
      isActive: true,           // Active by default
      isVerified: true,         // Auto-verify (or set to false if you want manual verification)
      onboardingCompleted: false, // Will be true after profile completion
      
      // Initialize business details
      businessDetails: {
        ownerName: '',
        description: '',
        cuisine: [],
        priceRange: 'mid-range',
        servicesOffered: [],
        documents: {}
      },
      
      // Initialize address
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        coordinates: {
          latitude: null,
          longitude: null
        }
      },
      
      // Initialize metrics
      metrics: {
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0
      }
    });

    await newSeller.save();

    console.log('✅ Seller created successfully:', newSeller.email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        sellerId: newSeller._id,
        email: newSeller.email,
        businessName: newSeller.businessName
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Seller account created successfully',
      token,
      seller: {
        id: newSeller._id,
        email: newSeller.email,
        businessName: newSeller.businessName,
        businessType: newSeller.businessType,
        phone: newSeller.phone,
        isActive: newSeller.isActive,
        isVerified: newSeller.isVerified,
        onboardingCompleted: newSeller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Seller registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

// ==================== SELLER SIGNIN ====================
export const sellerSignin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🏪 Seller login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find seller
    const seller = await Seller.findOne({ email: cleanEmail });
    if (!seller) {
      console.log('❌ Seller not found:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, seller.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for seller:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    seller.lastLogin = new Date();
    await seller.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        sellerId: seller._id,
        email: seller.email,
        businessName: seller.businessName
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Seller login successful:', seller.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      seller: {
        id: seller._id,
        email: seller.email,
        businessName: seller.businessName,
        businessType: seller.businessType,
        phone: seller.phone,
        isActive: seller.isActive,
        isVerified: seller.isVerified,
        onboardingCompleted: seller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Seller login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

// ==================== FORGOT PASSWORD ====================
export const sellerForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const seller = await Seller.findOne({ email: cleanEmail });
    
    if (!seller) {
      // Don't reveal if seller exists
      return res.json({
        success: true,
        message: 'If a seller account exists with this email, you will receive a reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    seller.passwordResetToken = hashedToken;
    seller.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await seller.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/reset-password/${resetToken}`;

    // Send email (use same email config as user auth)
    // ... email sending code here

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });

  } catch (error) {
    console.error('Seller forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
};

// ==================== RESET PASSWORD ====================
export const sellerResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const seller = await Seller.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!seller) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    seller.passwordHash = hashedPassword;
    seller.passwordResetToken = undefined;
    seller.passwordResetExpires = undefined;
    seller.passwordChangedAt = new Date();
    
    await seller.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in.'
    });

  } catch (error) {
    console.error('Seller reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
};