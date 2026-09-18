import dotenv from 'dotenv';
dotenv.config();

await import('./config/passport.js');

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

import connectDB from './connectDB.js';
import { getAllowedOrigins, getMongoUri, validateCoreEnv } from './config/env.js';
import { ensureDefaultAdmin } from './utils/ensureDefaultAdmin.js';
import addressRoutes from './routes/addressRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRouter from './routes/auth.js';
import cartRoutes from './routes/cartRoutes.js';
import customerDiscoveryRoutes from './routes/customerDiscovery.js';
import orderHistoryRoutes from './routes/orderHistoryRoutes.js';
import otpRouter from './routes/otpRouter.js';
import sellerRouter from './routes/sellerRouter.js';
import paymentRoutes from './routes/payment.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRouter from './routes/userRouter.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

try {
  validateCoreEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Wait for MongoDB before opening the port so requests never hit a
// half-initialized database (avoids transient "database: disconnected").
await connectDB();

// Optional one-time demo seed for the customer pages. Set SEED_DEMO=1 in the
// environment to populate demo restaurants/dishes on boot (skips if data
// already exists). Remove the variable afterwards.
if (process.env.SEED_DEMO === '1') {
  try {
    const { seedDemoData } = await import('./seedDemoData.js');
    await seedDemoData({ connect: false });
  } catch (error) {
    console.error('Demo seed failed:', error.message);
  }
}

// Create/rotate the platform admin from ADMIN_EMAIL / ADMIN_PASSWORD when set.
try {
  await ensureDefaultAdmin();
} catch (error) {
  console.error('Admin bootstrap failed:', error.message);
}

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

import passport from 'passport';
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET || 'tastesphere-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured',
      email: process.env.EMAIL_USER ? 'configured' : 'not configured',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured',
    },
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
    },
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'TasteSphere API is running',
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      otp: '/api/otp',
      upload: '/api/upload',
      settings: '/api/settings-auth',
      addresses: '/api/addresses',
      payment: '/api/payment',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/otp', otpRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings-auth', settingsAuthRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/discovery', customerDiscoveryRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seller', sellerRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);

  if (err.message?.includes('not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }

  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong!'
    : err.message;

  return res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TasteSphere API listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database URI configured: ${Boolean(getMongoUri())}`);
  console.log(`Mongo connection state: ${mongoose.connection.readyState}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
