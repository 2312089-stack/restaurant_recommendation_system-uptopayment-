// routes/viewHistoryRoutes.js - COMPLETE WORKING VERSION
import express from 'express';
import {
  trackView,
  getRecentlyViewed,
  getMostViewed,
  getDishViewStats,
  clearRecentlyViewed,
  getViewHistoryStatus,
  testViewTracking
} from '../controllers/viewHistoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Optional authentication - works for both guests and logged-in users
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    authenticateToken(req, res, (err) => {
      if (err) {
        req.user = null;
      }
      next();
    });
  } else {
    req.user = null;
    next();
  }
};

// ✅ Track view - works for BOTH guests and logged-in users
router.post('/track', optionalAuth, trackView);

// Get user's recently viewed dishes
router.get('/recently-viewed', authenticateToken, getRecentlyViewed);

// Get most viewed dishes globally (public)
router.get('/most-viewed', getMostViewed);

// Get view stats for specific dish (public)
router.get('/dish/:dishId/stats', getDishViewStats);

// Clear recently viewed history
router.delete('/recently-viewed', authenticateToken, clearRecentlyViewed);

// System status check (query params, not body)
router.get('/status', optionalAuth, getViewHistoryStatus);

// Test endpoint (development)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', optionalAuth, testViewTracking);
}

console.log('✅ View History routes loaded successfully');

export default router;