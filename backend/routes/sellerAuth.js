import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Seller from '../models/Seller.js'; // Adjust path as needed

const router = express.Router();

// JWT Secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

// Generate JWT token
const generateToken = (sellerId) => {
  return jwt.sign({ sellerId }, JWT_SECRET, { expiresIn: '7d' });
};

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ==================== SELLER SIGNUP ====================
// ==================== SELLER SIGNUP ====================
router.post('/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      businessName, 
      businessType, 
      phone,
      address 
    } = req.body;

    console.log('📝 Seller signup request for:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Business account password must be at least 8 characters long'
      });
    }

    // Check if seller already exists
    const existingSeller = await Seller.findByEmail(email);
    if (existingSeller) {
      return res.status(400).json({
        success: false,
        error: 'A business account with this email already exists'
      });
    }

    // ✅ CREATE SELLER WITH FLAGS FOR DISCOVERY
    const seller = new Seller({
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by pre-save middleware
      businessName: businessName?.trim() || '',
      businessType: businessType || 'Restaurant',
      phone: phone?.trim() || '',
      address: address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        coordinates: { latitude: null, longitude: null }
      },
      
      // ✅ CRITICAL: Set these flags for discovery
      isActive: true,           // Restaurant is active
      isVerified: true,         // Auto-verify (change to false if you want manual verification)
      onboardingCompleted: false, // Will be true after profile completion
      
      // ✅ Initialize business details
      businessDetails: {
        ownerName: '',
        description: '',
        cuisine: [],
        priceRange: 'mid-range',
        servicesOffered: [],
        openingHours: {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '22:00', closed: false },
          saturday: { open: '09:00', close: '22:00', closed: false },
          sunday: { open: '09:00', close: '22:00', closed: false }
        },
        documents: {}
      },
      
      // ✅ Initialize metrics
      metrics: {
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0
      },
      
      // ✅ Initialize settings
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        orderAcceptance: {
          auto: false,
          manualTimeout: 15
        }
      }
    });

    await seller.save();

    console.log('✅ Seller account created successfully for:', email);
    console.log('✅ Seller flags:', {
      isActive: seller.isActive,
      isVerified: seller.isVerified,
      onboardingCompleted: seller.onboardingCompleted
    });

    // Generate token
    const token = generateToken(seller._id);

    res.status(201).json({
      success: true,
      message: 'Business account created successfully. You can now add dishes!',
      token,
      seller: {
        id: seller._id,
        email: seller.email,
        businessName: seller.businessName,
        businessType: seller.businessType,
        isVerified: seller.isVerified,
        isActive: seller.isActive,
        onboardingCompleted: seller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Seller signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business account'
    });
  }
});

// ==================== SELLER LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Seller login request for:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find seller with password
    const seller = await Seller.findByEmailWithPassword(email);
    if (!seller) {
      return res.status(401).json({
        success: false,
        error: 'Invalid business account credentials'
      });
    }

    // Check if seller account is active
    if (!seller.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Business account has been deactivated'
      });
    }

    // Compare password
    const isPasswordValid = await seller.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid business account credentials'
      });
    }

    // Update last login
    seller.lastLogin = new Date();
    await seller.save();

    // Generate token
    const token = generateToken(seller._id);

    console.log('✅ Seller login successful for:', email);

    res.json({
      success: true,
      message: 'Business login successful',
      token,
      seller: {
        id: seller._id,
        email: seller.email,
        businessName: seller.businessName,
        businessType: seller.businessType,
        isVerified: seller.isVerified,
        onboardingCompleted: seller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Seller login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ==================== FORGOT PASSWORD ====================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔑 Seller forgot password request for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find seller
    const seller = await Seller.findByEmail(email);
    if (!seller) {
      // Don't reveal if seller exists or not for security
      return res.json({
        success: true,
        message: 'If a business account with this email exists, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save reset token to seller
    seller.passwordResetToken = hashedToken;
    seller.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await seller.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/reset-password/${resetToken}`;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"TasteSphere Business Portal" <${process.env.EMAIL_USER}>`,
      to: seller.email,
      subject: 'TasteSphere Business - Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); border-radius: 12px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f97316, #ef4444); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <svg width="30" height="30" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2M12 3.5C11.7 3.5 11.5 3.7 11.5 4V6H12.5V4C12.5 3.7 12.3 3.5 12 3.5M12 9C10.9 9 10 9.9 10 11S10.9 13 12 13 14 12.1 14 11 13.1 9 12 9M12 10.5C12.3 10.5 12.5 10.7 12.5 11S12.3 11.5 12 11.5 11.5 11.3 11.5 11 11.7 10.5 12 10.5Z"/>
                </svg>
              </div>
              <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: bold;">TasteSphere Business</h1>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0;">Reset Your Business Password</h2>
              <p style="color: #666; margin: 0; line-height: 1.6;">
                Hello <strong>${seller.businessName || 'Business Owner'}</strong>,<br>
                You requested to reset your TasteSphere business account password.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ef4444); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                Reset Business Password
              </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
                <strong>🏪 Business Security:</strong><br>
                This link will expire in 10 minutes.<br>
                Only use this for your TasteSphere business account.
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                If you didn't request this reset, please ignore this email.<br>
                Your business account password will remain unchanged.<br><br>
                <strong>TasteSphere Business Portal Team</strong>
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
Reset Your TasteSphere Business Password

Hello ${seller.businessName || 'Business Owner'},

You requested to reset your TasteSphere business account password.

Click here to reset: ${resetURL}

This link will expire in 10 minutes.

If you didn't request this reset, please ignore this email.

TasteSphere Business Portal Team
      `
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Seller password reset email sent to:', email);

    res.json({
      success: true,
      message: 'If a business account with this email exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Seller forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// ==================== RESET PASSWORD ====================
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log('🔄 Seller password reset request with token');

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Business account password must be at least 8 characters long'
      });
    }

    // Hash the token to compare with stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find seller with valid reset token
    const seller = await Seller.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!seller) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid or has expired'
      });
    }

    // Update password
    seller.passwordHash = password; // Will be hashed by pre-save middleware
    seller.passwordResetToken = null;
    seller.passwordResetExpires = null;
    seller.passwordChangedAt = new Date();

    await seller.save();

    console.log('✅ Seller password reset successful for:', seller.email);

    // Generate new token for immediate login
    const authToken = generateToken(seller._id);

    res.json({
      success: true,
      message: 'Business password reset successful',
      token: authToken
    });

  } catch (error) {
    console.error('❌ Seller reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// ==================== GET SELLER PROFILE ====================
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const seller = await Seller.findById(decoded.sellerId);

    if (!seller) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      seller: {
        id: seller._id,
        email: seller.email,
        businessName: seller.businessName,
        businessType: seller.businessType,
        phone: seller.phone,
        address: seller.address,
        businessDetails: seller.businessDetails,
        isVerified: seller.isVerified,
        isActive: seller.isActive,
        onboardingCompleted: seller.onboardingCompleted,
        createdAt: seller.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Get seller profile error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

export default router;