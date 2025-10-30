// backend/models/SupportTicket.js
import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  category: {
    type: String,
    enum: [
      'order_issues',
      'payment_settlement',
      'menu_dish_issues',
      'technical_problems',
      'analytics_reports',
      'general_inquiry',
      'account_verification',
      'delivery_issues',
      'customer_complaints'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  responses: [{
    respondedBy: {
      type: String,
      enum: ['seller', 'support'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      filename: String,
      url: String
    }]
  }],
  assignedTo: {
    type: String,
    default: null
  },
  resolvedAt: Date,
  closedAt: Date,
  metadata: {
    orderId: String,
    dishId: String,
    settlementId: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// ✅ FIXED: Pre-save hook to auto-generate ticket ID
supportTicketSchema.pre('save', async function(next) {
  // Only generate ticketId if it doesn't exist (for new documents)
  if (!this.ticketId) {
    try {
      // Generate unique ticket ID
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      // Format: TKT-TIMESTAMP-RANDOM (e.g., TKT-1730000000000-123)
      this.ticketId = `TKT${timestamp}${randomNum}`;
      
      console.log('✅ Generated ticket ID:', this.ticketId);
    } catch (error) {
      console.error('❌ Error generating ticket ID:', error);
      return next(error);
    }
  }
  next();
});

// Indexes for better performance
supportTicketSchema.index({ seller: 1, status: 1 });
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ priority: 1 });

// Create compound index for efficient queries
supportTicketSchema.index({ seller: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);