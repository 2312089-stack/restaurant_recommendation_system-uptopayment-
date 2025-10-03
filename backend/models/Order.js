// backend/models/Order.js - Complete with cancellation support
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  razorpayPaymentId: { type: String, default: null },
  razorpayOrderId: { type: String, default: null },

  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  customerPhone: { type: String, required: true, trim: true },

  item: {
    name: { type: String, required: true },
    restaurant: { type: String, required: true },
    price: { type: mongoose.Schema.Types.Mixed, required: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    dishId: { type: String },
    category: { type: String },
    type: { type: String },
    quantity: { type: Number, default: 1 }
  },

  deliveryAddress: { type: String, required: true },

  totalAmount: { type: Number, required: true, min: 0 },

  paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
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

  estimatedDelivery: { type: String, default: '25-30 minutes' },
  actualDeliveryTime: { type: Date, default: null },

  // Cancellation fields
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  cancelledBy: { 
    type: String, 
    enum: ['customer', 'seller', 'admin', null], 
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

  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: null 
  },
  review: { 
    type: String, 
    default: '' 
  },
  ratedAt: {
    type: Date,
    default: null
  },

  notes: { type: String, default: '' }
}, { timestamps: true });

// Indexes
// Indexes (no duplicates)
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, seller: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ rating: 1, createdAt: -1, sparse: true }); // sparse because rating can be null
orderSchema.index({ cancelledAt: 1 });


// Static Methods
orderSchema.statics.generateOrderId = function () {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
};

// Instance Methods
orderSchema.methods.updateStatus = function (newStatus) {
  this.orderStatus = newStatus;
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  return this.save();
};

orderSchema.methods.updatePaymentStatus = function (status, paymentId = null, orderId = null) {
  this.paymentStatus = status;
  if (paymentId) this.razorpayPaymentId = paymentId;
  if (orderId) this.razorpayOrderId = orderId;
  return this.save();
};

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

// Add rating and review
orderSchema.methods.addRating = function (rating, review = '') {
  if (this.orderStatus !== 'delivered') {
    throw new Error('Can only rate delivered orders');
  }
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  this.rating = rating;
  this.review = review;
  this.ratedAt = new Date();
  return this.save();
};

// Cancel order
orderSchema.methods.cancelOrder = function (reason, cancelledBy = 'customer') {
  const cancellableStatuses = ['confirmed', 'pending', 'preparing'];
  
  if (!cancellableStatuses.includes(this.orderStatus)) {
    throw new Error(`Cannot cancel order with status: ${this.orderStatus}`);
  }
  
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  
  // Update payment status if paid
  if (this.paymentMethod !== 'cod' && this.paymentStatus === 'completed') {
    this.paymentStatus = 'refunded';
  }
  
  return this.save();
};

// Pre-save Hook
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = this.constructor.generateOrderId();
  }
  if (typeof this.totalAmount === 'string') {
    this.totalAmount = parseFloat(this.totalAmount.replace(/[^\d.]/g, '')) || 0;
  }
  next();
});

// Virtual Properties
orderSchema.virtual('formattedTotal').get(function() {
  return `₹${this.totalAmount}`;
});

orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;
});

orderSchema.virtual('isRated').get(function() {
  return this.rating !== null && this.rating > 0;
});

orderSchema.virtual('canBeRated').get(function() {
  return this.orderStatus === 'delivered' && !this.isRated;
});

orderSchema.virtual('canBeCancelled').get(function() {
  const cancellableStatuses = ['confirmed', 'pending', 'preparing'];
  return cancellableStatuses.includes(this.orderStatus);
});

orderSchema.virtual('isCancelled').get(function() {
  return this.orderStatus === 'cancelled';
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;