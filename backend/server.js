import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

import connectDB from './connectDB.js';
import { getAllowedOrigins, getMongoUri, validateCoreEnv } from './config/env.js';
import addressRoutes from './routes/addressRoutes.js';
import authRouter from './routes/auth.js';
import otpRouter from './routes/otpRouter.js';
import paymentRoutes from './routes/payment.js';
import settingsAuthRoutes from './routes/settingsAuth.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRouter from './routes/userRouter.js';

try {
  validateCoreEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

connectDB().catch((error) => {
  console.error('Failed to initialize database connection:', error.message);
  process.exit(1);
});

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
