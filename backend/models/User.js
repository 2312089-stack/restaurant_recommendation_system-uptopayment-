// models/User.js - Fixed with proper ES6 export
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
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    trim: true
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
  // WISHLIST
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

  // RECENTLY VIEWED
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

// Indexes for performance
userSchema.index({ emailId: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ 'pendingEmailChange.token': 1 });

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

// Wishlist Methods
userSchema.methods.addToWishlist = function(dishId) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];

  const dishObjectId = new mongoose.Types.ObjectId(dishId);
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

userSchema.methods.removeFromWishlist = function(dishId) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];

  const dishObjectId = new mongoose.Types.ObjectId(dishId);

  this.wishlist = this.wishlist.filter(id =>
    id.toString() !== dishObjectId.toString()
  );

  this.wishlistAddedAt = this.wishlistAddedAt.filter(item =>
    item.dishId?.toString() !== dishObjectId.toString()
  );

  return this.save();
};

userSchema.methods.isInWishlist = function(dishId) {
  if (!this.wishlist) return false;
  const dishObjectId = new mongoose.Types.ObjectId(dishId);
  return this.wishlist.some(id =>
    id.toString() === dishObjectId.toString()
  );
};

userSchema.methods.clearWishlist = function() {
  this.wishlist = [];
  this.wishlistAddedAt = [];
  return this.save();
};

// Recently Viewed Methods
userSchema.methods.addToRecentlyViewed = async function(dishId) {
  if (!this.recentlyViewed) this.recentlyViewed = [];

  const dishObjectId = new mongoose.Types.ObjectId(dishId);

  this.recentlyViewed = this.recentlyViewed.filter(item =>
    item.dish.toString() !== dishObjectId.toString()
  );

  this.recentlyViewed.unshift({
    dish: dishObjectId,
    viewedAt: new Date()
  });

  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }

  return this.save();
};

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

userSchema.methods.clearRecentlyViewed = function() {
  this.recentlyViewed = [];
  return this.save();
};

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

// Pre-save middleware to default wishlist arrays
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

const User = mongoose.model('User', userSchema);

// Export as default (ES6 style)
export default User;