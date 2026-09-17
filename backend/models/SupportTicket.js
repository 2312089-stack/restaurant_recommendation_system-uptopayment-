// models/SupportTicket.js - Seller support tickets handled by admins
import mongoose from 'mongoose';

const TICKET_CATEGORIES = [
  'order_issues',
  'payment_settlement',
  'menu_dish_issues',
  'technical_problems',
  'analytics_reports',
  'general_inquiry',
  'account_verification',
  'delivery_issues',
  'customer_complaints'
];

const responseSchema = new mongoose.Schema({
  respondedBy: {
    type: String,
    enum: ['seller', 'admin', 'support'],
    default: 'admin'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    default: null
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: TICKET_CATEGORIES,
    default: 'general_inquiry'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  responses: [responseSchema]
}, {
  timestamps: true
});

supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ seller: 1 });

supportTicketSchema.statics.generateTicketId = function () {
  return 'TKT' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 4).toUpperCase();
};

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export { TICKET_CATEGORIES };
export default SupportTicket;
