// server.js - CORRECTED VERSION
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeSocket } from './config/socket.js';
import connectDB from './connectDB.js';
import sellerStatusManager from './utils/sellerStatusManager.js';

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

// Initialize Socket.IO and attach to app
const io = initializeSocket(httpServer);
app.set('io', io);

// Connect to database
connectDB();

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
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

// ==================== SELLER STATUS MANAGEMENT ====================

setInterval(() => {
  const inactiveCount = sellerStatusManager.cleanupInactiveSellers(30);
  if (inactiveCount > 0) {
    console.log(`Cleaned up ${inactiveCount} inactive sellers`);
  }
}, 10 * 60 * 1000);

// ==================== HEALTH CHECK ROUTES ====================

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TasteSphere API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  const dbStatus = global.mongoose?.connection?.readyState === 1;
  
  res.json({
    success: true,
    message: 'TasteSphere API Health Check',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus ? 'connected' : 'disconnected',
      socket: 'enabled',
      api: 'operational'
    }
  });
});

// ==================== API ROUTES ====================

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
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);

// Order routes MUST come before payment routes
app.use('/api/orders', orderRoutes);

// Payment routes
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
  console.log('TasteSphere Server Started');
  console.log('========================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Socket.IO: Enabled`);
  console.log(`Database: ${global.mongoose?.connection?.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nSeller Order Endpoints:');
  console.log('  POST   /api/seller/orders/:orderId/accept   - Accept order');
  console.log('  POST   /api/seller/orders/:orderId/reject   - Reject order');
  console.log('  PATCH  /api/seller/orders/:orderId/status   - Update status');
  console.log('\nCustomer Order Endpoints:');
  console.log('  POST   /api/orders              - Create order');
  console.log('  GET    /api/orders/history      - Order history');
  console.log('  GET    /api/orders/:orderId     - Single order');
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