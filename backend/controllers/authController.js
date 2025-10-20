// controllers/authController.js - FIXED EMAIL VERSION
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getIO } from '../config/socket.js'; // Add this import at top

// REGISTER/SIGNUP FUNCTION
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    console.log('Registration attempt - Email:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ emailId: cleanEmail });
    if (existingUser) {
      console.log('User already exists with email:', cleanEmail);
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      emailId: cleanEmail,
      passwordHash,
      name: name || '',
      isVerified: true,
      role: 'user',
      onboardingCompleted: false,
      preferences: {
        cuisines: [],
        dietary: '',
        spiceLevel: '',
        mealTypes: [],
        budget: '',
        favoriteDishes: []
      }
    });

    await newUser.save();

    console.log('User created successfully:', newUser.emailId);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, userId: newUser._id, emailId: newUser.emailId, email: newUser.emailId },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: newUser._id,
        emailId: newUser.emailId,
        name: newUser.name,
        onboardingCompleted: newUser.onboardingCompleted,
        preferences: newUser.preferences
      },
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
};

// SIGNIN/LOGIN FUNCTION
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt - Email:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ emailId: cleanEmail });
    if (!user) {
      console.log('User not found with email:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    console.log('User found:', user.emailId);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password validation:', isPasswordValid ? 'Success' : 'Failed');

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, userId: user._id, emailId: user.emailId, email: user.emailId },
      process.env.JWT_SECRET || "tastesphere-super-secret-jwt-key-2024-make-this-very-long-and-random-for-security",
      { expiresIn: "7d" }
    );

    console.log('Login successful for:', user.emailId);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted || false,
        preferences: user.preferences
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
};

// FIXED FORGOT PASSWORD FUNCTION
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('Starting forgot password process...');
    console.log('Email received:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('Clean email:', cleanEmail);

    // Search using emailId field
    const user = await User.findOne({ emailId: cleanEmail });
    
    if (!user) {
      console.log('User not found in database with emailId:', cleanEmail);
      
      // Still return success for security (don't reveal if user exists)
      return res.json({
        success: true,
        message: "If an account exists with this email, you will receive a reset link shortly."
      });
    }

    console.log('User found for password reset:', user.emailId);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    console.log('Reset token generated and saved to database');

    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log('Reset URL created:', resetURL);

    // FIXED EMAIL CONFIGURATION
    let transporter;
    
    // Check environment variables
    console.log('Environment check:');
    console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM ? 'Set' : 'Missing');
    console.log('  - EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Missing');

    // Configure email transporter
    if (process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD) {
      // Production Gmail setup
      console.log('Setting up Gmail transporter...');
      
      transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      console.log('Gmail transporter created successfully');
    } else {
      // Development mode with Ethereal
      console.log('Missing email configuration. Using Ethereal test service...');
      console.log('Add these to your .env file for production:');
      console.log('   EMAIL_FROM=your-gmail@gmail.com');
      console.log('   EMAIL_PASSWORD=your-16-character-app-password');
      
      const testAccount = await nodemailer.createTestAccount();
      console.log('Test account created:', testAccount.user);
      
      transporter = nodemailer.createTransporter({
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
      from: process.env.EMAIL_FROM || 'noreply@tastesphere.com',
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
      error.user.passwordResetToken = undefined;
      error.user.passwordResetExpires = undefined;
      await error.user.save({ validateBeforeSave: false });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to send reset email. Please try again later."
    });
  }
};
// controllers/authController.js - ADD THIS FUNCTION (keep existing functions)

