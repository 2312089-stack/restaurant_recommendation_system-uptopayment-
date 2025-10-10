// server.js - CRITICAL FIX: Load environment variables FIRST
import dotenv from 'dotenv';

// ⚠️ CRITICAL: Load .env BEFORE any other imports
const envResult = dotenv.config();

if (envResult.error) {
  console.error('❌ CRITICAL: Failed to load .env file:', envResult.error);
  process.exit(1);
}

// Verify critical variables are loaded
console.log('\n🔍 Environment Variable Check:');
console.log('✓ MONGODB_URI:', process.env.MONGODB_URI ? 'LOADED' : '❌ MISSING');
console.log('✓ RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'LOADED' : '❌ MISSING');
console.log('✓ RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'LOADED' : '❌ MISSING');
console.log('✓ JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED' : '❌ MISSING');
console.log('✓ EMAIL_USER:', process.env.EMAIL_USER ? 'LOADED' : '⚠️  OPTIONAL');
console.log('✓ TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'LOADED' : '⚠️  OPTIONAL\n');

// Verify Razorpay credentials specifically
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ CRITICAL: Razorpay credentials missing!');
  console.error('Please check your .env file contains:');
  console.error('  RAZORPAY_KEY_ID=rzp_test_...');
  console.error('  RAZORPAY_KEY_SECRET=...\n');
  process.exit(1);
}

// NOW import everything else
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeSocket } from './config/socket.js';
import connectDB from './connectDB.js';

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

// Import seller routes
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';
import sellerOnboardingRoutes from './routes/sellerOnboarding.js';
import sellerProfileRoutes from './routes/sellerProfile.js';
import sellerMenuRoutes from './routes/sellerMenu.js';
import reviewRoutes from './routes/reviewRoutes.js';
import sellerOrderRoutes from './routes/sellerOrderRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
app.set('io', io);

// Connect to database
connectDB();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Customer Authentication & User Management
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/settlement', settlementRoutes);

// Order history route
app.use('/api/order-history', orderHistoryRoutes);

// Customer Features
app.use('/api/upload', uploadRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// ⚠️ CRITICAL: Payment routes MUST come after .env is loaded
app.use('/api/payment', paymentRoutes);

// Seller Status
app.use('/api/seller-status', sellerStatusRoutes);

// Seller Authentication & Onboarding
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);
app.use('/api/seller/onboarding', sellerOnboardingRoutes);

// Seller Management
app.use('/api/seller/menu', sellerMenuRoutes);
app.use('/api/seller/profile', sellerProfileRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
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

// ==================== SERVER START ====================

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
  console.log('========================================');
  console.log('\n📋 Key Endpoints:');
  console.log('  GET    /api/payment/health             - Payment service status');
  console.log('  POST   /api/payment/create-order       - Create Razorpay order');
  console.log('  POST   /api/payment/verify-payment     - Verify payment');
  console.log('  POST   /api/payment/create-cod-order   - Create COD order');
  console.log('  GET    /api/order-history              - Get all orders');
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