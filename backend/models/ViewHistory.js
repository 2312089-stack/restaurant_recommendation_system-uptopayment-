// models/ViewHistory.js - Track dish view history
import mongoose from 'mongoose';

const viewHistorySchema = new mongoose.Schema({
  // User reference (optional for guest users)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Dish reference (required)
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    required: true,
    index: true
  },
  
  // Session ID for guest users
  sessionId: {
    type: String,
    index: true
  },
  
  // View timestamp
  viewedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Cached dish info for faster queries
  dishName: {
    type: String,
    required: true
  },
  
  dishPrice: {
    type: Number,
    required: true
  },
  
  dishImage: String,
  
  restaurantName: String,
  
  // Optional metadata
  ipAddress: String,
  userAgent: String,
  
  // Location data
  city: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
viewHistorySchema.index({ user: 1, dish: 1 });
viewHistorySchema.index({ sessionId: 1, dish: 1 });
viewHistorySchema.index({ dish: 1, viewedAt: -1 });
viewHistorySchema.index({ user: 1, viewedAt: -1 });
viewHistorySchema.index({ viewedAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Static method: Get recently viewed for a user
viewHistorySchema.statics.getRecentlyViewedByUser = async function(userId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $sort: { viewedAt: -1 }
    },
    {
      $group: {
        _id: '$dish',
        lastViewed: { $first: '$viewedAt' },
        dishName: { $first: '$dishName' },
        dishPrice: { $first: '$dishPrice' },
        dishImage: { $first: '$dishImage' },
        restaurantName: { $first: '$restaurantName' },
        viewCount: { $sum: 1 }
      }
    },
    {
      $sort: { lastViewed: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'dishes',
        localField: '_id',
        foreignField: '_id',
        as: 'dishDetails'
      }
    },
    {
      $unwind: {
        path: '$dishDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        dishId: '$_id',
        lastViewed: 1,
        viewCount: 1,
        dish: {
          $ifNull: ['$dishDetails', {
            _id: '$_id',
            name: '$dishName',
            price: '$dishPrice',
            image: '$dishImage',
            restaurantName: '$restaurantName'
          }]
        }
      }
    }
  ]);
};

// Static method: Get most viewed dishes globally
viewHistorySchema.statics.getMostViewed = async function(options = {}) {
  const {
    limit = 10,
    days = 7,
    city = null
  } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchStage = {
    viewedAt: { $gte: startDate }
  };
  
  if (city) {
    matchStage.city = city;
  }
  
  return this.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$dish',
        viewCount: { $sum: 1 },
        uniqueUsers: { $addToSet: { $ifNull: ['$user', '$sessionId'] } },
        lastViewed: { $max: '$viewedAt' },
        dishName: { $first: '$dishName' },
        dishPrice: { $first: '$dishPrice' },
        dishImage: { $first: '$dishImage' },
        restaurantName: { $first: '$restaurantName' }
      }
    },
    {
      $project: {
        dishId: '$_id',
        viewCount: 1,
        uniqueViewers: { $size: '$uniqueUsers' },
        lastViewed: 1,
        dishName: 1,
        dishPrice: 1,
        dishImage: 1,
        restaurantName: 1
      }
    },
    {
      $sort: { viewCount: -1, uniqueViewers: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'dishes',
        localField: 'dishId',
        foreignField: '_id',
        as: 'dishDetails'
      }
    },
    {
      $unwind: {
        path: '$dishDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        dishId: 1,
        viewCount: 1,
        uniqueViewers: 1,
        lastViewed: 1,
        dish: {
          $ifNull: ['$dishDetails', {
            _id: '$dishId',
            name: '$dishName',
            price: '$dishPrice',
            image: '$dishImage',
            restaurantName: '$restaurantName'
          }]
        }
      }
    }
  ]);
};

// Static method: Track a view
viewHistorySchema.statics.trackView = async function(data) {
  const { userId, dishId, sessionId, dishData, ipAddress, userAgent, city } = data;
  
  if (!dishId || !dishData) {
    throw new Error('Dish ID and dish data are required');
  }
  
  // For logged-in users, update or create view record
  if (userId) {
    const existingView = await this.findOne({
      user: userId,
      dish: dishId
    }).sort({ viewedAt: -1 });
    
    // Update if viewed within last hour, otherwise create new record
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (existingView && existingView.viewedAt > oneHourAgo) {
      existingView.viewedAt = new Date();
      return existingView.save();
    }
  }
  
  // Create new view record
  return this.create({
    user: userId || null,
    dish: dishId,
    sessionId: sessionId || null,
    dishName: dishData.name,
    dishPrice: dishData.price,
    dishImage: dishData.image || null,
    restaurantName: dishData.restaurantName || dishData.restaurant,
    ipAddress,
    userAgent,
    city,
    viewedAt: new Date()
  });
};

// Pre-save middleware to validate
viewHistorySchema.pre('save', function(next) {
  // Ensure either user or sessionId is present
  if (!this.user && !this.sessionId) {
    next(new Error('Either user or sessionId must be provided'));
  } else {
    next();
  }
});

const ViewHistory = mongoose.model('ViewHistory', viewHistorySchema);

export default ViewHistory;