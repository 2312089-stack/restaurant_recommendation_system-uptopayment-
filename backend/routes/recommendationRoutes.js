// routes/recommendationRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getPersonalizedRecommendations,
  updateUserBehavior,
  getRecommendationStats
} from '../controllers/recommendationController.js';
const router = express.Router();

// Get personalized recommendations (requires authentication)
router.get('/personalized', authenticateToken, getPersonalizedRecommendations);

// Update user behavior for better recommendations
router.post('/behavior', authenticateToken, updateUserBehavior);

// Get recommendation statistics (for admin/analytics)
router.get('/stats', getRecommendationStats);

export default router;