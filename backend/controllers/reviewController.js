// controllers/reviewController.js - FIXED with proper validation
import Review from '../models/Review.js';
import Dish from '../models/Dish.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Helper function to safely parse integer
const safeParseInt = (value, defaultValue = null) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to validate rating
const validateRating = (rating) => {
  const parsed = safeParseInt(rating);
  return (parsed >= 1 && parsed <= 5) ? parsed : null;
};

// Create a new review
export const createReview = async (req, res) => {
  try {
    const { dishId, rating, title, comment, anonymous = false } = req.body;
    const userId = req.user.id;

    console.log('Creating review:', { dishId, rating, title, comment, userId });

    // Validation
    if (!dishId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Dish ID, rating, title, and comment are required'
      });
    }

    // FIXED: Proper rating validation
    const validRating = validateRating(rating);
    if (!validRating) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be a number between 1 and 5'
      });
    }

    // Check if user already reviewed this dish
    const existingReview = await Review.findOne({
      user: userId,
      dish: dishId,
      status: 'active'
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this dish'
      });
    }

    // Get dish and user details
    console.log('Fetching dish and user details...');
    const [dish, user] = await Promise.all([
      Dish.findById(dishId).populate('seller'),
      User.findById(userId)
    ]);

    if (!dish) {
      return res.status(404).json({
        success: false,
        error: 'Dish not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('Dish found:', { name: dish.name, seller: dish.seller?._id });

    // TODO: Check if user has actually ordered this dish (requires Order model)
    const hasOrdered = true; // Temporary - set to true for now

    // Create review with proper seller handling
    const reviewData = {
      title: title.trim(),
      comment: comment.trim(),
      rating: validRating,
      user: userId,
      dish: dishId,
      seller: dish.seller?._id || dish.sellerId || new mongoose.Types.ObjectId(), // Handle missing seller
      userName: user.emailId,
      userEmail: user.emailId,
      dishName: dish.name,
      dishCategory: dish.category,
      restaurantName: dish.restaurantName || dish.seller?.businessName || 'Unknown Restaurant',
      anonymous: Boolean(anonymous),
      verified: hasOrdered
    };

    console.log('Creating review with data:', reviewData);
    const review = new Review(reviewData);
    await review.save();

    console.log('Review created successfully:', review._id);

    // Return populated review
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'emailId')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: populatedReview
    });

  } catch (error) {
    console.error('Create review error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this dish'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get reviews for a specific dish
export const getDishReviews = async (req, res) => {
  try {
    const { dishId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'newest',
      rating = null,
      verified = null
    } = req.query;

    console.log('Getting dish reviews:', { dishId, page, limit, sortBy, rating, verified });

    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    // FIXED: Safe parsing with validation
    const options = {
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 10),
      sortBy,
      rating: validateRating(rating), // Will return null if invalid
      verified: verified !== null ? verified === 'true' : null
    };

    console.log('Parsed options:', options);

    const [reviews, stats, total] = await Promise.all([
      Review.getForDish(dishId, options),
      Review.getStatsForDish(dishId),
      Review.countDocuments({
        dish: dishId,
        status: 'active',
        ...(options.rating && { rating: options.rating }),
        ...(options.verified !== null && { verified: options.verified })
      })
    ]);

    console.log('Reviews fetched:', { count: reviews.length, total, stats });

    res.json({
      success: true,
      reviews,
      stats,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalReviews: total,
        hasNextPage: options.page < Math.ceil(total / options.limit),
        hasPrevPage: options.page > 1
      }
    });

  } catch (error) {
    console.error('Get dish reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get reviews for seller dashboard - FIXED
export const getSellerReviews = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const {
      page = 1,
      limit = 20,
      rating = null,
      status = 'active'
    } = req.query;

    console.log('Getting seller reviews:', { sellerId, page, limit, rating, status });

    // FIXED: Proper validation and parsing
    const parsedPage = safeParseInt(page, 1);
    const parsedLimit = safeParseInt(limit, 20);
    const validRating = validateRating(rating); // Will return null if invalid
    
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Build query object safely
    const query = {
      seller: sellerId,
      status: ['active', 'hidden', 'reported'].includes(status) ? status : 'active'
    };

    // Only add rating filter if it's valid
    if (validRating) {
      query.rating = validRating;
    }

    console.log('Query:', query);

    const [reviews, total, stats] = await Promise.all([
      Review.find(query)
        .populate('dish', 'name image category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Review.countDocuments(query),
      Review.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId), status: 'active' } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ])
    ]);

    console.log('Seller reviews results:', { 
      reviewCount: reviews.length, 
      total, 
      hasStats: stats.length > 0 
    });

    // Process stats safely
    let processedStats = {
      totalReviews: 0,
      averageRating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    if (stats.length > 0) {
      const stat = stats[0];
      processedStats.totalReviews = stat.totalReviews;
      processedStats.averageRating = Number(stat.averageRating.toFixed(1));
      
      stat.ratingDistribution.forEach(rating => {
        if (rating >= 1 && rating <= 5) {
          processedStats.distribution[rating]++;
        }
      });
    }

    res.json({
      success: true,
      reviews,
      stats: processedStats,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalReviews: total,
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1
      }
    });

  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller reviews',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark review as helpful
