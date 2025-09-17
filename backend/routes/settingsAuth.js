// routes/settingsAuth.js - COMPLETE CORRECTED VERSION
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// Get Current User Profile (for loading settings)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-passwordHash -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile data fetched for user:', user.emailId);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        preferences: user.preferences || {},
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        role: user.role,
        pendingEmailChange: user.pendingEmailChange ? {
          newEmail: user.pendingEmailChange.newEmail,
          expires: user.pendingEmailChange.expires
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load profile data'
    });
  }
});

// Change Email Route
router.put('/change-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'New email and current password are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();

    // Find the user with password hash
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ emailId: cleanNewEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already registered with another account'
      });
    }

    // Check if new email is same as current
    if (user.emailId === cleanNewEmail) {
      return res.status(400).json({
        success: false,
        message: 'New email must be different from current email'
      });
    }

    // Generate email verification token
    const emailVerificationToken = jwt.sign(
      { 
        userId: user._id, 
        newEmail: cleanNewEmail,
        type: 'email_change'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Store the pending email change in user document
    user.pendingEmailChange = {
      newEmail: cleanNewEmail,
      token: emailVerificationToken,
      expires: Date.now() + 60 * 60 * 1000,
      createdAt: new Date()
    };
    await user.save();

    // Create verification link
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email-change?token=${emailVerificationToken}`;

    // Send verification email to NEW email address
    const emailSubject = 'Verify Your New Email Address - TasteSphere';
    const emailBody = `
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
          <p style="color: #f97316; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${verificationLink}
          </p>
          
          <div style="border-top: 1px solid #e5e5e5; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
              <strong>Important Security Information:</strong>
            </p>
            <ul style="color: #999; font-size: 14px; line-height: 1.6;">
              <li>This link will expire in 1 hour for security reasons</li>
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
    `;

    await sendEmail({
      to: cleanNewEmail,
      subject: emailSubject,
      html: emailBody
    });

    // Also send notification to current email
    const notificationSubject = 'Email Change Request - TasteSphere';
    const notificationBody = `
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
    `;

    await sendEmail({
      to: user.emailId,
      subject: notificationSubject,
      html: notificationBody
    });

    res.status(200).json({
      success: true,
      message: `Verification email sent to ${cleanNewEmail}. Please check your inbox and click the verification link to complete the email change.`
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
});

// Verify Email Change Route
router.post('/verify-email-change', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    if (decoded.type !== 'email_change') {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user and verify pending email change
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.pendingEmailChange || user.pendingEmailChange.token !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email change request'
      });
    }

    // Check if new email is still available
    const existingUser = await User.findOne({ emailId: decoded.newEmail });
    if (existingUser && existingUser._id.toString() !== decoded.userId) {
      // Clear the pending change
      user.pendingEmailChange = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'This email address is no longer available. Please try a different email.'
      });
    }

    // Update user email
    const oldEmail = user.emailId;
    user.emailId = decoded.newEmail;
    user.pendingEmailChange = undefined;
    await user.save();

    // Send confirmation emails
    const confirmationSubject = 'Email Address Changed Successfully - TasteSphere';
    
    // Email to new address
    const newEmailBody = `
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
    `;

    await sendEmail({
      to: decoded.newEmail,
      subject: confirmationSubject,
      html: newEmailBody
    });

    // Email to old address (if different)
    if (oldEmail !== decoded.newEmail) {
      const oldEmailBody = `
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
      `;

      await sendEmail({
        to: oldEmail,
        subject: 'Email Address Changed - TasteSphere',
        html: oldEmailBody
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email address changed successfully! You can now login with your new email address.',
      data: {
        newEmail: decoded.newEmail
      }
    });

  } catch (error) {
    console.error('Verify email change error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the email change. Please try again later.'
    });
  }
});

// Change Password Route
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password is too long (maximum 128 characters)'
      });
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    user.passwordHash = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Send notification email
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
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password. Please try again later.'
    });
  }
});

// Password Reset Request Route
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ emailId: cleanEmail });
    
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link shortly.'
    };

    if (!user) {
      return res.status(200).json(successResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const emailSubject = 'Password Reset Request - TasteSphere';
    const emailBody = `
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
          <p style="color: #f97316; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${resetLink}
          </p>
          
          <div style="border-top: 1px solid #e5e5e5; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: cleanEmail,
      subject: emailSubject,
      html: emailBody
    });

    res.status(200).json(successResponse);

  } catch (error) {
    console.error('Reset password request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.'
    });
  }
});

export default router;
