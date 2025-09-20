// server.js - COMPLETE UPDATED VERSION with seller profile and customer discovery
import dotenv from 'dotenv';

// Load environment variables FIRST - before any other imports
dotenv.config();

console.log('Environment check:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Found' : 'Missing');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Found' : 'Missing');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Found' : 'Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Found' : 'Missing');
console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ? 'Found' : 'Missing');

// Validate critical environment variables
const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];

  const optional = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'EMAIL_USER',
    'EMAIL_PASS',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing critical environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.log('\n💡 Please check your .env file and make sure all required variables are set.');
    process.exit(1);
  }

  const missingOptional = optional.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    console.log('⚠️ Optional environment variables not set:');
    missingOptional.forEach(key => {
      console.log(`   - ${key}`);
    });
    console.log('Some features may not work without these variables.');
  }
  
  console.log('✅ All critical environment variables are loaded');
};

// Validate environment before proceeding
validateEnv();

// Now import everything else
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './connectDB.js';

// Import routes AFTER environment validation
import userRouter from './routes/userRouter.js';
import otpRouter from './routes/otpRouter.js';
import uploadRoutes from './routes/uploadRoutes.js';
import authRouter from './routes/auth.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentRoutes from './routes/payment.js';

// Import seller routes
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';
import sellerOnboardingRoutes from './routes/sellerOnboarding.js';
import sellerProfileRoutes from './routes/sellerProfile.js';

// Import customer discovery routes
import customerDiscoveryRoutes from './routes/customerDiscovery.js';

// Get current directory for ES modules
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

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}
if (!fs.existsSync(sellersDir)) {
  fs.mkdirSync(sellersDir, { recursive: true });
  console.log('📁 Created sellers uploads directory');
}

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

// Extended health check with services
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
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
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
      discovery: '/api/discovery',
      
      // Seller routes
      seller: {
        auth: '/api/seller/auth',
        otp: '/api/seller/otp',
        onboarding: '/api/seller/onboarding',
        profile: '/api/seller/profile'
      }
    },
    timestamp: new Date().toISOString()
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

// Debug middleware for payment routes
app.use('/api/payment', (req, res, next) => {
  console.log(`💳 Payment API: ${req.method} ${req.path}`, {
    hasBody: ['POST', 'PATCH', 'PUT'].includes(req.method),
    headers: Object.keys(req.headers)
  });
  next();
});

// Mount all routes
// Customer routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/discovery', customerDiscoveryRoutes);

// Seller routes
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);
app.use('/api/seller/onboarding', sellerOnboardingRoutes);
app.use('/api/seller', sellerProfileRoutes); // This handles /api/seller/profile/*

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      discovery: '/api/discovery/*',
      seller: '/api/seller/*',
      payment: '/api/payment/*'
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
  console.log(`🌟 TasteSphere Server Started Successfully`);
  console.log('🚀=================================🚀');
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured'}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? 'configured' : 'not configured'}`);
  console.log(`📱 WhatsApp: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured'}`);
  console.log('🚀=================================🚀');
  console.log('📋 Available API Endpoints:');
  
  // Customer endpoints
  console.log('   👤 Customer Routes:');
  console.log('     🔐 POST /api/auth/login');
  console.log('     🔐 POST /api/auth/forgot-password');
  console.log('     👤 POST /api/users (signup)');
  console.log('     🔍 GET  /api/discovery/restaurants');
  console.log('     🔍 GET  /api/discovery/restaurant/:id');
  console.log('     🔍 GET  /api/discovery/restaurant/:id/menu');
  console.log('     🔍 GET  /api/discovery/featured');
  console.log('     🔍 GET  /api/discovery/nearby');
  console.log('     📍 GET  /api/addresses');
  console.log('     💳 POST /api/payment/create-order');
  console.log('     ✅ POST /api/payment/verify-payment');
  
  // Seller endpoints
  console.log('   🏪 Seller Routes:');
  console.log('     🔐 POST /api/seller/auth/signup');
  console.log('     🔐 POST /api/seller/auth/login');
  console.log('     🔐 POST /api/seller/auth/forgot-password');
  console.log('     👤 GET  /api/seller/profile');
  console.log('     👤 PATCH /api/seller/profile');
  console.log('     🍽️  POST /api/seller/menu/dish');
  console.log('     🍽️  GET  /api/seller/menu/dishes');
  console.log('     🍽️  PATCH /api/seller/menu/dish/:id');
  console.log('     🍽️  DELETE /api/seller/menu/dish/:id');
  console.log('     📊 GET  /api/seller/stats');
  console.log('     🏪 PATCH /api/seller/closure-toggle');
  console.log('     📋 POST /api/seller/onboarding/complete');
  
  // System endpoints
  console.log('   🔧 System Routes:');
  console.log('     🏠 GET  / (health check)');
  console.log('     🔍 GET  /health (detailed health)');
  console.log('     📋 GET  /api (API overview)');
  
  console.log('🚀=================================🚀');
  console.log('💡 Notes:');
  console.log('   - Make sure to create uploads/sellers directory');
  console.log('   - Set JWT_SECRET in your .env file');
  console.log('   - Configure optional services for full functionality');
  console.log('🚀=================================🚀');
});