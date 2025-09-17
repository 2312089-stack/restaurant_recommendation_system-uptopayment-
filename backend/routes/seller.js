// server/routes/seller.js - Main seller router
import express from 'express';
import sellerAuthRoutes from './seller/auth.js';
import sellerOtpRoutes from './seller/otp.js';

const router = express.Router();

// Mount seller sub-routes
router.use('/auth', sellerAuthRoutes);
router.use('/otp', sellerOtpRoutes);

// Health check for seller routes
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Seller routes are working',
    timestamp: new Date().toISOString()
  });
});

export default router;