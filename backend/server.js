// server.js - FIXED VERSION with proper environment loading
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
  
  console.log('✅ All critical environment variables are loaded');
};

// Validate environment before proceeding
validateEnv();

// Now import everything else
import express from 'express';
import cors from 'cors';
import connectDB from './connectDB.js';

// Import routes AFTER environment validation
import userRouter from './routes/userRouter.js';
import otpRouter from './routes/otpRouter.js';
import uploadRoutes from './routes/uploadRoutes.js';
import authRouter from './routes/auth.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentRoutes from './routes/payment.js';

import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';

// Connect to MongoDB
connectDB();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
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
    message: 'TasteSphere API is running!',
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      otp: '/api/otp',
      upload: '/api/upload',
      settings: '/api/settings-auth',
      addresses: '/api/addresses',
      payment: '/api/payment'
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ FIXED: Payment debugging middleware BEFORE route mounting
app.use('/api/payment', (req, res, next) => {
  console.log(`💳 Payment API: ${req.method} ${req.path}`, {
    body: req.method === 'POST' ? 'has body' : 'no body',
    headers: Object.keys(req.headers)
  });
  next();
});

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found` 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
  console.log('   🏠 GET  / (health check)');
  console.log('   🏠 GET  /health (detailed health)');
  console.log('   🔐 POST /api/auth/login');
  console.log('   🔐 POST /api/auth/forgot-password');
  console.log('   👤 POST /api/users (signup)');
  console.log('   📱 POST /api/otp/send');
  console.log('   📍 GET  /api/addresses');
  console.log('   💳 POST /api/payment/create-order');
  console.log('   ✅ POST /api/payment/verify-payment');
  console.log('   💵 POST /api/payment/create-cod-order');
  console.log('   ❤️  GET  /api/payment/health');
  console.log('🚀=================================🚀');
});