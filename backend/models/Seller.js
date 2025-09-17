import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({
  email: {
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
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'hotel', 'cafe', 'bakery', 'other'],
    default: 'restaurant'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  businessDetails: {
    cuisine: [String], // ['Indian', 'Chinese', etc.]
    priceRange: {
      type: String,
      enum: ['budget', 'mid-range', 'premium', 'fine-dining']
    },
    openingHours: {
      type: Map,
      of: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      }
    },
    features: [String] // ['parking', 'wifi', 'outdoor-seating', etc.]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
sellerSchema.index({ email: 1 });
sellerSchema.index({ passwordResetToken: 1 });
sellerSchema.index({ 'address.city': 1 });
sellerSchema.index({ businessType: 1 });

// Instance method to compare password
sellerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if password was changed after JWT was issued
sellerSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Pre-save middleware for password hashing
sellerSchema.pre('save', async function(next) {
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
sellerSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Transform JSON output to hide sensitive fields
sellerSchema.methods.toJSON = function() {
  const sellerObject = this.toObject();
  delete sellerObject.passwordHash;
  delete sellerObject.passwordResetToken;
  delete sellerObject.passwordResetExpires;
  delete sellerObject.__v;
  return sellerObject;
};

// Static method to find seller by email
sellerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method to find seller with password (for authentication)
sellerSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
};

const Seller = mongoose.model('Seller', sellerSchema);
export default Seller;