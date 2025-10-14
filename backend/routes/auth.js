// routes/auth.js - WITH DIAGNOSTICS
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import passport from '../config/passport.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getProfile } from '../controllers/authController.js';

const router = express.Router();

// ✅ DIAGNOSTIC ROUTE - Check Passport Status
router.get('/passport-status', (req, res) => {
  const strategies = Object.keys(passport._strategies || {});
  const hasGoogle = strategies.includes('google');
  
  console.log('🔍 Passport Status Check:');
  console.log('  Available strategies:', strategies);
  console.log('  Google strategy present:', hasGoogle ? '✅ YES' : '❌ NO');
  
  res.json({
    success: true,
    message: 'Passport Status',
    strategies: strategies,
    googleEnabled: hasGoogle,
    timestamp: new Date().toISOString()
  });
});

// ✅ Google OAuth - Initiate
router.get('/google', (req, res, next) => {
  console.log('\n🚀 Initiating Google OAuth...');
  
  // Check if strategy exists
  const strategies = Object.keys(passport._strategies || {});
  console.log('  Available strategies:', strategies);
  
  if (!strategies.includes('google')) {
    console.error('❌ Google strategy NOT registered!');
    return res.status(500).json({
      success: false,
      error: 'Google authentication not configured. Check server logs.',
      strategies: strategies
    });
  }
  
  console.log('✅ Google strategy found, proceeding...');
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

// ✅ Google OAuth - Callback
router.get('/google/callback',
  (req, res, next) => {
    console.log('\n📞 Google callback received');
    console.log('  Query params:', req.query);
    
    const strategies = Object.keys(passport._strategies || {});
    if (!strategies.includes('google')) {
      console.error('❌ Google strategy NOT registered at callback!');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=google_not_configured`);
    }
    
    next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=google_auth_failed`
  }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        console.error('❌ No user from Google OAuth');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=no_user`);
      }

      console.log('✅ Google OAuth successful for:', user.emailId);

      // Generate JWT
      const token = jwt.sign(
        {
          id: user._id,
          userId: user._id,
          emailId: user.emailId,
          email: user.emailId,
          authProvider: user.authProvider
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Redirect to frontend
      const redirectUrl = user.onboardingCompleted
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-success?token=${token}&onboarded=true`
        : `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth-success?token=${token}&onboarded=false`;

      console.log('🔀 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);

    } catch (error) {
      console.error('❌ Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=auth_failed`);
    }
  }
);

// Regular login
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
    const user = await User.findOne({ emailId: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        error: 'This account uses Google Sign-In. Please use "Continue with Google" button.'
      });
    }

    if (!user.passwordHash) {
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
      process.env.JWT_SECRET,
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

// Signin alias
router.post('/signin', async (req, res) => {
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
    const user = await User.findOne({ emailId: cleanEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        error: 'This account uses Google Sign-In. Please use "Continue with Google" button.'
      });
    }

    if (!user.passwordHash) {
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
      process.env.JWT_SECRET,
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

// Get profile
router.get('/profile', authenticateToken, getProfile);

// Health check
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes working',
    timestamp: new Date().toISOString()
  });
});

export default router;