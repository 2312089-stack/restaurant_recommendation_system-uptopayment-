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
    type: String, // Support agent ID
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

// Auto-generate ticket ID
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketId = `TKT${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Indexes
supportTicketSchema.index({ seller: 1, status: 1 });
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);