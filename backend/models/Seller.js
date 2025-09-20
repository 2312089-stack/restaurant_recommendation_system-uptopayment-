// models/Seller.js - Updated for onboarding support
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
    enum: ['Restaurant', 'Café', 'Hotel Dining', 'Cloud Kitchen', 'Fast Food', 'Bakery', 'Sweet Shop', 'Bar & Grill'],
    default: 'Restaurant'
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
    country: { type: String, default: 'India' },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  businessDetails: {
    // Owner and basic info
    ownerName: String,
    description: String,
    
    // Cuisine and pricing
    cuisine: [String], // ['Indian', 'Chinese', etc.]
    priceRange: {
      type: String,
      enum: ['budget', 'mid-range', 'premium', 'fine-dining']
    },
    
    // Operating hours
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
    
    // Menu items
    dishes: [{
      name: String,
      price: String,
      category: {
        type: String,
        enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Chinese', 'Indian', 'Continental', 'South Indian']
      },
      type: {
        type: String,
        enum: ['veg', 'non-veg'],
        default: 'veg'
      },
      description: String,
      image: String // File path for dish image
    }],
    
    // Banking and financial details
    banking: {
      accountNumber: String,
      ifscCode: String,
      accountHolder: String,
      panNumber: String,
      gstNumber: String,
      razorpayId: String
    },
    
    // Document and image uploads
    documents: {
      logo: String, // File path for logo
      bannerImage: String, // File path for banner
      ownerIdProof: String, // File path for owner ID proof
      businessProof: String // File path for business proof (FSSAI/GST/Trade License)
    },
    
    // Features and amenities
    features: [String] // ['parking', 'wifi', 'outdoor-seating', etc.]
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
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNotes: String, // Admin notes for verification
  
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
  
  // Onboarding tracking
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 6
  },
  onboardingCompletedAt: Date,
  
  // Terms and conditions
  termsAcceptedAt: Date,
  termsVersion: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
sellerSchema.index({ email: 1 });
sellerSchema.index({ passwordResetToken: 1 });
sellerSchema.index({ 'address.zipCode': 1 });
sellerSchema.index({ businessType: 1 });
sellerSchema.index({ isVerified: 1 });
sellerSchema.index({ verificationStatus: 1 });
sellerSchema.index({ onboardingCompleted: 1 });

// Virtual for full address
sellerSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, zipCode, country } = this.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

// Virtual for total dishes count
sellerSchema.virtual('totalDishes').get(function() {
  return this.businessDetails?.dishes?.length || 0;
});

// Virtual for verification display status
sellerSchema.virtual('displayVerificationStatus').get(function() {
  if (this.isVerified) return 'Verified';
  if (!this.onboardingCompleted) return 'Onboarding Pending';
  return this.verificationStatus?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending';
});

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

// Instance method to check onboarding completion
sellerSchema.methods.isOnboardingComplete = function() {
  if (!this.businessDetails) return false;
  
  const requiredFields = [
    this.businessName,
    this.businessDetails.ownerName,
    this.address?.street,
    this.phone,
    this.businessDetails.banking?.accountNumber,
    this.businessDetails.documents?.ownerIdProof,
    this.businessDetails.documents?.businessProof
  ];
  
  return requiredFields.every(field => field && field.toString().trim() !== '');
};

// Instance method to get onboarding progress
sellerSchema.methods.getOnboardingProgress = function() {
  const steps = {
    1: !!(this.businessName && this.businessDetails?.ownerName), // Business Profile
    2: !!(this.address?.street && this.phone), // Location & Contact
    3: !!(this.businessDetails?.dishes?.length > 0), // Menu Setup
    4: !!(this.businessDetails?.banking?.accountNumber), // Payments & Finance
    5: !!(this.businessDetails?.documents?.ownerIdProof && this.businessDetails?.documents?.businessProof) // Verification
  };
  
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const totalSteps = Object.keys(steps).length;
  
  return {
    completedSteps,
    totalSteps,
    percentage: Math.round((completedSteps / totalSteps) * 100),
    steps
  };
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

// Pre-save middleware to update onboarding completion
sellerSchema.pre('save', function(next) {
  // Check if onboarding is complete and update accordingly
  if (this.isOnboardingComplete() && !this.onboardingCompleted) {
    this.onboardingCompleted = true;
    this.onboardingCompletedAt = new Date();
    this.verificationStatus = 'under_review';
  }
  
  next();
});

// Transform JSON output to hide sensitive fields
sellerSchema.methods.toJSON = function() {
  const sellerObject = this.toObject({ virtuals: true });
  delete sellerObject.passwordHash;
  delete sellerObject.passwordResetToken;
  delete sellerObject.passwordResetExpires;
  delete sellerObject.__v;
  
  // Hide sensitive banking details in general responses
  if (sellerObject.businessDetails?.banking) {
    const banking = sellerObject.businessDetails.banking;
    if (banking.accountNumber) {
      banking.accountNumber = `***${banking.accountNumber.slice(-4)}`;
    }
    if (banking.panNumber) {
      banking.panNumber = `***${banking.panNumber.slice(-4)}`;
    }
  }
  
  return sellerObject;
};

// Transform for admin view (shows all data)
sellerSchema.methods.toAdminJSON = function() {
  const sellerObject = this.toObject({ virtuals: true });
  delete sellerObject.passwordHash;
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

// Static method to find verified sellers
sellerSchema.statics.findVerified = function() {
  return this.find({ isVerified: true, isActive: true });
};

// Static method to find sellers by location
sellerSchema.statics.findByLocation = function(zipCode, radius = 10) {
  return this.find({ 
    'address.zipCode': zipCode,
    isVerified: true,
    isActive: true,
    onboardingCompleted: true
  });
};

// Static method for admin dashboard stats
sellerSchema.statics.getAdminStats = async function() {
  const [
    totalSellers,
    verifiedSellers,
    pendingVerification,
    completedOnboarding,
    pendingOnboarding
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isVerified: true }),
    this.countDocuments({ verificationStatus: 'under_review' }),
    this.countDocuments({ onboardingCompleted: true }),
    this.countDocuments({ onboardingCompleted: false })
  ]);
  
  return {
    totalSellers,
    verifiedSellers,
    pendingVerification,
    completedOnboarding,
    pendingOnboarding,
    verificationRate: totalSellers > 0 ? Math.round((verifiedSellers / totalSellers) * 100) : 0
  };
};

const Seller = mongoose.model('Seller', sellerSchema);
export default Seller;