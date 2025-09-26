// models/Dish.js - Complete Dish model for restaurant dishes
import mongoose from 'mongoose';

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Starters', 'Main Course', 'Desserts', 'Beverages', 
      'Chinese', 'Indian', 'Continental', 'South Indian'
    ]
  },
  type: {
    type: String,
    required: true,
    enum: ['veg', 'non-veg'],
    default: 'veg'
  },
  availability: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 30,
    min: 5,
    max: 120
  },
  image: {
    type: String,
    default: null
  },
  
  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
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
  
  // Location (copied from seller for faster queries)
  location: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
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
      default: 0
    }
  },
  
  // Performance metrics
  orderCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Offer system
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
  
  // Tags for better searchability
  tags: [String]
}, {
  timestamps: true
});

// Indexes for better query performance
dishSchema.index({ seller: 1, availability: 1 });
dishSchema.index({ category: 1, availability: 1 });
dishSchema.index({ type: 1, availability: 1 });
dishSchema.index({ 'location.city': 1, availability: 1 });
dishSchema.index({ orderCount: -1 });
dishSchema.index({ 'rating.average': -1 });
dishSchema.index({ isActive: 1, availability: 1 });

// Text search index
dishSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual for formatted price
dishSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

// Virtual for current price with offer
dishSchema.virtual('currentPrice').get(function() {
  if (this.offer.hasOffer && this.offer.validUntil > new Date()) {
    const discountedPrice = this.price - (this.price * this.offer.discountPercentage / 100);
    return `₹${Math.round(discountedPrice)}`;
  }
  return `₹${this.price}`;
});

// Virtual for rating display
dishSchema.virtual('ratingDisplay').get(function() {
  return this.rating.average > 0 ? this.rating.average.toFixed(1) : 'New';
});

// Method to check if dish is available
dishSchema.methods.isAvailable = function() {
  return this.availability && this.isActive;
};

// Method to calculate discounted price
dishSchema.methods.getDiscountedPrice = function() {
  if (this.offer.hasOffer && this.offer.validUntil > new Date()) {
    return Math.round(this.price - (this.price * this.offer.discountPercentage / 100));
  }
  return this.price;
};

// Static method to find popular dishes
dishSchema.statics.findPopular = function(limit = 20) {
  return this.find({ isActive: true, availability: true })
    .sort({ orderCount: -1, 'rating.average': -1 })
    .limit(limit);
};

// Static method to find featured dishes
dishSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isActive: true, availability: true, isFeatured: true })
    .sort({ orderCount: -1 })
    .limit(limit);
};

// Static method to search dishes
dishSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    availability: true
  };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Apply filters
  if (filters.category) searchQuery.category = filters.category;
  if (filters.type) searchQuery.type = filters.type;
  if (filters.city) searchQuery['location.city'] = new RegExp(filters.city, 'i');
  
  return this.find(searchQuery).sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware to update tags
dishSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isModified('description') || this.isModified('category')) {
    this.tags = [
      this.name.toLowerCase(),
      this.description.toLowerCase(),
      this.category.toLowerCase(),
      this.type,
      this.restaurantName.toLowerCase()
    ].filter(tag => tag);
  }
  next();
});

// Ensure virtual fields are serialized
dishSchema.set('toJSON', { virtuals: true });
dishSchema.set('toObject', { virtuals: true });

const Dish = mongoose.model('Dish', dishSchema);
export default Dish;