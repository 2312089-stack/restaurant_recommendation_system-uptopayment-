// routes/auth.js - COMPLETE FIXED VERSION
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import passport from '../config/passport.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { 
  getProfile,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  logout,
  updateProfile,
  changePassword
} from '../controllers/authController.js';

const router = express.Router();

// ============================================================
// PASSPORT & GOOGLE OAUTH ROUTES
// ============================================================

// ✅ Passport Status Check (for debugging)
router.get('/passport-status', (req, res) => {
  const strategies = Object.keys(passport._strategies || {});
  const hasGoogle = strategies.includes('google');
  
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
  
  const strategies = Object.keys(passport._strategies || {});
  
  if (!strategies.includes('google')) {
    console.error('❌ Google strategy NOT registered!');
    return res.status(500).json({
      success: false,
      error: 'Google authentication not configured.'
    });
  }
  
  const isSignup = req.query.signup === 'true';
  console.log('  Context:', isSignup ? 'SIGNUP' : 'LOGIN');
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: isSignup ? 'signup' : 'login'
  })(req, res, next);
});

// ✅ Google OAuth - Callback
router.get('/google/callback',
  (req, res, next) => {
    console.log('\n📞 Google callback received');
    console.log('Query params:', req.query);
    
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
      console.log('\n✅ Google authentication successful');
      const user = req.user;

      if (!user) {
        console.error('❌ No user from Google OAuth');
        
        if (req.authInfo?.message === 'account_not_found') {
          return res.redirect(
            `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=account_not_found&message=Please sign up first`
          );
        }
        
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=no_user`);
      }

      console.log('✅ Generating JWT for user:', user.emailId);

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

      user.lastLogin = new Date();
      await user.save();

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

// ============================================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================================

// ✅ Login (NO account creation)
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
      return res.status(404).json({
        success: false,
        error: 'Account not found. Please sign up first.',
        hint: 'account_not_found'
      });
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'This account uses Google Sign-In. Please use "Continue with Google" button.',
        hint: 'google_only'
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
        error: 'Invalid password'
      });
    }

    const token = jwt.sign(
      { id: user._id, userId: user._id, emailId: user.emailId, email: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted || false,
        authProvider: user.authProvider
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

// ✅ Signin alias (same as login)
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
      return res.status(404).json({
        success: false,
        error: 'Account not found. Please sign up first.',
        hint: 'account_not_found'
      });
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'This account uses Google Sign-In. Please use "Continue with Google" button.',
        hint: 'google_only'
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
        error: 'Invalid password'
      });
    }

    const token = jwt.sign(
      { id: user._id, userId: user._id, emailId: user.emailId, email: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted || false,
        authProvider: user.authProvider
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

// ============================================================
// PASSWORD RESET ROUTES (NEW - ADDED)
// ============================================================

// ✅ Forgot Password - Send reset email
router.post('/forgot-password', forgotPassword);

// ✅ Reset Password - Update password with token
router.post('/reset-password/:token', resetPassword);

// ✅ Verify Reset Token - Check if token is valid
router.get('/verify-reset-token/:token', verifyResetToken);

// ============================================================
// USER MANAGEMENT ROUTES
// ============================================================

// ✅ Check if user exists
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required'
      });
    }
    
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ emailId: cleanEmail }).select('+passwordHash');
    
    if (!user) {
      return res.json({
        success: true,
        exists: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      exists: true,
      user: {
        email: user.emailId,
        hasPassword: !!user.passwordHash,
        hasGoogleId: !!user.googleId,
        authProvider: user.authProvider,
        onboardingCompleted: user.onboardingCompleted
      }
    });
    
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ============================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================

// ✅ Logout
router.post('/logout', authenticateToken, logout);

// ✅ Get Profile
router.get('/profile', authenticateToken, getProfile);

// ✅ Update Profile
router.put('/profile', authenticateToken, updateProfile);

// ✅ Change Password
router.post('/change-password', authenticateToken, changePassword);

// ============================================================
// UTILITY ROUTES
// ============================================================

// ✅ Health check
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes working',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'POST /login',
      'POST /signin',
      'POST /forgot-password',
      'POST /reset-password/:token',
      'GET /verify-reset-token/:token',
      'POST /logout',
      'GET /profile',
      'PUT /profile',
      'POST /change-password',
      'POST /check-user',
      'GET /google',
      'GET /google/callback'
    ]
  });
});

export default router;