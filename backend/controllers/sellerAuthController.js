// controllers/sellerAuthController.js - COMPLETE WITH FIXED EMAIL
import Seller from '../models/Seller.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security';

// ✅ FIXED: Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({  // ✅ Correct: createTransport (no 'er')
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

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

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
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
      isActive: true,
      isVerified: true,
      onboardingCompleted: false,
      
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
    
    console.log('📧 Seller forgot password request for:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const seller = await Seller.findOne({ email: cleanEmail });
    
    // Always return success to prevent email enumeration
    if (!seller) {
      console.log('⚠️ Seller not found, but returning success:', cleanEmail);
      return res.json({
        success: true,
        message: 'If a seller account exists with this email, you will receive a reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiry to database
    seller.passwordResetToken = hashedToken;
    seller.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await seller.save({ validateBeforeSave: false });

    console.log('✅ Reset token generated for seller:', seller.email);

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/reset-password/${resetToken}`;

    // ✅ FIXED: Email sending
    try {
      const transporter = createEmailTransporter();
      
      const mailOptions = {
        from: `"TasteSphere Business" <${process.env.EMAIL_FROM}>`,
        to: seller.email,
        subject: 'Reset Your Seller Account Password - TasteSphere',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .button:hover { opacity: 0.9; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .logo { font-size: 28px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏪 TasteSphere Business</div>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Seller Portal</p>
              </div>
              <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Reset Your Business Password</h2>
                <p>Hello <strong>${seller.businessName || 'Seller'}</strong>,</p>
                <p>We received a request to reset your TasteSphere business account password. Click the button below to create a new password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetURL}" class="button">Reset Password</a>
                </div>

                <p>Or copy and paste this link into your browser:</p>
                <p style="background: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px;">
                  ${resetURL}
                </p>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>This link will expire in <strong>10 minutes</strong></li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                  </ul>
                </div>

                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  If you're having trouble clicking the button, copy the entire URL above and paste it into your browser's address bar.
                </p>
              </div>
              <div class="footer">
                <p><strong>TasteSphere Business Support</strong></p>
                <p>Need help? Contact us at support@tastesphere.com</p>
                <p style="color: #9ca3af; font-size: 12px;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent to:', seller.email);

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Clear the reset token since email failed
      seller.passwordResetToken = undefined;
      seller.passwordResetExpires = undefined;
      await seller.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset email. Please check your email configuration or try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email address'
    });

  } catch (error) {
    console.error('❌ Seller forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request. Please try again.'
    });
  }
};

// ==================== RESET PASSWORD ====================
export const sellerResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log('🔐 Seller password reset attempt with token');

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token from URL to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find seller with valid reset token
    const seller = await Seller.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!seller) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset fields
    seller.passwordHash = hashedPassword;
    seller.passwordResetToken = undefined;
    seller.passwordResetExpires = undefined;
    seller.passwordChangedAt = new Date();
    
    await seller.save();

    console.log('✅ Password reset successful for seller:', seller.email);

    // Send confirmation email
    try {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: `"TasteSphere Business" <${process.env.EMAIL_FROM}>`,
        to: seller.email,
        subject: 'Password Changed Successfully - TasteSphere Seller',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
              .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🏪 TasteSphere Business</h1>
              </div>
              <div class="content">
                <h2 style="color: #1f2937;">Password Changed Successfully ✅</h2>
                <p>Hello <strong>${seller.businessName}</strong>,</p>
                
                <div class="success">
                  <strong>Your business account password has been changed successfully.</strong>
                </div>

                <p><strong>Change Details:</strong></p>
                <ul>
                  <li>Time: ${new Date().toLocaleString()}</li>
                  <li>Account: ${seller.email}</li>
                  <li>Business: ${seller.businessName}</li>
                </ul>

                <p style="margin-top: 20px;">
                  <strong>⚠️ Important:</strong> If you didn't make this change, please contact our support team immediately.
                </p>

                <p style="margin-top: 30px;">
                  You can now log in to your seller dashboard with your new password.
                </p>
              </div>
              <div class="footer">
                <p><strong>TasteSphere Business Support</strong></p>
                <p>Contact: support@tastesphere.com</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.warn('⚠️ Confirmation email failed (but password was changed):', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Seller reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.'
    });
  }
};