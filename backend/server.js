// server.js - FIXED VERSION with Cart Routes Integration
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Validate critical environment variables
const validateEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing critical environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Please check your .env file and make sure all required variables are set.');
    process.exit(1);
  }
  
  console.log('✅ All critical environment variables are loaded');
};

validateEnv();

// Now import everything else
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './connectDB.js';

// Import customer routes
import userRouter from './routes/userRouter.js';
import otpRouter from './routes/otpRouter.js';
import uploadRoutes from './routes/uploadRoutes.js';
import authRouter from './routes/auth.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentRoutes from './routes/payment.js';
import cartRoutes from './routes/cartRoutes.js'; // Cart routes import
import dishRoutes from './routes/dishRoutes.js';

// Import seller routes
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';
import sellerOnboardingRoutes from './routes/sellerOnboarding.js';
import sellerProfileRoutes from './routes/sellerProfile.js';
import sellerMenuRoutes from './routes/sellerMenu.js';
import reviewRoutes from './routes/reviewRoutes.js';

// Import customer discovery routes
import customerDiscoveryRoutes from './routes/customerDiscovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const sellersDir = path.join(uploadsDir, 'sellers');
[uploadsDir, sellersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Base health check
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TasteSphere API is running!',
    timestamp: new Date().toISOString()
  });
});

// Extended health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API is running!',
    timestamp: new Date().toISOString(),
    services: {
      database: (global.mongoose && global.mongoose.connection && global.mongoose.connection.readyState === 1) 
        ? 'connected' 
        : 'disconnected',
      razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured',
      email: process.env.EMAIL_USER ? 'configured' : 'not configured',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured'
    }
  });
});

// API overview
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API Routes',
    routes: {
      // Customer routes
      auth: '/api/auth',
      users: '/api/users', 
      otp: '/api/otp',
      upload: '/api/upload',
      settings: '/api/settings-auth',
      addresses: '/api/addresses',
      payment: '/api/payment',
      cart: '/api/cart', // Added cart route
      discovery: '/api/discovery',
      
      // Seller routes
      seller: {
        auth: '/api/seller/auth',
        otp: '/api/seller/otp',
        onboarding: '/api/seller/onboarding',
        profile: '/api/seller/profile',
        menu: '/api/seller/menu'
      }
    }
  });
});

// Debug middleware for seller routes
app.use('/api/seller', (req, res, next) => {
  console.log(`🏪 Seller API: ${req.method} ${req.path}`, {
    hasBody: ['POST', 'PATCH', 'PUT'].includes(req.method),
    contentType: req.headers['content-type'],
    hasAuth: req.headers.authorization ? 'Yes' : 'No'
  });
  next();
});

// Debug middleware for discovery routes
app.use('/api/discovery', (req, res, next) => {
  console.log(`🔍 Discovery API: ${req.method} ${req.path}`, {
    query: Object.keys(req.query).length > 0 ? Object.keys(req.query) : 'none',
    hasAuth: req.headers.authorization ? 'Yes' : 'No'
  });
  next();
});

// Debug middleware for cart routes
app.use('/api/cart', (req, res, next) => {
  console.log(`🛒 Cart API: ${req.method} ${req.path}`, {
    hasBody: ['POST', 'PATCH', 'PUT'].includes(req.method),
    hasAuth: req.headers.authorization ? 'Yes' : 'No'
  });
  next();
});

// Mount all routes in the correct order
// Customer routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cart', cartRoutes); // Mount cart routes
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);

// Seller routes - MOUNT SPECIFIC ROUTES FIRST
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);
app.use('/api/seller/onboarding', sellerOnboardingRoutes);
app.use('/api/seller/menu', sellerMenuRoutes);        // Menu routes FIRST
app.use('/api/seller/profile', sellerProfileRoutes);   // Profile routes SECOND

