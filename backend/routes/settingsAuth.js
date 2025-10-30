// backend/routes/settingsAuth.js - COMPLETE FIXED VERSION
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// ✅ HELPER FUNCTION: Get frontend URL dynamically
const getFrontendUrl = (req) => {
  // Try to get from request headers first (forwarded from reverse proxy)
  const origin = req.get('origin') || req.get('referer');
  
  if (origin) {
    try {
      const url = new URL(origin);
      return `${url.protocol}//${url.host}`;
    } catch (e) {
      console.log('Could not parse origin:', e);
    }
  }
  
  // Fallback to environment variable
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // Last resort: try to detect from request
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host');
  
  // If host is the backend port (5000), guess the frontend port
  if (host && host.includes(':5000')) {
    return host.replace(':5000', ':5173');
  }
  
  // Default fallback
  return 'http://localhost:5173';
};

// ✅ 1. Change Email Route - FIXED WITH DYNAMIC URL
router.put('/change-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const userId = req.user.id;

    console.log('📧 Change email request:', { userId, newEmail });

    // Validate input
    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'New email and current password are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();

    // Find the user with password hash
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ emailId: cleanNewEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        error: 'This email address is already registered with another account'
      });
    }

    // Check if new email is same as current
    if (user.emailId === cleanNewEmail) {
      return res.status(400).json({
        success: false,
        error: 'New email must be different from current email'
      });
    }

    // Generate email verification token (JWT-based)
    const emailVerificationToken = jwt.sign(
      { 
        userId: user._id.toString(), 
        newEmail: cleanNewEmail,
        type: 'email_change'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // 24 hours expiry
    );

    // Store the pending email change in user document
    user.pendingEmailChange = {
      newEmail: cleanNewEmail,
      token: emailVerificationToken,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    };
    await user.save();

    // ✅ CRITICAL FIX: Get frontend URL dynamically
    const frontendUrl = getFrontendUrl(req);
    const verificationLink = `${frontendUrl}/verify-email-change?token=${emailVerificationToken}`;

    console.log('📧 Generated verification link:', verificationLink);
    console.log('📧 Sending verification email to:', cleanNewEmail);

    // Send verification email to NEW email address
    const emailResult = await sendEmail({
      to: cleanNewEmail,
      subject: 'Verify Your New Email Address - TasteSphere',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">TasteSphere</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your New Email Address</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${user.name || 'User'},
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have requested to change your email address on TasteSphere from <strong>${user.emailId}</strong> to <strong>${cleanNewEmail}</strong>.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              To complete this change, please click the button below to verify your new email address:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify New Email Address
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #f97316; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${verificationLink}
            </p>
            
            <div style="border-top: 1px solid #e5e5e5; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
                <strong>Important Security Information:</strong>
              </p>
              <ul style="color: #999; font-size: 14px; line-height: 1.6;">
                <li>This link will expire in 24 hours for security reasons</li>
                <li>If you did not request this email change, please ignore this email and contact support</li>
                <li>Your current email address will remain active until the change is verified</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="color: #999; font-size: 12px;">
                This email was sent by TasteSphere. If you need help, contact us at support@tastesphere.com
              </p>
            </div>
          </div>
        </div>
      `
    });

    // Check if email was sent successfully
    if (!emailResult.success) {
      console.error('❌ Failed to send verification email:', emailResult.error);
      
      // Revert the pending email change since email failed
      user.pendingEmailChange = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please check your email configuration and try again.'
      });
    }

    console.log('✅ Verification email sent successfully');

    // Also send notification to current email (optional but good practice)
    try {
      await sendEmail({
        to: user.emailId,
        subject: 'Email Change Request - TasteSphere',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">TasteSphere</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Email Change Request</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hello ${user.name || 'User'},
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                A request has been made to change your email address from <strong>${user.emailId}</strong> to <strong>${cleanNewEmail}</strong>.
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                A verification email has been sent to the new email address. Your current email will remain active until the change is verified.
              </p>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-weight: bold;">
                  ⚠️ If you did not request this change, please contact support immediately at support@tastesphere.com
                </p>
              </div>
            </div>
          </div>
        `
      });
    } catch (notificationError) {
      console.error('⚠️ Failed to send notification to current email:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: `Verification email sent to ${cleanNewEmail}. Please check your inbox and click the verification link to complete the email change.`
    });

  } catch (error) {
    console.error('❌ Change email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing your request. Please try again later.'
    });
  }
});

