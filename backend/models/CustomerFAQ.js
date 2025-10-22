// models/CustomerFAQ.js
import mongoose from 'mongoose';

const customerFAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['ordering', 'payment', 'delivery', 'account', 'general'],
    default: 'general'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
customerFAQSchema.index({ category: 1, order: 1 });
customerFAQSchema.index({ isActive: 1 });
customerFAQSchema.index({ question: 'text', answer: 'text' });

export default mongoose.model('CustomerFAQ', customerFAQSchema);