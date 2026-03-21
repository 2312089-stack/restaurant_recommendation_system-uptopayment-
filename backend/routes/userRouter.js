// routes/userRouter.js - UPDATED WITH 6+ CHARACTER PASSWORD VALIDATION
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.json({ success: true, message: 'User routes working' });
});

// User creation endpoint - UPDATED PASSWORD VALIDATION
router.post('/', async (req, res) => {
  try {
    const { emailId, password } = req.body;

    // Clean and normalize email
    const cleanEmail = emailId ? emailId.trim().toLowerCase() : '';
    console.log('User creation attempt for email:', cleanEmail);

    // Validation
    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // UPDATED: Validate password - minimum 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // FIXED: Check if user already exists using case-insensitive search
    const existingUser = await User.findOne({ 
      emailId: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (existingUser) {
      console.log('Signup attempt failed - user already exists:', cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please try logging in instead.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      emailId: cleanEmail,
      passwordHash: hashedPassword
    });

    // Save user to database
    const savedUser = await newUser.save();
    console.log('New user created successfully:', cleanEmail);

    // Remove password from response
    const userResponse = {
      id: savedUser._id,
      emailId: savedUser.emailId,
      createdAt: savedUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('User creation error:', error.message);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Extract the duplicate key from the error
      const duplicateField = Object.keys(error.keyValue)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      console.log(`Duplicate key error: ${duplicateField} = ${duplicateValue}`);
      
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please try logging in instead.'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create account. Please try again.'
    });
  }
});

// Login endpoint - UPDATED PASSWORD VALIDATION
router.post('/login', async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // UPDATED: Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const cleanEmail = emailId.trim().toLowerCase();

    // FIXED: Use case-insensitive search for login too
    const user = await User.findOne({ 
      emailId: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Login successful
    const userResponse = {
      id: user._id,
      emailId: user.emailId,
      onboardingCompleted: user.onboardingCompleted || false
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// ✅ NEW: Update user preferences (onboarding endpoint)
router.put('/:userId/onboarding', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    console.log('🎯 Onboarding update for user:', userId);
    console.log('📋 Preferences received:', preferences);

    // Validate userId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    // Update user with preferences
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        preferences,
        onboardingCompleted: true
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ Onboarding completed successfully for:', user.emailId);

    res.json({ 
      success: true, 
      message: 'Preferences saved successfully',
      user: {
        id: user._id,
        emailId: user.emailId,
        preferences: user.preferences,
        onboardingCompleted: user.onboardingCompleted
      }
    });

  } catch (error) {
    console.error('❌ Onboarding error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save preferences. Please try again.' 
    });
  }
});

export default router;