// backend/routes/settingsAuth.js - VERIFY EMAIL CHANGE WITH DETAILED LOGGING

// ✅ Replace ONLY the verify-email-change route with this version

router.post('/verify-email-change', async (req, res) => {
  try {
    const { token } = req.body;

    console.log('\n========== EMAIL VERIFICATION DEBUG ==========');
    console.log('1️⃣ Token received:', token ? 'YES' : 'NO');
    console.log('2️⃣ Token length:', token?.length);
    console.log('3️⃣ Token preview:', token?.substring(0, 50) + '...');

    if (!token) {
      console.log('❌ ERROR: No token provided');
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('4️⃣ Token decoded successfully:', {
        userId: decoded.userId,
        newEmail: decoded.newEmail,
        type: decoded.type,
        issued: new Date(decoded.iat * 1000).toLocaleString(),
        expires: new Date(decoded.exp * 1000).toLocaleString()
      });
    } catch (error) {
      console.log('❌ JWT Verification Error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    if (decoded.type !== 'email_change') {
      console.log('❌ ERROR: Wrong token type:', decoded.type);
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    console.log('5️⃣ Looking for user:', decoded.userId);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ ERROR: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('6️⃣ User found:', {
      id: user._id,
      email: user.emailId,
      hasPendingChange: !!user.pendingEmailChange
    });

    // Check pending email change
    if (!user.pendingEmailChange) {
      console.log('❌ ERROR: No pending email change found in database');
      console.log('   This means:');
      console.log('   - Token was already used, OR');
      console.log('   - Email change was cancelled, OR');
      console.log('   - Database was reset');
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email change request. The link may have already been used or expired.'
      });
    }

    console.log('7️⃣ Pending email change found:', {
      newEmail: user.pendingEmailChange.newEmail,
      created: user.pendingEmailChange.createdAt,
      expires: user.pendingEmailChange.expires,
      tokenMatch: user.pendingEmailChange.token === token
    });

    // Check token match
    if (user.pendingEmailChange.token !== token) {
      console.log('❌ ERROR: Token mismatch!');
      console.log('   Stored token:', user.pendingEmailChange.token?.substring(0, 50) + '...');
      console.log('   Received token:', token.substring(0, 50) + '...');
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email change request'
      });
    }

    // Check expiration
    if (user.pendingEmailChange.expires < new Date()) {
      console.log('❌ ERROR: Token expired');
      console.log('   Expired at:', user.pendingEmailChange.expires);
      console.log('   Current time:', new Date());
      
      // Clean up expired token
      user.pendingEmailChange = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please request a new email change.'
      });
    }

    // Check if new email is still available
    console.log('8️⃣ Checking if new email is available...');
    const existingUser = await User.findOne({ emailId: decoded.newEmail });
    
    if (existingUser && existingUser._id.toString() !== decoded.userId) {
      console.log('❌ ERROR: Email already taken by another user');
      
      // Clear the pending change
      user.pendingEmailChange = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'This email address is no longer available. Please try a different email.'
      });
    }

    // ALL CHECKS PASSED - Update email
    console.log('9️⃣ All checks passed! Updating email...');
    const oldEmail = user.emailId;
    user.emailId = decoded.newEmail;
    user.pendingEmailChange = undefined;
    await user.save();

    console.log('✅ EMAIL CHANGED SUCCESSFULLY!');
    console.log('   Old email:', oldEmail);
    console.log('   New email:', user.emailId);
    console.log('=============================================\n');

    // Send confirmation emails
    try {
      // Email to new address
      await sendEmail({
        to: decoded.newEmail,
        subject: 'Email Address Changed Successfully - TasteSphere',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">✅ Email Changed Successfully</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hello ${user.name || 'User'},
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your email address has been successfully changed to <strong>${decoded.newEmail}</strong>.
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                You can now use this email address to log into your TasteSphere account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                   style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
            </div>
          </div>
        `
      });

      // Email to old address
      if (oldEmail !== decoded.newEmail) {
        await sendEmail({
          to: oldEmail,
          subject: 'Email Address Changed - TasteSphere',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">TasteSphere</h1>
              </div>
              
              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                <h2 style="color: #333; margin-bottom: 20px;">Email Address Changed</h2>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  This is to inform you that the email address for your TasteSphere account has been changed from <strong>${oldEmail}</strong> to <strong>${decoded.newEmail}</strong>.
                </p>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  This email address is no longer associated with your account.
                </p>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                  <p style="color: #92400e; margin: 0; font-weight: bold;">
                    If you did not authorize this change, please contact support immediately at support@tastesphere.com
                  </p>
                </div>
              </div>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation emails:', emailError);
      // Don't fail the request if confirmation emails fail
    }

    res.status(200).json({
      success: true,
      message: 'Email address changed successfully! You can now login with your new email address.',
      newEmail: decoded.newEmail
    });

  } catch (error) {
    console.error('❌ Verify email change error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the email change. Please try again later.'
    });
  }
});

// ✅ 3. Change Password Route (NO CHANGES NEEDED)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('🔐 Change password request for user:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Hash and save new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    user.passwordHash = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    console.log('✅ Password changed successfully for user:', userId);

    // Send notification email (optional)
    try {
      await sendEmail({
        to: user.emailId,
        subject: 'Password Changed - TasteSphere',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f97316; margin: 0; font-size: 28px;">TasteSphere</h1>
              </div>
              
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #155724; margin: 0;">✅ Password Changed Successfully</h2>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Your password has been changed successfully from your account settings.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <p style="color: #333; margin: 0;">
                  <strong>Date & Time:</strong> ${new Date().toLocaleString()}
                </p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  🔒 <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
                </p>
              </div>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('⚠️ Failed to send password change notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while changing password. Please try again later.'
    });
  }
});

// ✅ 4. Password Reset Request Route - FIXED WITH DYNAMIC URL
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ emailId: cleanEmail });
    
    // Always return success response for security (don't reveal if user exists)
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link shortly.'
    };

    if (!user) {
      console.log('⚠️ Password reset requested for non-existent email:', cleanEmail);
      return res.status(200).json(successResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // ✅ CRITICAL FIX: Get frontend URL dynamically
    const frontendUrl = getFrontendUrl(req);
    const resetLink = `${frontendUrl}/reset-password-settings/${resetToken}`;

    console.log('📧 Generated reset link:', resetLink);
    console.log('📧 Sending password reset email to:', cleanEmail);

    await sendEmail({
      to: cleanEmail,
      subject: 'Password Reset Request - TasteSphere',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">TasteSphere</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${user.name || 'User'},
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have requested to reset your password for your TasteSphere account.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              If the button doesn't work, copy and paste this link:
            </p>
            <p style="color: #f97316; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetLink}
            </p>
            
            <div style="border-top: 1px solid #e5e5e5; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('✅ Password reset email sent successfully');

    res.status(200).json(successResponse);

  } catch (error) {
    console.error('❌ Reset password request error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again later.'
    });
  }
});

// ✅ 5. Verify Reset Token (NO CHANGES NEEDED)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
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
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token'
    });
  }
});

// ✅ 6. Reset Password (NO CHANGES NEEDED)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log('🔐 Reset password attempt');

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
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

    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    console.log('✅ Password reset successful for:', user.emailId);

    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

export default router;