export const updateSellerProfile = async (req, res) => {
  try {
    const sellerId = req.user?.sellerId || req.user?.id;
    
    if (!sellerId) {
      return res.status(401).json({
        success: false,
        error: "Seller not authenticated"
      });
    }

    // Get form data
    const {
      businessName, businessType, ownerName, phone, description,
      cuisine, priceRange, seatingCapacity, servicesOffered,
      street, city, state, zipCode, latitude, longitude, openingHours
    } = req.body;

    // Find seller
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "Seller not found"
      });
    }

    // Update basic info
    if (businessName) seller.businessName = businessName;
    if (businessType) seller.businessType = businessType;
    if (phone) seller.phone = phone;

    // Update business details
    if (!seller.businessDetails) seller.businessDetails = {};
    
    if (ownerName) seller.businessDetails.ownerName = ownerName;
    if (description) seller.businessDetails.description = description;
    if (priceRange) seller.businessDetails.priceRange = priceRange;
    if (seatingCapacity) seller.businessDetails.seatingCapacity = seatingCapacity;
    
    if (cuisine) {
      seller.businessDetails.cuisine = Array.isArray(cuisine) ? cuisine : [cuisine];
    }
    
    if (servicesOffered) {
      seller.businessDetails.servicesOffered = Array.isArray(servicesOffered) 
        ? servicesOffered 
        : [servicesOffered];
    }
    
    if (openingHours) {
      try {
        seller.businessDetails.openingHours = typeof openingHours === 'string' 
          ? JSON.parse(openingHours) 
          : openingHours;
      } catch (e) {
        console.error('Failed to parse opening hours:', e);
      }
    }

    // Update address
    if (!seller.address) seller.address = {};
    
    if (street) seller.address.street = street;
    if (city) seller.address.city = city;
    if (state) seller.address.state = state;
    if (zipCode) seller.address.zipCode = zipCode;
    
    if (latitude && longitude) {
      if (!seller.address.coordinates) seller.address.coordinates = {};
      seller.address.coordinates.latitude = parseFloat(latitude);
      seller.address.coordinates.longitude = parseFloat(longitude);
    }

    // Handle file uploads (logo and banner)
    if (req.files) {
      if (!seller.businessDetails.documents) {
        seller.businessDetails.documents = {};
      }
      
      if (req.files.logo) {
        seller.businessDetails.documents.logo = req.files.logo[0].path;
      }
      
      if (req.files.bannerImage) {
        seller.businessDetails.documents.bannerImage = req.files.bannerImage[0].path;
      }
    }

    // Check if profile is now complete
    const wasIncomplete = !seller.onboardingCompleted;
    const isNowComplete = seller.businessName && 
                          seller.phone && 
                          seller.address?.city &&
                          seller.businessDetails?.description &&
                          seller.businessDetails?.cuisine?.length > 0;

    if (isNowComplete) {
      seller.onboardingCompleted = true;
      seller.isVerified = true; // Auto-verify for now
    }

    await seller.save();

    console.log('✅ Seller profile updated:', sellerId);

    // ✅ EMIT REAL-TIME UPDATE TO ALL DISCOVERY PAGE USERS
    try {
      const io = getIO();
      
      // Prepare seller data for broadcast
      const sellerUpdate = {
        sellerId: seller._id.toString(),
        businessName: seller.businessName,
        businessType: seller.businessType,
        logo: seller.businessDetails?.documents?.logo,
        bannerImage: seller.businessDetails?.documents?.bannerImage,
        address: {
          city: seller.address?.city,
          state: seller.address?.state,
          street: seller.address?.street,
          zipCode: seller.address?.zipCode
        },
        cuisine: seller.businessDetails?.cuisine || [],
        priceRange: seller.businessDetails?.priceRange,
        rating: seller.metrics?.averageRating?.toFixed(1) || '0.0',
        isNewProfile: wasIncomplete && isNowComplete, // Flag for new profiles
        timestamp: new Date()
      };

      // Broadcast to all connected users
      io.emit('seller-profile-updated', sellerUpdate);
      
      console.log('📡 Broadcasted seller profile update to all users');
      
      // If it's a new profile completion, send special notification
      if (wasIncomplete && isNowComplete) {
        io.emit('new-restaurant-available', {
          restaurant: sellerUpdate,
          message: `New restaurant "${seller.businessName}" is now available!`
        });
        console.log('🎉 Broadcasted new restaurant notification');
      }
      
    } catch (socketError) {
      console.error('❌ Socket emission failed:', socketError);
      // Don't fail the request if socket fails
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      seller: {
        id: seller._id,
        businessName: seller.businessName,
        businessType: seller.businessType,
        onboardingCompleted: seller.onboardingCompleted,
        isVerified: seller.isVerified,
        email: seller.email
      }
    });

  } catch (error) {
    console.error('❌ Update seller profile error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile"
    });
  }
};

// RESET PASSWORD FUNCTION
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    console.log('Password reset attempt with token:', token ? 'Provided' : 'Missing');

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required"
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    // Check password confirmation if provided
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match"
      });
    }

    // Hash the token to compare with stored hashed version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('Looking for user with reset token...');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token. Please request a new password reset."
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
      message: "Password reset successful. You can now log in with your new password."
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// VERIFY RESET TOKEN FUNCTION
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('Verifying reset token:', token ? 'Provided' : 'Missing');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required"
      });
    }

    // Hash the token to compare with stored hashed version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token"
      });
    }

    console.log('Valid reset token for user:', user.emailId);

    res.json({
      success: true,
      message: "Token is valid",
      email: user.emailId
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// LOGOUT FUNCTION
export const logout = async (req, res) => {
  try {
    console.log('User logout');
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: "Logout failed"
    });
  }
};

// GET USER PROFILE FUNCTION
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get profile"
    });
  }
};

// UPDATE PROFILE FUNCTION
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { name, preferences } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (preferences !== undefined) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    console.log('Profile updated for:', user.emailId);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile"
    });
  }
};

// CHANGE PASSWORD FUNCTION
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long"
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New passwords do not match"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect"
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = hashedNewPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    console.log('Password changed for:', user.emailId);

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to change password"
    });
  }
};