// SAFE 404 handler - using standard middleware signature instead of catch-all route
app.use((req, res, next) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found`,
    message: 'The requested endpoint does not exist',
    availableRoutes: {
      customer: {
        auth: '/api/auth/*',
        users: '/api/users/*',
        cart: '/api/cart/*', // Added to available routes
        discovery: '/api/discovery/*',
        payment: '/api/payment/*'
      },
      seller: {
        auth: '/api/seller/auth/*',
        profile: '/api/seller/profile/*',
        menu: '/api/seller/menu/*'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 5MB.'
    });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only images and PDFs are allowed.'
    });
  }

  // Handle MongoDB errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.message 
    })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀=================================🚀');
  console.log('🌟 TasteSphere Server Started Successfully');
  console.log('🚀=================================🚀');
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀=================================🚀');
  console.log('📋 Available API Endpoints:');
  
  // Customer endpoints
  console.log('   👤 Customer Routes:');
  console.log('     🔐 POST /api/auth/login');
  console.log('     👤 POST /api/users (signup)');
  console.log('     🛒 GET  /api/cart (get cart)');
  console.log('     🛒 POST /api/cart/add (add to cart)');
  console.log('     🛒 PUT  /api/cart/item/:dishId (update quantity)');
  console.log('     🛒 DELETE /api/cart/item/:dishId (remove item)');
  console.log('     🛒 DELETE /api/cart/clear (clear cart)');
  console.log('     🛒 GET  /api/cart/summary (cart summary)');
  console.log('     🔍 GET  /api/discovery/dishes/popular');
  console.log('     🔍 GET  /api/discovery/dishes/recommended');
  console.log('     🔍 GET  /api/discovery/dishes/featured');
  console.log('     🔍 GET  /api/discovery/restaurants');
  console.log('     🔍 GET  /api/discovery/restaurant/:id');
  console.log('     🔍 GET  /api/discovery/search');
  console.log('     📍 GET  /api/addresses');
  console.log('     💳 POST /api/payment/create-order');
  
  // Seller endpoints
  console.log('   🏪 Seller Routes:');
  console.log('     🔐 POST /api/seller/auth/signup');
  console.log('     🔐 POST /api/seller/auth/login');
  console.log('     👤 GET  /api/seller/profile');
  console.log('     👤 PATCH /api/seller/profile');
  
  // Menu management endpoints
  console.log('   🍽️  Seller Menu Routes:');
  console.log('     🍽️  POST /api/seller/menu/dish');
  console.log('     🍽️  GET  /api/seller/menu/dishes');
  console.log('     🍽️  GET  /api/seller/menu/dish/:id');
  console.log('     🍽️  PATCH /api/seller/menu/dish/:id');
  console.log('     🍽️  DELETE /api/seller/menu/dish/:id');
  console.log('     🔄 PATCH /api/seller/menu/dish/:id/toggle');
  console.log('     📊 GET  /api/seller/menu/analytics');
  console.log('     📊 GET  /api/seller/menu/stats');
  
  // System endpoints
  console.log('   🔧 System Routes:');
  console.log('     🏠 GET  / (health check)');
  console.log('     🔍 GET  /health (detailed health)');
  console.log('     📋 GET  /api (API overview)');
  
  console.log('🚀=================================🚀');
  console.log('💡 Key Features Ready:');
  console.log('   ✅ Complete cart management system');
  console.log('   ✅ Add to cart from discovery page');
  console.log('   ✅ Professional cart page with quantity controls');
  console.log('   ✅ Cart persistence across sessions');
  console.log('   ✅ Real-time cart updates');
  console.log('   ✅ One restaurant per cart validation');
  console.log('   ✅ Seller can add/manage dishes');
  console.log('   ✅ Dishes appear immediately in customer discovery');
  console.log('   ✅ Real-time popularity tracking');
  console.log('   ✅ Location-based dish discovery');
  console.log('   ✅ Search and filter capabilities');
  console.log('🚀=================================🚀');
});