import mongoose from 'mongoose';

const customerSupportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['order-issue', 'refund', 'payment', 'account', 'technical', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'waiting-response', 'resolved', 'closed'],
    default: 'open'
  },
  messages: [{
    sender: {
      type: String,
      enum: ['customer', 'support'],
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
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  resolvedAt: Date,
  closedAt: Date
}, {
  timestamps: true
});

// Auto-generate ticket number
customerSupportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('CustomerSupportTicket').countDocuments();
    this.ticketNumber = `CUST${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

customerSupportTicketSchema.index({ ticketNumber: 1 });
customerSupportTicketSchema.index({ userId: 1, status: 1 });
customerSupportTicketSchema.index({ email: 1 });

export default mongoose.model('CustomerSupportTicket', customerSupportTicketSchema);