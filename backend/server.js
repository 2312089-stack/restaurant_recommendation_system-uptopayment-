// server.js - CORRECTED VERSION
import dotenv from 'dotenv';
dotenv.config();
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
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
import customerOrderRoutes from './routes/customerOrderRoutes.js'; // Contains /history
import sellerStatusRoutes from './routes/sellerStatus.js';
import sellerStatusManager from './utils/sellerStatusManager.js';
// Import seller routes
import sellerAuthRoutes from './routes/sellerAuth.js';
import sellerOtpRoutes from './routes/sellerOtp.js';
import sellerOnboardingRoutes from './routes/sellerOnboarding.js';
import sellerProfileRoutes from './routes/sellerProfile.js';
import sellerMenuRoutes from './routes/sellerMenu.js';
import reviewRoutes from './routes/reviewRoutes.js';
import sellerOrderRoutes from './routes/sellerOrders.js';
import customerDiscoveryRoutes from './routes/customerDiscovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();
const httpServer = createServer(app);
const io = initializeSocket(httpServer);
app.set('io', io);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/seller-status', sellerStatusRoutes);

// Optional: Clean up inactive sellers every 10 minutes
setInterval(() => {
  sellerStatusManager.cleanupInactiveSellers(30);
}, 10 * 60 * 1000);
const uploadsDir = path.join(__dirname, 'uploads');
const sellersDir = path.join(uploadsDir, 'sellers');
[uploadsDir, sellersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Base routes
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TasteSphere API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API is running!',
    timestamp: new Date().toISOString(),
    services: {
      database: (global.mongoose?.connection?.readyState === 1) ? 'connected' : 'disconnected',
      socket: 'enabled'
    }
  });
});

// Mount all routes - CORRECT ORDER (NO DUPLICATES)
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/orders', customerOrderRoutes); // ✅ Handles: /create, /history, /stats/summary, /:orderId
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);

// Seller routes
app.use('/api/seller/auth', sellerAuthRoutes);
app.use('/api/seller/otp', sellerOtpRoutes);
app.use('/api/seller/onboarding', sellerOnboardingRoutes);
app.use('/api/seller/menu', sellerMenuRoutes);
app.use('/api/seller/profile', sellerProfileRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('🚀=================================🚀');
  console.log('🌟 TasteSphere Server Started');
  console.log('🚀=================================🚀');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: Enabled`);
  console.log('\n📋 Order Endpoints:');
  console.log('   POST   /api/orders/create - Create order');
  console.log('   GET    /api/orders/history - Get order history');
  console.log('   GET    /api/orders/stats/summary - Get statistics');
  console.log('   GET    /api/orders/:orderId - Get single order');
  console.log('   PATCH  /api/orders/:orderId/cancel - Cancel order');
});