// models/Order.js - FIXED VERSION with Required customerId
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true,
    default: function() {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      return `ORDER_${timestamp}_${random}`;
    }
  },
  
  // ✅ CRITICAL FIX: Make customerId REQUIRED
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,  // ← Make it required!
    index: true
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

  paymentMethod: { 
    type: String, 
    enum: ['razorpay', 'cod', 'pending'], 
    default: 'pending'
  },
  
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },

  orderStatus: { 
    type: String, 
    enum: [
      'pending_seller',
      'seller_accepted',
      'seller_rejected',
      'payment_pending',
      'payment_completed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ], 
    default: 'pending_seller'
  },

  orderTimeline: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { 
      type: String, 
      enum: ['system', 'customer', 'seller', 'delivery'],
      default: 'system'
    },
    message: String
  }],

  sellerResponse: {
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  },

  estimatedDelivery: { type: String, default: '25-30 minutes' },
  actualDeliveryTime: { type: Date, default: null },

  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
  cancelledBy: { 
    type: String, 
    enum: ['customer', 'seller', 'admin', null], 
    default: null 
  },

  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processing', 'completed', 'failed'],
    default: 'none'
  },
  refundAmount: { type: Number, default: 0 },
  refundInitiatedAt: Date,
  refundCompletedAt: Date,

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

  rating: { type: Number, min: 1, max: 5, default: null },
  review: { type: String, default: '' },
  ratedAt: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Indexes
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 }); // ← Updated index
orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ seller: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

// Methods
orderSchema.methods.updateStatus = function(newStatus, actor = 'system', message = '') {
  this.orderStatus = newStatus;
  
  this.orderTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    actor,
    message: message || `Order ${newStatus.replace('_', ' ')}`
  });
  
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  
  return this.save();
};

orderSchema.methods.acceptOrder = function() {
  this.orderStatus = 'seller_accepted';
  this.sellerResponse.acceptedAt = new Date();
  this.orderTimeline.push({
    status: 'seller_accepted',
    timestamp: new Date(),
    actor: 'seller',
    message: 'Restaurant confirmed the order'
  });
  return this.save();
};

orderSchema.methods.rejectOrder = function(reason) {
  this.orderStatus = 'seller_rejected';
  this.sellerResponse.rejectedAt = new Date();
  this.sellerResponse.rejectionReason = reason;
  this.cancelledBy = 'seller';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.orderTimeline.push({
    status: 'seller_rejected',
    timestamp: new Date(),
    actor: 'seller',
    message: `Order rejected: ${reason}`
  });
  return this.save();
};

orderSchema.statics.generateOrderId = function() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
};

orderSchema.pre('save', function(next) {
  if (this.isNew && this.orderTimeline.length === 0) {
    this.orderTimeline.push({
      status: this.orderStatus,
      timestamp: new Date(),
      actor: 'system',
      message: 'Order placed'
    });
  }
  next();
});

// Virtuals
orderSchema.virtual('canBeRated').get(function() {
  return this.orderStatus === 'delivered' && !this.rating;
});

orderSchema.virtual('canBeCancelled').get(function() {
  return ['pending_seller', 'seller_accepted', 'preparing'].includes(this.orderStatus);
});

orderSchema.virtual('requiresPayment').get(function() {
  return this.orderStatus === 'seller_accepted' && this.paymentStatus === 'pending';
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;