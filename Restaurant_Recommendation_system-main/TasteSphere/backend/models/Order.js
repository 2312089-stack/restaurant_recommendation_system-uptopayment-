// backend/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: null },
  razorpayOrderId: { type: String, default: null },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  item: {
    name: { type: String, required: true },
    restaurant: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    description: { type: String }
  },
  deliveryAddress: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  orderStatus: { type: String, enum: ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'], default: 'confirmed' },
  estimatedDelivery: { type: String, default: '25-30 minutes' },
  actualDeliveryTime: { type: Date, default: null },
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
  notes: { type: String, default: '' }
}, { timestamps: true });

orderSchema.index({ orderId: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ createdAt: -1 });

orderSchema.statics.generateOrderId = function () {
  return 'ORD' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 2).toUpperCase();
};

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

const Order = mongoose.model('Order', orderSchema);

export default Order;
