// models/Review.js - Review model schema
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Review content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // References
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true,
    index: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false // Optional reference to order
  },
  
  // User info (cached for performance)
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  
  // Dish info (cached for performance)
  dishName: {
    type: String,
    required: true
  },
  dishCategory: {
    type: String,
    required: true
  },
  
  // Restaurant info (cached for performance)
  restaurantName: {
    type: String,
    required: true
  },
  
  // Review metadata
  anonymous: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false // Set to true if user actually ordered the dish
  },
  
  // Helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Review status
  status: {
    type: String,
    enum: ['active', 'hidden', 'reported', 'deleted'],
    default: 'active'
  },
  
  // Moderation
  flagged: {
    type: Boolean,
    default: false
  },
  flagReasons: [String],
  moderatedAt: Date,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Photos (optional)
  photos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Response from restaurant
  restaurantResponse: {
    message: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reviewSchema.index({ dish: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, dish: 1 }, { unique: true }); // Prevent duplicate reviews
reviewSchema.index({ seller: 1, status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, createdAt: -1 });
reviewSchema.index({ helpfulCount: -1 });
reviewSchema.index({ verified: 1, rating: -1 });

// Virtual for display name
reviewSchema.virtual('displayName').get(function() {
  if (this.anonymous) {
    return 'Anonymous User';
  }
  // Show only first name and last initial for privacy
  const nameParts = this.userName.split(' ');
  if (nameParts.length > 1) {
    return `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`;
  }
  return nameParts[0];
});

// Virtual for relative time
reviewSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Method to check if user found review helpful
reviewSchema.methods.isHelpfulBy = function(userId) {
  return this.helpfulUsers.includes(userId);
};

// Method to toggle helpful vote
reviewSchema.methods.toggleHelpful = async function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isAlreadyHelpful = this.helpfulUsers.some(id => id.equals(userObjectId));
  
  if (isAlreadyHelpful) {
    this.helpfulUsers = this.helpfulUsers.filter(id => !id.equals(userObjectId));
    this.helpfulCount = Math.max(0, this.helpfulCount - 1);
  } else {
    this.helpfulUsers.push(userObjectId);
    this.helpfulCount += 1;
  }
  
  return this.save();
};

// Static method to get reviews for a dish
reviewSchema.statics.getForDish = function(dishId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'newest',
    rating = null,
    verified = null
  } = options;
  
  const skip = (page - 1) * limit;
  const query = {
    dish: dishId,
    status: 'active'
  };
  
  if (rating) query.rating = rating;
  if (verified !== null) query.verified = verified;
  
  let sort = {};
  switch (sortBy) {
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'highest':
      sort = { rating: -1, createdAt: -1 };
      break;
    case 'lowest':
      sort = { rating: 1, createdAt: -1 };
      break;
    case 'helpful':
      sort = { helpfulCount: -1, createdAt: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'emailId')
    .lean();
};

// Static method to get review statistics for a dish
reviewSchema.statics.getStatsForDish = async function(dishId) {
  const stats = await this.aggregate([
    {
      $match: {
        dish: new mongoose.Types.ObjectId(dishId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratings: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
  
  const result = stats[0];
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  result.ratings.forEach(rating => {
    distribution[rating]++;
  });
  
  return {
    totalReviews: result.totalReviews,
    averageRating: Number(result.averageRating.toFixed(1)),
    distribution
  };
};

// Pre-save middleware to update dish rating
reviewSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('rating')) {
    try {
      const Dish = mongoose.model('Dish');
      const stats = await this.constructor.getStatsForDish(this.dish);
      
      await Dish.findByIdAndUpdate(this.dish, {
        'rating.average': stats.averageRating,
        'rating.count': stats.totalReviews
      });
    } catch (error) {
      console.error('Error updating dish rating:', error);
    }
  }
  next();
});

// Pre-remove middleware to update dish rating
reviewSchema.pre('remove', async function(next) {
  try {
    const Dish = mongoose.model('Dish');
    const stats = await this.constructor.getStatsForDish(this.dish);
    
    await Dish.findByIdAndUpdate(this.dish, {
      'rating.average': stats.averageRating,
      'rating.count': stats.totalReviews
    });
  } catch (error) {
    console.error('Error updating dish rating after removal:', error);
  }
  next();
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;