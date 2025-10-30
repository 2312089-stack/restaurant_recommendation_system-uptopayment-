// server.js - FIXED: Proper route ordering for frontend serving
// ⚠️ CRITICAL: Load environment variables FIRST
import dotenv from 'dotenv';

// Load .env file (but don't fail in production where Render provides env vars)
const envResult = dotenv.config();

if (envResult.error) {
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️  .env file not found - using platform environment variables (Render/Heroku)');
  } else {
    console.error('❌ CRITICAL: Failed to load .env file:', envResult.error);
    console.error('Please create a .env file in the backend directory for local development');
    process.exit(1);
  }
}

// Verify critical environment variables
console.log('\n🔍 Environment Variable Check:');
console.log('✓ NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('✓ MONGODB_URI:', process.env.MONGODB_URI ? 'LOADED ✅' : '❌ MISSING');
console.log('✓ JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED ✅' : '❌ MISSING');
console.log('✓ RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'LOADED ✅' : '❌ MISSING');
console.log('✓ RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'LOADED ✅' : '❌ MISSING');
console.log('✓ GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'LOADED ✅' : '⚠️  OPTIONAL');
console.log('✓ GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'LOADED ✅' : '⚠️  OPTIONAL');
console.log('✓ EMAIL_USER:', process.env.EMAIL_USER ? 'LOADED ✅' : '⚠️  OPTIONAL');
console.log('✓ TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'LOADED ✅' : '⚠️  OPTIONAL\n');

// Verify critical variables are present
const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these in Render Dashboard → Environment tab\n');
  process.exit(1);
}

// NOW import everything else AFTER environment variables are loaded
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeSocket } from './config/socket.js';
import connectDB from './connectDB.js';
import passport from 'passport';

// ✅ Import passport configuration
console.log('🔧 Loading Passport module...');
const passportModule = await import('./config/passport.js');
const configurePassport = passportModule.configurePassport;

console.log('🔧 Calling Passport configuration function...');
const passportConfigured = configurePassport();

if (!passportConfigured) {
  console.error('❌ WARNING: Passport configuration failed!');
  console.error('Google Sign-In will NOT work.\n');
} else {
  console.log('✅ Passport configured successfully!\n');
}

// Import customer routes
import userRouter from './routes/userRouter.js';
import otpRouter from './routes/otpRouter.js';
import uploadRoutes from './routes/uploadRoutes.js';
import authRouter from './routes/auth.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentRoutes from './routes/payment.js';
import cartRoutes from './routes/cartRoutes.js';
import dishRoutes from './routes/dishRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import customerOrderRoutes from './routes/customerOrderRoutes.js';
import sellerStatusRoutes from './routes/sellerStatus.js';
import customerDiscoveryRoutes from './routes/customerDiscovery.js';
import orderHistoryRoutes from './routes/orderHistoryRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import reorderRoutes from './routes/reorderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import sellerStatusRoutesV2 from './routes/sellerStatusRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import notificationScheduler from './schedulers/notificationScheduler.js';
import adminFAQRoutes from './routes/adminFAQRoutes.js';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js';
import adminBankRoutes from './routes/adminBankRoutes.js';

// Import seller routes
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';
import sellerOnboardingRoutes from './routes/sellerOnboarding.js';
import sellerProfileRoutes from './routes/sellerProfile.js';
import sellerMenuRoutes from './routes/sellerMenu.js';
import reviewRoutes from './routes/reviewRoutes.js';
import sellerOrderRoutes from './routes/sellerOrderRoutes.js';
import trendingRoutes from './routes/trendingRoutes.js';
import viewHistoryRoutes from './routes/viewHistoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sellerSettingsRoutes from './routes/sellerSettings.js';
import sellerSupportRoutes from './routes/sellerSupport.js';
import offerRoutes from './routes/offerRoutes.js';
import customerSupportRoutes from './routes/customerSupport.js';
import adminRoutes from './routes/adminRoutes.js';
import adminSupportRoutes from './routes/adminSupport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
app.set('io', io);

// Connect to database
connectDB().then(() => {
  console.log('✅ Database connected');
  
  // Start notification scheduler
  notificationScheduler.startAllJobs();
  console.log('✅ Notification scheduler started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping notification jobs...');
  notificationScheduler.stopAllJobs();
  process.exit(0);
});

app.use(cors({
  origin: [
    // Local development
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://localhost:5174',
    
    // Production - UPDATE THIS with your actual Vercel URL
    'https://restaurant-recommendation-system-up.vercel.app',
    'https://your-actual-vercel-url.vercel.app', // Replace with your real URL
    
    // Allow any Vercel preview deployments (optional)
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Initialize passport middleware
app.use(passport.initialize());

console.log('✅ Passport middleware initialized');

// Verify Google OAuth is configured
const googleOAuthEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (googleOAuthEnabled) {
  console.log('✅ Google OAuth configured successfully');
} else {
  console.log('⚠️  Google OAuth disabled (credentials not provided)');
}

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==================== STATIC FILES ====================
const uploadsDir = path.join(__dirname, 'uploads');
const sellersDir = path.join(uploadsDir, 'sellers');
const dishesDir = path.join(uploadsDir, 'dishes');

[uploadsDir, sellersDir, dishesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    console.log(`Created directory: ${dir}`);
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== API ROUTES ====================

// Notifications (must be before other routes)
app.use('/api/notifications', notificationRoutes);

// Customer Authentication & User Management
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/settings-auth', settingsAuthRoutes);

// Customer Features
app.use('/api/upload', uploadRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);

// Customer Discovery & Search
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/view-history', viewHistoryRoutes);

// Orders & Payments
app.use('/api/orders', orderRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/reorder', reorderRoutes);

// Customer Support
app.use('/api/support', customerSupportRoutes);

// Seller Status
app.use('/api/seller-status', sellerStatusRoutes);
app.use('/api/seller-status-v2', sellerStatusRoutesV2);

// Seller Authentication & Onboarding
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);
app.use('/api/seller/onboarding', sellerOnboardingRoutes);

// Seller Management
app.use('/api/seller/profile', sellerProfileRoutes);
app.use('/api/seller/menu', sellerMenuRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);
app.use('/api/seller/analytics', analyticsRoutes);
app.use('/api/seller/settings', sellerSettingsRoutes);
app.use('/api/seller/offers', offerRoutes);
app.use('/api/seller/support', sellerSupportRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/bank-details', adminBankRoutes);
app.use('/api/admin/faqs', adminFAQRoutes);
app.use('/api/admin/support', adminSupportRoutes);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  const dbStatus = global.mongoose?.connection?.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    success: true,
    message: '🍽️ TasteSphere API Server',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbStatus,
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      notifications: true,
      socketIO: true
    },
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      auth: '/api/auth/*',
      orders: '/api/orders/*',
      seller: '/api/seller/*',
      admin: '/api/admin/*'
    },
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'TasteSphere API',
    version: '1.0.0',
    documentation: 'https://tastesphere.onrender.com/api/docs',
    endpoints: {
      authentication: {
        googleOAuth: 'GET /api/auth/google',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      orders: {
        history: 'GET /api/order-history',
        create: 'POST /api/orders',
        track: 'GET /api/orders/:id'
      },
      payment: {
        health: 'GET /api/payment/health',
        createOrder: 'POST /api/payment/create-order',
        verify: 'POST /api/payment/verify-payment',
        cod: 'POST /api/payment/create-cod-order'
      },
      seller: {
        support: 'POST /api/seller/support/tickets',
        menu: 'GET /api/seller/menu',
        orders: 'GET /api/seller/orders'
      },
      admin: {
        support: 'GET /api/admin/support/tickets',
        analytics: 'GET /api/admin/analytics'
      }
    }
  });
});

// Favicon handler (to avoid clutter in logs)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==================== SERVE FRONTEND (PRODUCTION) ====================
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../project/dist');
  
  // Check if frontend build exists
  if (fs.existsSync(frontendDistPath)) {
    console.log('✅ Serving React frontend from:', frontendDistPath);
    
    // Serve static files from React build
    app.use(express.static(frontendDistPath));
    
    // Serve index.html for all non-API routes (SPA support)
    // This MUST come after all API routes
    // Use middleware instead of app.get('*')
    app.use((req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      const indexPath = path.join(frontendDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).json({
          success: false,
          error: 'Frontend index.html not found',
          path: indexPath
        });
      }
    });
  } else {
    console.log('⚠️  Frontend build not found at:', frontendDistPath);
    console.log('⚠️  Serving API-only mode');
    
    // Fallback: Show helpful message
    app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: '🍽️ TasteSphere API Server',
        warning: 'Frontend build not found',
        note: 'Run "cd project && npm run build" to create production build',
        api: {
          health: '/api/health',
          docs: '/api',
          endpoints: '/api/health'
        }
      });
    });
    
    // 404 for non-API routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Frontend not deployed. API routes available at /api/*',
        requestedPath: req.path
      });
    });
  }
} else {
  // Development: Show API-only message
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '🍽️ TasteSphere API Server (Development Mode)',
      note: 'Frontend should run separately on http://localhost:5173',
      api: {
        health: 'http://localhost:5000/api/health',
        docs: 'http://localhost:5000/api'
      }
    });
  });
}

