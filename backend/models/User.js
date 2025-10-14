// models/User.js - CRITICAL FIX for passwordHash field
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
  googleId: {
    type: String,
    sparse: true,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  // ✅ CRITICAL FIX: Make passwordHash NOT required for Google users
  passwordHash: {
    type: String,
    required: function() {
      // Only require password for local auth
      return this.authProvider === 'local';
    },
    select: false
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
    token: String,
    expires: Date
  },
  
  // Password reset
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
  timestamps: true
});

// Indexes
userSchema.index({ googleId: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ 'pendingEmailChange.token': 1 });
userSchema.index({ wishlist: 1 });
userSchema.index({ 'wishlistAddedAt.dishId': 1 });
userSchema.index({ 'recentlyViewed.dish': 1 });
userSchema.index({ 'recentlyViewed.viewedAt': -1 });

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

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

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return resetToken;
};

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

// Virtuals
userSchema.virtual('wishlistCount').get(function() {
  return this.wishlist ? this.wishlist.length : 0;
});

userSchema.virtual('recentlyViewedCount').get(function() {
  return this.recentlyViewed ? this.recentlyViewed.length : 0;
});

userSchema.virtual('displayEmail').get(function() {
  return this.emailId;
});

// ✅ CRITICAL FIX: Only hash password if it's modified AND not already hashed
userSchema.pre('save', async function(next) {
  // Skip if password not modified
  if (!this.isModified('passwordHash')) return next();
  
  // Skip if no password (Google users)
  if (!this.passwordHash) return next();
  
  // Skip if already hashed
  if (this.passwordHash.startsWith('$2b$') || this.passwordHash.startsWith('$2a$')) {
    return next();
  }
  
  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.wishlist) this.wishlist = [];
  if (!this.wishlistAddedAt) this.wishlistAddedAt = [];
  next();
});

// Transform JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.googleId;
  delete userObject.__v;
  return userObject;
};

// Static Methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ emailId: email.toLowerCase().trim() });
};

userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ emailId: email.toLowerCase().trim() }).select('+passwordHash');
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;