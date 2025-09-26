// routes/reviewRoutes.js - Review API endpoints - FIXED
import express from 'express';
import {
  createReview,
  getDishReviews,
  getSellerReviews,
  markReviewHelpful,
  checkReviewEligibility,
  updateReview,
  deleteReview,
  respondToReview,
  reportReview
} from '../controllers/reviewController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authenticateSellerToken } from '../middleware/sellerAuth.js'; // FIXED: Import the correct function name

const router = express.Router();

// Public routes (no authentication required)
router.get('/dish/:dishId', getDishReviews); // Get reviews for a specific dish

// User routes (require user authentication)
router.post('/', authenticateUser, createReview); // Create new review
router.get('/eligibility/:dishId', authenticateUser, checkReviewEligibility); // Check if user can review
router.patch('/:reviewId/helpful', authenticateUser, markReviewHelpful); // Mark review as helpful
router.put('/:reviewId', authenticateUser, updateReview); // Update user's own review
router.delete('/:reviewId', authenticateUser, deleteReview); // Delete user's own review
router.post('/:reviewId/report', authenticateUser, reportReview); // Report inappropriate review

// Seller routes (require seller authentication) - FIXED: Use the correct function name
router.get('/seller/reviews', authenticateSellerToken, getSellerReviews); // Get all reviews for seller's dishes
router.post('/:reviewId/respond', authenticateSellerToken, respondToReview); // Seller response to review

export default router;