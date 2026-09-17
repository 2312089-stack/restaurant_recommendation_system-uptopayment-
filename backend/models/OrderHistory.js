// models/OrderHistory.js - FIXED VERSION
import mongoose from 'mongoose';

const orderHistorySchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // ✅ CHANGED: Default to false (permanent by default)
  isTemporary: {
    type: Boolean,
    default: false,
    index: true
  },

  orderMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Order snapshot for quick display
  snapshot: {
    dishId: mongoose.Schema.Types.ObjectId,
    dishName: String,
    dishImage: String,
    restaurantId: mongoose.Schema.Types.ObjectId,
    restaurantName: String,
    totalAmount: Number,
    deliveryAddress: String,
    paymentMethod: String,
    customerPhone: String,
    orderBreakdown: {
      itemPrice: Number,
      deliveryFee: Number,
      platformFee: Number,
      gst: Number,
      codFee: Number
    }
  },
  
  // Status progression timeline
  statusHistory: [{
    status: {
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
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    actor: {
      type: String,
      enum: ['customer', 'seller', 'system', 'delivery']
    },
    note: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  currentStatus: {
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
    default: 'pending_seller',
    index: true
  },
  
  // Delivery tracking
  deliveryInfo: {
    estimatedTime: String,
    actualDeliveryTime: Date,
    deliveryPartner: String,
    trackingLink: String
  },
  
  // Cancellation tracking
  cancellationInfo: {
    cancelledBy: {
      type: String,
      enum: ['customer', 'seller', 'system', null],
      default: null
    },
    reason: String,
    timestamp: Date,
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'initiated', 'completed', 'failed'],
      default: 'none'
    },
    refundAmount: Number,
    refundMethod: String
  },
  
  // Rating & Review
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    ratedAt: Date
  },
  
  // Support tickets
  supportTickets: [{
    ticketId: String,
    issue: String,
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
  
}, {
  timestamps: true
});

// Indexes for fast queries
orderHistorySchema.index({ customerId: 1, createdAt: -1 });
orderHistorySchema.index({ orderId: 1 });
orderHistorySchema.index({ currentStatus: 1 });
orderHistorySchema.index({ 'snapshot.restaurantId': 1 });
orderHistorySchema.index({ isTemporary: 1, createdAt: -1 });

// Method to add status change
orderHistorySchema.methods.addStatusChange = function(status, actor, note, metadata = {}) {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    actor,
    note,
    metadata
  });
  this.currentStatus = status;
  return this.save();
};

// Method to cancel order
orderHistorySchema.methods.cancelOrder = function(cancelledBy, reason) {
  this.currentStatus = 'cancelled';
  this.cancellationInfo = {
    cancelledBy,
    reason,
    timestamp: new Date(),
    refundStatus: 'pending'
  };
  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    actor: cancelledBy,
    note: reason
  });
  return this.save();
};

// Method to add rating
orderHistorySchema.methods.addRating = function(score, review) {
  this.rating = {
    score,
    review,
    ratedAt: new Date()
  };
  return this.save();
};

// ✅ FIXED: Static method to get customer summary
orderHistorySchema.statics.getCustomerSummary = async function(customerId) {
  const orders = await this.find({ customerId });
  
  return {
    totalOrders: orders.length,
    delivered: orders.filter(o => o.currentStatus === 'delivered').length,
    cancelled: orders.filter(o => ['cancelled', 'seller_rejected'].includes(o.currentStatus)).length,
    pending: orders.filter(o => ['pending_seller', 'seller_accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.currentStatus)).length,
    totalSpent: orders
      .filter(o => o.currentStatus === 'delivered')
      .reduce((sum, o) => sum + (o.snapshot?.totalAmount || 0), 0)
  };
};

// Virtual for order age
orderHistorySchema.virtual('orderAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'Just now';
});

orderHistorySchema.set('toJSON', { virtuals: true });
orderHistorySchema.set('toObject', { virtuals: true });

export default mongoose.model('OrderHistory', orderHistorySchema);