export const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    console.log('Marking review helpful:', { reviewId, userId });

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    if (review.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot vote on this review'
      });
    }

    await review.toggleHelpful(userId);

    res.json({
      success: true,
      message: 'Vote updated successfully',
      helpfulCount: review.helpfulCount
    });

  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update helpful vote'
    });
  }
};

// Check if user can review a dish
export const checkReviewEligibility = async (req, res) => {
  try {
    const { dishId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dish ID'
      });
    }

    // Check if user has already reviewed this dish
    const existingReview = await Review.findOne({
      user: userId,
      dish: dishId,
      status: 'active'
    });

    const hasReviewed = !!existingReview;

    // TODO: Check if user has ordered this dish (requires Order model)
    const hasOrdered = true; // Temporary - allow all users to review for now

    res.json({
      success: true,
      canReview: hasOrdered && !hasReviewed,
      hasReviewed,
      hasOrdered
    });

  } catch (error) {
    console.error('Check review eligibility error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check review eligibility'
    });
  }
};

// Update review (user can update their own review)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { rating, title, comment, anonymous } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
      status: 'active'
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you are not authorized to update it'
      });
    }

    // Update fields if provided
    if (rating !== undefined) {
      const validRating = validateRating(rating);
      if (!validRating) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be a number between 1 and 5'
        });
      }
      review.rating = validRating;
    }

    if (title !== undefined) review.title = title.trim();
    if (comment !== undefined) review.comment = comment.trim();
    if (anonymous !== undefined) review.anonymous = Boolean(anonymous);

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'emailId')
      .lean();

    res.json({
      success: true,
      message: 'Review updated successfully',
      review: populatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review'
    });
  }
};

// Delete review (user can delete their own review)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
      status: 'active'
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you are not authorized to delete it'
      });
    }

    // Soft delete - mark as deleted instead of removing
    review.status = 'deleted';
    await review.save();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review'
    });
  }
};

// Seller response to review
export const respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const sellerId = req.seller.id;
    const { message } = req.body;

    console.log('Seller responding to review:', { reviewId, sellerId, message });

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Response message is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      seller: sellerId,
      status: 'active'
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you are not authorized to respond'
      });
    }

    review.restaurantResponse = {
      message: message.trim(),
      respondedAt: new Date(),
      respondedBy: sellerId
    };

    await review.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      response: review.restaurantResponse
    });

  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
};

// Report review
export const reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Report reason is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    if (!review.flagged) {
      review.flagged = true;
      review.flagReasons = [];
    }

    if (!review.flagReasons.includes(reason.trim())) {
      review.flagReasons.push(reason.trim());
    }

    await review.save();

    res.json({
      success: true,
      message: 'Review reported successfully'
    });

  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report review'
    });
  }
};