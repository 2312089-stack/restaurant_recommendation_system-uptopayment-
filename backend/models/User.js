// models/User.js - Updated with Wishlist functionality
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  emailId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false // Hide by default in queries
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'user'],
    default: 'customer'
  },
  preferences: {
    type: Object,
    default: {}
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  
  // WISHLIST FUNCTIONALITY
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  }],
  wishlistAddedAt: [{
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Email change functionality
  pendingEmailChange: {
    newEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    token: {
      type: String
    },
    expires: {
      type: Date
    }
  },
  // Password reset functionality
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  // Account tracking
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});
// Add these fields to your existing User model (models/User.js)
// Add after the wishlist fields (around line 40)

// RECENTLY VIEWED FUNCTIONALITY
recentlyViewed: [{
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}],

// Add these indexes after your existing indexes
userSchema.index({ 'recentlyViewed.dish': 1 });
userSchema.index({ 'recentlyViewed.viewedAt': -1 });

// Add these methods after your existing methods (around line 150)

// RECENTLY VIEWED METHODS

// Add dish to recently viewed
userSchema.methods.addToRecentlyViewed = async function(dishId) {
  if (!this.recentlyViewed) this.recentlyViewed = [];
  
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  
  // Remove if already exists (to update timestamp)
  this.recentlyViewed = this.recentlyViewed.filter(item =>
    item.dish.toString() !== dishObjectId.toString()
  );
  
  // Add to beginning
  this.recentlyViewed.unshift({
    dish: dishObjectId,
    viewedAt: new Date()
  });
  
  // Keep only last 20 items
  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }
  
  return this.save();
};

// Get recently viewed dishes
userSchema.methods.getRecentlyViewed = async function(limit = 10) {
  if (!this.recentlyViewed || this.recentlyViewed.length === 0) {
    return [];
  }
  
  const dishIds = this.recentlyViewed
    .slice(0, limit)
    .map(item => item.dish);
  
  const Dish = mongoose.model('Dish');
  return Dish.find({
    _id: { $in: dishIds },
    isActive: true,
    availability: true
  }).lean();
};

// Clear recently viewed
userSchema.methods.clearRecentlyViewed = function() {
  this.recentlyViewed = [];
  return this.save();
};
// Add dish to recently viewed
userSchema.methods.addToRecentlyViewed = async function(dishId) {
  if (!this.recentlyViewed) this.recentlyViewed = [];
  
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(item =>
    item.dish.toString() !== dishObjectId.toString()
  );
  
  // Add to beginning
  this.recentlyViewed.unshift({
    dish: dishObjectId,
    viewedAt: new Date()
  });
  
  // Keep only last 20 items
  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }
  
  return this.save();
};

// Clear recently viewed
userSchema.methods.clearRecentlyViewed = function() {
  this.recentlyViewed = [];
  return this.save();
};
// Virtual for recently viewed count
userSchema.virtual('recentlyViewedCount').get(function() {
  return this.recentlyViewed ? this.recentlyViewed.length : 0;
});
// Indexes for performance
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ 'pendingEmailChange.token': 1 });
userSchema.index({ wishlist: 1 }); // Index for wishlist queries
userSchema.index({ 'wishlistAddedAt.dishId': 1 }); // Index for wishlist metadata

// TTL index for pending email changes (expires after 24 hours)
userSchema.index(
  { 'pendingEmailChange.expires': 1 }, 
  { expireAfterSeconds: 0, partialFilterExpression: { 'pendingEmailChange.expires': { $exists: true } } }
);

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

// Instance method to clear pending email change
userSchema.methods.clearPendingEmailChange = function() {
  this.pendingEmailChange = undefined;
  return this.save();
};

// WISHLIST METHODS
// Instance method to add dish to wishlist
userSchema.methods.addToWishlist = function(dishId) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];
  
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  
  // Check if already in wishlist
  const isAlreadyInWishlist = this.wishlist.some(id => 
    id.toString() === dishObjectId.toString()
  );
  
  if (!isAlreadyInWishlist) {
    this.wishlist.push(dishObjectId);
    this.wishlistAddedAt.push({
      dishId: dishObjectId,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Instance method to remove dish from wishlist
userSchema.methods.removeFromWishlist = function(dishId) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];
  
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  
  // Remove from wishlist array
  this.wishlist = this.wishlist.filter(id => 
    id.toString() !== dishObjectId.toString()
  );
  
  // Remove from wishlistAddedAt array
  this.wishlistAddedAt = this.wishlistAddedAt.filter(item =>
    item.dishId?.toString() !== dishObjectId.toString()
  );
  
  return this.save();
};

// Instance method to check if dish is in wishlist
userSchema.methods.isInWishlist = function(dishId) {
  if (!this.wishlist) return false;
  
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  return this.wishlist.some(id => 
    id.toString() === dishObjectId.toString()
  );
};

// Instance method to clear wishlist
userSchema.methods.clearWishlist = function() {
  this.wishlist = [];
  this.wishlistAddedAt = [];
  return this.save();
};

// Virtual for wishlist count
userSchema.virtual('wishlistCount').get(function() {
  return this.wishlist ? this.wishlist.length : 0;
});

// Virtual for display
userSchema.virtual('displayEmail').get(function() {
  return this.emailId;
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('passwordHash')) return next();
  
  // Don't hash if already hashed
  if (this.passwordHash.startsWith('$2b$')) return next();
  
  try {
    // Hash password with cost of 12
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set passwordChangedAt
userSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure JWT is created after password change
  next();
});

// Pre-save middleware to initialize wishlist arrays
userSchema.pre('save', function(next) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];
  next();
});

// Transform JSON output to hide sensitive fields
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.__v;
  return userObject;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ emailId: email.toLowerCase().trim() });
};

// Static method to find user with password (for authentication)
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ emailId: email.toLowerCase().trim() }).select('+passwordHash');
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

// Export as default (ES6 style)
export default User;