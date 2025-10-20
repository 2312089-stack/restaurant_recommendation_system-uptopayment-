// models/Dish.js - FIXED VERSION (Removed Duplicate Offer Field)
import mongoose from 'mongoose';

const dishSchema = new mongoose.Schema({
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
  
  sellerName: {
    type: String,
    required: true
  },
  
  restaurantName: {
    type: String,
    required: true
  },
  
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
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Add this to your Dish schema
offer: {
  hasOffer: {
    type: Boolean,
    default: false
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  validUntil: {
    type: Date
  }
},
  
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

// Pre-save hook to sync seller and restaurantId
dishSchema.pre('save', function(next) {
  if (this.seller && !this.restaurantId) {
    this.restaurantId = this.seller;
  }
  if (this.restaurantId && !this.seller) {
    this.seller = this.restaurantId;
  }
  next();
});

// Indexes
dishSchema.index({ seller: 1, availability: 1 });
dishSchema.index({ restaurantId: 1, availability: 1 });
dishSchema.index({ category: 1, availability: 1 });
dishSchema.index({ type: 1, availability: 1 });
dishSchema.index({ 'location.city': 1, availability: 1 });
dishSchema.index({ orderCount: -1 });
dishSchema.index({ 'rating.average': -1 });
dishSchema.index({ isActive: 1, availability: 1 });
dishSchema.index({ createdAt: -1 });

// ✅ INDEX FOR OFFERS - Critical for performance
dishSchema.index({ 
  'offer.hasOffer': 1, 
  'offer.validUntil': 1, 
  availability: 1 
});

// Text Search Index
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

// Virtual Properties
dishSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

dishSchema.virtual('currentPrice').get(function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    const discount = Math.round(this.price - (this.price * this.offer.discountPercentage / 100));
    return discount;
  }
  return this.price;
});

dishSchema.virtual('discountedPrice').get(function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    return Math.round(this.price - (this.price * this.offer.discountPercentage / 100));
  }
  return this.price;
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

// ✅ NEW: Check if offer is active
dishSchema.virtual('hasActiveOffer').get(function() {
  return this.offer?.hasOffer && 
         this.offer?.validUntil && 
         new Date(this.offer.validUntil) > new Date();
});

// Instance Methods
dishSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

dishSchema.methods.incrementOrderCount = function() {
  this.orderCount += 1;
  return this.save();
};

dishSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

dishSchema.methods.isAvailable = function() {
  return this.isActive && this.availability;
};

dishSchema.methods.getDiscountAmount = function() {
  if (this.offer?.hasOffer && this.offer.validUntil && new Date(this.offer.validUntil) > new Date()) {
    return Math.round(this.price * this.offer.discountPercentage / 100);
  }
  return 0;
};

// ✅ NEW: Update offer method
dishSchema.methods.updateOffer = function(offerData) {
  this.offer = {
    hasOffer: offerData.hasOffer || false,
    discountPercentage: offerData.discountPercentage || 0,
    validUntil: offerData.validUntil || null
  };
  return this.save();
};

// Static Methods
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

dishSchema.statics.findPopular = function(limit = 20) {
  return this.find({ 
    isActive: true, 
    availability: true 
  })
    .sort({ orderCount: -1, 'rating.average': -1 })
    .limit(limit);
};

// ✅ NEW: Find active offers
dishSchema.statics.findActiveOffers = function(options = {}) {
  const query = {
    isActive: true,
    availability: true,
    'offer.hasOffer': true,
    'offer.validUntil': { $gt: new Date() }
  };

  if (options.category) {
    query.category = options.category;
  }

  if (options.type) {
    query.type = options.type;
  }

  if (options.city) {
    query['location.city'] = { $regex: options.city, $options: 'i' };
  }

  return this.find(query)
    .sort({ 'offer.discountPercentage': -1, 'rating.average': -1 })
    .limit(options.limit || 20);
};

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

dishSchema.statics.findByCategory = function(category, options = {}) {
  return this.find({
    category,
    isActive: true,
    availability: true
  })
    .sort(options.sort || { 'rating.average': -1 })
    .limit(options.limit || 20);
};

const Dish = mongoose.model('Dish', dishSchema);

export default Dish;