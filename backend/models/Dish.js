// models/Dish.js - COMPLETE FIXED VERSION
import mongoose from 'mongoose';

const dishSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Dish name is required'],
    trim: true,
    maxlength: [100, 'Dish name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  // Category & Type
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        'Starters', 'Main Course', 'Desserts', 'Beverages',
        'Chinese', 'Indian', 'Continental', 'South Indian'
      ],
      message: '{VALUE} is not a valid category'
    }
  },
  
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['veg', 'non-veg'],
      message: '{VALUE} is not a valid type'
    },
    default: 'veg'
  },
  
  // Availability & Settings
  availability: {
    type: Boolean,
    default: true,
    index: true
  },
  
  preparationTime: {
    type: Number,
    default: 30,
    min: [5, 'Preparation time must be at least 5 minutes'],
    max: [120, 'Preparation time cannot exceed 120 minutes']
  },
  
  image: {
    type: String,
    default: null
  },
  
  // ✅ CRITICAL: Seller References (both fields for compatibility)
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller reference is required'],
    index: true
  },
  
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Restaurant ID is required'],
    index: true
  },
  
  // Seller Details (denormalized for performance)
  sellerName: {
    type: String,
    required: true
  },
  
  restaurantName: {
    type: String,
    required: true
  },
  
  // Location Information
  location: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  
  // Rating System
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Analytics
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status Flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Offers & Promotions
  offer: {
    hasOffer: {
      type: Boolean,
      default: false
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 70
    },
    validUntil: Date
  },
  
  // Additional Details
  ingredients: [String],
  
  nutritionalInfo: {
    calories: Number,
    protein: String,
    carbs: String,
    fat: String,
    fiber: String
  },
  
  allergens: [String],
  
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot', null],
    default: null
  },
  
  tags: [String]
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ CRITICAL: Pre-save hook to sync seller and restaurantId
dishSchema.pre('save', function(next) {
  // Sync seller and restaurantId if one is missing
  if (this.seller && !this.restaurantId) {
    this.restaurantId = this.seller;
  }
  if (this.restaurantId && !this.seller) {
    this.seller = this.restaurantId;
  }
  next();
});

// ✅ Indexes for Query Performance
dishSchema.index({ seller: 1, availability: 1 });
dishSchema.index({ restaurantId: 1, availability: 1 });
dishSchema.index({ category: 1, availability: 1 });
dishSchema.index({ type: 1, availability: 1 });
dishSchema.index({ 'location.city': 1, availability: 1 });
dishSchema.index({ orderCount: -1 });
dishSchema.index({ 'rating.average': -1 });
dishSchema.index({ isActive: 1, availability: 1 });
dishSchema.index({ createdAt: -1 });

// ✅ Text Search Index
dishSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    description: 1
  }
});

// ✅ Virtual Properties
dishSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

dishSchema.virtual('currentPrice').get(function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    const discount = Math.round(this.price - (this.price * this.offer.discountPercentage / 100));
    return `₹${discount}`;
  }
  return `₹${this.price}`;
});

dishSchema.virtual('ratingDisplay').get(function() {
  return this.rating.average > 0 ? this.rating.average.toFixed(1) : 'New';
});

dishSchema.virtual('offerText').get(function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    return `${this.offer.discountPercentage}% OFF`;
  }
  return null;
});

// ✅ Instance Methods

// Increment view count
dishSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Increment order count
dishSchema.methods.incrementOrderCount = function() {
  this.orderCount += 1;
  return this.save();
};

// Update rating
dishSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

// Check if dish is available
dishSchema.methods.isAvailable = function() {
  return this.isActive && this.availability;
};

// Get discount amount
dishSchema.methods.getDiscountAmount = function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    return Math.round(this.price * this.offer.discountPercentage / 100);
  }
  return 0;
};

// ✅ Static Methods

// Find dishes by seller
dishSchema.statics.findBySeller = function(sellerId, options = {}) {
  const query = { 
    $or: [
      { seller: sellerId },
      { restaurantId: sellerId }
    ]
  };
  
  if (options.activeOnly) {
    query.isActive = true;
    query.availability = true;
  }
  
  return this.find(query)
    .sort(options.sort || { orderCount: -1 })
    .limit(options.limit || 100);
};

// Find popular dishes
dishSchema.statics.findPopular = function(limit = 20) {
  return this.find({ 
    isActive: true, 
    availability: true 
  })
    .sort({ orderCount: -1, 'rating.average': -1 })
    .limit(limit);
};

// Search dishes
dishSchema.statics.searchDishes = function(query, options = {}) {
  const searchQuery = {
    $text: { $search: query },
    isActive: true,
    availability: true
  };
  
  if (options.category) {
    searchQuery.category = options.category;
  }
  
  if (options.type) {
    searchQuery.type = options.type;
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Get dishes by category
dishSchema.statics.findByCategory = function(category, options = {}) {
  return this.find({
    category,
    isActive: true,
    availability: true
  })
    .sort(options.sort || { 'rating.average': -1 })
    .limit(options.limit || 20);
};

// ✅ Validation Methods

// Validate before deletion
dishSchema.pre('remove', async function(next) {
  // Check if dish has pending orders
  const Order = mongoose.model('Order');
  const pendingOrders = await Order.countDocuments({
    dish: this._id,
    orderStatus: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] }
  });
  
  if (pendingOrders > 0) {
    next(new Error('Cannot delete dish with pending orders'));
  } else {
    next();
  }
});

const Dish = mongoose.model('Dish', dishSchema);

export default Dish;