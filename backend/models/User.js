// models/User.js - Fixed with proper ES6 export
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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