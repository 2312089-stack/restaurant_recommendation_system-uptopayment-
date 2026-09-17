// models/Seller.js - Complete Seller model for restaurant owners
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({
  // Basic authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: true,
  },
  
  // Basic business information
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  businessType: {
    type: String,
    required: true,
    enum: ['Restaurant', 'Café', 'Fast Food', 'Cloud Kitchen', 'Bakery', 'Food Truck'],
    default: 'Restaurant'
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
   isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  dashboardStatus: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline'
  },
  // Address information
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
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
  
  // Detailed business information
  businessDetails: {
    ownerName: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      maxlength: 1000
    },
    cuisine: [{
      type: String,
      trim: true
    }],
    priceRange: {
      type: String,
      enum: ['budget', 'mid-range', 'premium'],
      default: 'mid-range'
    },
    openingHours: {
      monday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      tuesday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      wednesday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      thursday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      friday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      saturday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      },
      sunday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false }
      }
    },
    seatingCapacity: {
      type: Number,
      min: 0
    },
    servicesOffered: [{
      type: String,
      enum: ['Dine-in', 'Takeaway', 'Delivery', 'Catering', 'Online Ordering']
    }],
    // Legacy dishes array (keeping for backward compatibility)
    dishes: [{
      name: String,
      price: String,
      category: String,
      type: String,
      description: String,
      image: String
    }],
    documents: {
      logo: String,
      bannerImage: String,
      businessLicense: String,
      fssaiLicense: String,
      gstCertificate: String
    }
  },
  
  // Verification and status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
 onboardingCompleted: {
    type: Boolean,
    default: false
  },
  
  // Bank account information for settlements
  bankDetails: {
    bankName: {
      type: String,
      default: '',
      trim: true
    },
    accountNumber: {
      type: String,
      default: '',
      trim: true
    },
    ifscCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    accountHolderName: {
      type: String,
      default: '',
      trim: true
    },
    branchName: {
      type: String,
      default: '',
      trim: true
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationNotes: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  
 
  
  // OTP and password reset
  otp: {
    code: String,
    expiresAt: Date,
    isUsed: { type: Boolean, default: false }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  
  // Subscription and payments
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    validUntil: Date
  },
  
  // Performance metrics
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },
  
  // Settings
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    orderAcceptance: {
      auto: { type: Boolean, default: false },
      manualTimeout: { type: Number, default: 15 } // minutes
    }
  },
  
  // Timestamps
  lastLogin: Date,
  emailVerifiedAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
sellerSchema.index({ email: 1 });
sellerSchema.index({ businessName: 1 });
sellerSchema.index({ 'address.city': 1 });
sellerSchema.index({ 'address.coordinates': '2dsphere' });
sellerSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for full address
sellerSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.zipCode
  ].filter(part => part && part.trim());
  
  return parts.join(', ');
});

// Virtual for business status
sellerSchema.virtual('businessStatus').get(function() {
  if (!this.isActive) return 'Inactive';
  if (!this.isVerified) return 'Pending Verification';
  if (!this.onboardingCompleted) return 'Onboarding Incomplete';
  return 'Active';
});



// Update passwordChangedAt before saving
sellerSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash') || this.isNew) return next();
  
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Instance method to compare password
sellerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to check if password changed after JWT was issued
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

// Static method to find by email
sellerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('-passwordHash');
};

// Static method to find by email with password (for login)
sellerSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active sellers
sellerSchema.statics.findActive = function() {
  return this.find({ isActive: true, isVerified: true });
};

// Method to check if seller is open now
sellerSchema.methods.isOpenNow = function() {
  if (!this.businessDetails.openingHours) return false;
  
  const now = new Date();
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todayHours = this.businessDetails.openingHours[day];
  
  if (!todayHours || todayHours.closed) return false;
  
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Method to calculate completion percentage
sellerSchema.methods.getCompletionPercentage = function() {
  let completed = 0;
  const total = 10;
  
  if (this.businessName) completed++;
  if (this.phone) completed++;
  if (this.address.street) completed++;
  if (this.address.city) completed++;
  if (this.businessDetails.ownerName) completed++;
  if (this.businessDetails.description) completed++;
  if (this.businessDetails.cuisine && this.businessDetails.cuisine.length > 0) completed++;
  if (this.businessDetails.documents.logo) completed++;
  if (this.businessDetails.documents.bannerImage) completed++;
  if (this.isVerified) completed++;
  
  return Math.round((completed / total) * 100);
};

// Ensure virtual fields are serialized
sellerSchema.set('toJSON', { virtuals: true });
sellerSchema.set('toObject', { virtuals: true });

const Seller = mongoose.model('Seller', sellerSchema);
export default Seller;