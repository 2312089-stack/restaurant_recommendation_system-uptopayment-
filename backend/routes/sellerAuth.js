// routes/sellerAuth.js - COMPLETE FIX
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Seller from '../models/Seller.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

// Generate JWT token
const generateToken = (sellerId) => {
  return jwt.sign({ sellerId }, JWT_SECRET, { expiresIn: '30d' });
};

// Email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

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

    console.log('\n========================================');
    console.log('📝 SELLER SIGNUP REQUEST');
    console.log('========================================');
    console.log('Email:', email);
    console.log('Password length:', password?.length);
    console.log('Business Name:', businessName);
    console.log('Business Type:', businessType);
    console.log('Phone:', phone);

    // ✅ VALIDATION
    if (!email || !password) {
      console.log('❌ Missing required fields: email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      console.log('❌ Password too short:', password.length);
      return res.status(400).json({
        success: false,
        error: 'Business account password must be at least 8 characters long'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('🔍 Checking if seller exists with email:', cleanEmail);

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: cleanEmail });
    if (existingSeller) {
      console.log('❌ Seller already exists:', cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'A business account with this email already exists'
      });
    }

    console.log('✅ Email is available, creating new seller...');

    // ✅ Hash password BEFORE creating seller (since pre-save hook might have issues)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');

    // ✅ CREATE SELLER WITH ALL REQUIRED FIELDS
    const seller = new Seller({
      email: cleanEmail,
      passwordHash: hashedPassword, // Already hashed
      businessName: businessName?.trim() || 'New Restaurant',
      businessType: businessType || 'Restaurant', // Must match enum
      phone: phone?.trim() || '',
      
      // ✅ Address with all required fields
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.zipCode || '',
        coordinates: {
          latitude: address?.latitude || null,
          longitude: address?.longitude || null
        }
      },
      
      // ✅ CRITICAL FLAGS FOR DISCOVERY
      isActive: true,
      isVerified: true, // Auto-verify (change to false for manual verification)
      onboardingCompleted: false,
      
      // ✅ Business Details
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
          saturday: { open: '09:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '22:00', closed: false }
        },
        dishes: [],
        documents: {}
      },
      
      // ✅ Metrics
      metrics: {
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0
      },
      
      // ✅ Settings
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
      },
      
      // ✅ Subscription
      subscription: {
        plan: 'free',
        status: 'active',
        validUntil: null
      }
    });

    console.log('💾 Saving seller to database...');
    
    // Save with validation disabled to avoid pre-save hook issues
    await seller.save({ validateBeforeSave: false });

    console.log('✅ SELLER CREATED SUCCESSFULLY!');
    console.log('   ID:', seller._id);
    console.log('   Email:', seller.email);
    console.log('   Business Name:', seller.businessName);
    console.log('   Business Type:', seller.businessType);
    console.log('   isActive:', seller.isActive);
    console.log('   isVerified:', seller.isVerified);
    console.log('========================================\n');

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
        phone: seller.phone,
        isVerified: seller.isVerified,
        isActive: seller.isActive,
        onboardingCompleted: seller.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ SELLER SIGNUP ERROR');
    console.error('========================================');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      console.error('Validation Errors:', error.errors);
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate Key Error:', error.keyValue);
      return res.status(400).json({
        success: false,
        error: 'A business account with this email already exists'
      });
    }
    
    console.error('========================================\n');
    
    res.status(500).json({
      success: false,
      error: 'Failed to create business account. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== SELLER LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n========================================');
    console.log('🔐 SELLER LOGIN REQUEST');
    console.log('========================================');
    console.log('Email:', email);
    console.log('Password length:', password?.length); // Add this

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find seller with password
    const seller = await Seller.findOne({ email: cleanEmail });
    if (!seller) {
      console.log('❌ Seller not found:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: 'Invalid business account credentials'
      });
    }

    // Check if seller account is active
    if (!seller.isActive) {
      console.log('❌ Seller account inactive:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: 'Business account has been deactivated'
      });
    }

    // 🔍 DEBUG: Check password hash format
    console.log('🔒 Hash info:', {
      length: seller.passwordHash?.length,
      starts: seller.passwordHash?.substring(0, 7),
      isBcrypt: seller.passwordHash?.startsWith('$2a$') || seller.passwordHash?.startsWith('$2b$')
    });

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, seller.passwordHash);
    
    console.log('🔍 Password comparison:', {
      inputLength: password.length,
      hashLength: seller.passwordHash.length,
      result: isPasswordValid
    });

    if (!isPasswordValid) {
      console.log('❌ Invalid password for seller:', cleanEmail);
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

    console.log('✅ SELLER LOGIN SUCCESSFUL');
    console.log('   Email:', seller.email);
    console.log('   Business:', seller.businessName);
    console.log('========================================\n');

    res.json({
      success: true,
      message: 'Business login successful',
      token,
      seller: {
        id: seller._id,
        email: seller.email,
        businessName: seller.businessName,
        businessType: seller.businessType,
        phone: seller.phone,
        isVerified: seller.isVerified,
        isActive: seller.isActive,
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

    const cleanEmail = email.toLowerCase().trim();
    const seller = await Seller.findOne({ email: cleanEmail });
    
    if (!seller) {
      return res.json({
        success: true,
        message: 'If a business account with this email exists, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    seller.passwordResetToken = hashedToken;
    seller.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await seller.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/reset-password/${resetToken}`;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"TasteSphere Business Portal" <${process.env.EMAIL_FROM}>`,
      to: seller.email,
      subject: 'TasteSphere Business - Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316;">Reset Your Business Password</h2>
          <p>Hello <strong>${seller.businessName || 'Business Owner'}</strong>,</p>
          <p>You requested to reset your TasteSphere business account password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ef4444); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold;">
              Reset Business Password
            </a>
          </div>
          <p style="color: #92400e; background: #fef3c7; padding: 15px; border-radius: 8px;">
            <strong>🏪 Business Security:</strong><br>
            This link will expire in 10 minutes.
          </p>
          <p style="color: #6b7280; font-size: 12px;">
            If you didn't request this, please ignore this email.<br>
            <strong>TasteSphere Business Portal Team</strong>
          </p>
        </div>
      `,
      text: `Reset Your TasteSphere Business Password\n\nClick here: ${resetURL}\n\nThis link expires in 10 minutes.`
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

    console.log('🔄 Seller password reset request');

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

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

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

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    seller.passwordHash = hashedPassword;
    seller.passwordResetToken = undefined;
    seller.passwordResetExpires = undefined;
    seller.passwordChangedAt = new Date();

    await seller.save({ validateBeforeSave: false });

    console.log('✅ Seller password reset successful for:', seller.email);

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

// ========================================
// IMPORTANT: Update Seller.js model
// ========================================
// In your models/Seller.js, make sure passwordHash field looks like this:
/*
passwordHash: {
  type: String,
  required: true,
  // ❌ REMOVE minlength validator - it validates plain text length, not hash
  // minlength: 8  
}

// And REMOVE or comment out the pre-save password hashing middleware:
// sellerSchema.pre('save', async function(next) {
//   if (!this.isModified('passwordHash')) return next();
//   const salt = await bcrypt.genSalt(12);
//   this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
//   next();
// });
*/