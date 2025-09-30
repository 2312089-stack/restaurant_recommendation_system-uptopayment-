// backend/models/Order.js - FIXED VERSION
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  razorpayPaymentId: { 
    type: String, 
    default: null 
  },
  razorpayOrderId: { 
    type: String, 
    default: null 
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  customerEmail: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  customerPhone: { 
    type: String, 
    required: true,
    trim: true
  },
  item: {
    name: { type: String, required: true },
    restaurant: { type: String, required: true },
    price: { type: mongoose.Schema.Types.Mixed, required: true }, // Allow both string and number
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    dishId: { type: String }, // Add dishId for reference
    category: { type: String },
    type: { type: String },
    quantity: { type: Number, default: 1 }
  },
  deliveryAddress: { 
    type: String, 
    required: true 
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  paymentMethod: { 
    type: String, 
    enum: ['razorpay', 'cod'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  orderStatus: { 
    type: String, 
    enum: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'], 
    default: 'confirmed' 
  },
  estimatedDelivery: { 
    type: String, 
    default: '25-30 minutes' 
  },
  actualDeliveryTime: { 
    type: Date, 
    default: null 
  },
  notifications: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null }
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      sid: { type: String, default: null }
    }
  },
  orderBreakdown: {
    itemPrice: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 25 },
    platformFee: { type: Number, default: 5 },
    gst: { type: Number, default: 0 }
  },
  notes: { type: String, default: '' }
}, { 
  timestamps: true 
});

// Indexes for better query performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Static method to generate unique order ID
orderSchema.statics.generateOrderId = function () {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
};

// Instance method to update order status
orderSchema.methods.updateStatus = function (newStatus) {
  this.orderStatus = newStatus;
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  return this.save();
};

// Instance method to update payment status
orderSchema.methods.updatePaymentStatus = function (status, paymentId = null, orderId = null) {
  this.paymentStatus = status;
  if (paymentId) this.razorpayPaymentId = paymentId;
  if (orderId) this.razorpayOrderId = orderId;
  return this.save();
};

// Instance method to mark notifications as sent
orderSchema.methods.markNotificationSent = function (type, messageId = null, sid = null) {
  if (type === 'email') {
    this.notifications.email.sent = true;
    this.notifications.email.sentAt = new Date();
    if (messageId) this.notifications.email.messageId = messageId;
  } else if (type === 'whatsapp') {
    this.notifications.whatsapp.sent = true;
    this.notifications.whatsapp.sentAt = new Date();
    if (sid) this.notifications.whatsapp.sid = sid;
  }
  return this.save();
};

// Pre-save middleware to generate orderId if not provided
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = this.constructor.generateOrderId();
  }
  
  // Ensure totalAmount is a number
  if (typeof this.totalAmount === 'string') {
    this.totalAmount = parseFloat(this.totalAmount.replace(/[^\d.]/g, '')) || 0;
  }
  
  next();
});

// Virtual for formatted total amount
orderSchema.virtual('formattedTotal').get(function() {
  return `₹${this.totalAmount}`;
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  } else {
    return `${minutes}m ago`;
  }
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;