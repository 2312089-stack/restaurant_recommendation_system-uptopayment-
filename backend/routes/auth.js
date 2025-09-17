// routes/auth.js - COMPLETE CORRECTED VERSION
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // FIXED: Add .select('+passwordHash') to include password field
    const user = await User.findOne({ emailId: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if passwordHash exists
    if (!user.passwordHash) {
      console.error('User found but passwordHash is missing for:', user.emailId);
      return res.status(500).json({
        success: false,
        error: 'Account configuration error. Please contact support.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { id: user._id, userId: user._id, emailId: user.emailId, email: user.emailId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted || false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Network error. Please try again.'
    });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Starting forgot password process...');
    console.log('Email received:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ emailId: cleanEmail });

    // For security, always return success message
    const successResponse = {
      success: true,
      message: 'If an account exists with this email, you will receive a reset link shortly.'
    };

    if (!user) {
      console.log('User not found:', cleanEmail);
      return res.json(successResponse);
    }

    console.log('User found for password reset:', user.emailId);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    console.log('Reset token generated and saved');

    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log('Reset URL created:', resetURL);

    // EMAIL SENDING LOGIC
    let transporter;
    
    // Check environment variables
    console.log('Environment check:');
    console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Missing');
    console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Missing');

    // Configure email transporter
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Production Gmail setup
      console.log('Setting up Gmail transporter...');
      
      // FIXED: Use createTransport (not createTransporter)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      console.log('Gmail transporter created successfully');
    } else {
      // Development mode with Ethereal
      console.log('Missing email configuration. Using Ethereal test service...');
      console.log('Add these to your .env file for production:');
      console.log('   EMAIL_USER=your-gmail@gmail.com');
      console.log('   EMAIL_PASS=your-16-character-app-password');
      
      const testAccount = await nodemailer.createTestAccount();
      console.log('Test account created:', testAccount.user);
      
      // FIXED: Use createTransport (not createTransporter)
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // Verify transporter
    console.log('Testing email server connection...');
    await transporter.verify();
    console.log('Email server connection successful');

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@tastesphere.com',
      to: user.emailId,
      subject: 'TasteSphere - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TasteSphere</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="padding: 40px; background: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px; font-size: 16px;">
              Hello! We received a request to reset your password for your TasteSphere account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetURL}" 
                 style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                Reset My Password
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This link will expire in 15 minutes for security reasons.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0;">
              <a href="${resetURL}" style="color: #f97316; font-size: 12px; word-break: break-all;">${resetURL}</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              TasteSphere - Your Culinary Journey Starts Here<br>
              This email was sent to ${user.emailId}
            </p>
          </div>
        </div>
      `,
      text: `
TasteSphere - Password Reset Request

Hello! We received a request to reset your password.

Click this link to reset your password: ${resetURL}

This link will expire in 15 minutes.

If you didn't request this, please ignore this email.

TasteSphere Team
      `.trim()
    };

    console.log('Attempting to send email...');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    // For development mode with Ethereal, show preview URL
    if (!process.env.EMAIL_USER && info.messageId) {
      const previewURL = nodemailer.getTestMessageUrl(info);
      console.log('EMAIL PREVIEW URL:', previewURL);
      console.log('Open this URL to see your test email!');
      
      return res.json({
        success: true,
        message: "Development mode: Check console for email preview link",
        previewUrl: previewURL,
        development: true
      });
    }
    
    res.json({
      success: true,
      message: "Password reset link sent to your email. Please check your inbox and spam folder."
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Clean up reset token if email fails
    if (error.user) {
      try {
        error.user.passwordResetToken = undefined;
        error.user.passwordResetExpires = undefined;
        await error.user.save({ validateBeforeSave: false });
      } catch (cleanupError) {
        console.error('Token cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to send reset link. Please try again later.'
    });
  }
});

// Verify Reset Token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: user.emailId
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    console.log('Password reset attempt with token:', token ? 'Provided' : 'Missing');

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    console.log('Looking for user with reset token...');

    // FIXED: Add .select('+passwordHash') to include password field
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordHash');

    if (!user) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    console.log('Valid reset token for user:', user.emailId);

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password and clear reset token
    user.passwordHash = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    
    await user.save();

    console.log('Password reset successful for:', user.emailId);

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health Check
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes working perfectly',
    timestamp: new Date().toISOString()
  });
});

// Token Validation
router.post('/validate-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    res.json({
      success: true,
      message: 'Token is valid',
      decoded: {
        id: decoded.id,
        userId: decoded.userId,
        emailId: decoded.emailId,
        exp: decoded.exp
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token validation failed'
    });
  }
});

export default router;