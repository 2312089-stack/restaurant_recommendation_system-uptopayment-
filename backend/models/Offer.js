import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [5, 'Minimum discount is 5%'],
    max: [70, 'Maximum discount is 70%']
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    validate: {
      validator: function(value) {
        return value > this.validFrom;
      },
      message: 'Valid until must be after valid from date'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  applicableDishes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  }],
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  usageLimit: {
    type: Number,
    min: [0, 'Usage limit cannot be negative']
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  offerType: {
    type: String,
    enum: ['percentage', 'flat', 'bogo'],
    default: 'percentage'
  },
  termsAndConditions: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
offerSchema.index({ sellerId: 1, isActive: 1 });
offerSchema.index({ validUntil: 1 });
offerSchema.index({ createdAt: -1 });

// Virtual: Check if offer is expired
offerSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual: Check if offer is currently valid
offerSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && now >= this.validFrom && now <= this.validUntil;
});

// Virtual: Days remaining
offerSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diff = this.validUntil - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;