// ==================== ERROR HANDLING ====================

// Global Error Handler (must be last)
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// ==================== SERVER START ===================
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🍽️  TasteSphere Server Started');
  console.log('========================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: Enabled`);
  console.log(`💾 Database: ${global.mongoose?.connection?.readyState === 1 ? 'Connected ✅' : 'Connecting...'}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`🔐 Google OAuth: ${googleOAuthEnabled ? 'Configured ✅' : 'Disabled ⚠️'}`);
  
  // Check if frontend exists in production
  if (process.env.NODE_ENV === 'production') {
    const frontendExists = fs.existsSync(path.join(__dirname, '../project/dist'));
    console.log(`🎨 Frontend: ${frontendExists ? 'Deployed ✅' : 'Not found ⚠️'}`);
  }
  
  console.log('========================================');
  console.log('\n📋 Key Endpoints:');
  if (googleOAuthEnabled) {
    console.log('  GET    /api/auth/google                - Google OAuth login');
    console.log('  GET    /api/auth/google/callback       - Google OAuth callback');
  }
  console.log('  POST   /api/auth/login                 - Email/password login');
  console.log('  POST   /api/auth/signin                - Email/password signin (alias)');
  console.log('  GET    /api/auth/profile               - Get user profile');
  console.log('  GET    /api/payment/health             - Payment service status');
  console.log('  POST   /api/payment/create-order       - Create Razorpay order');
  console.log('  POST   /api/payment/verify-payment     - Verify payment');
  console.log('  POST   /api/payment/create-cod-order   - Create COD order');
  console.log('  GET    /api/order-history              - Get all orders');
  console.log('  POST   /api/seller/support/tickets     - Create support ticket');
  console.log('  GET    /api/admin/support/tickets      - View all tickets (admin)');
  console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;