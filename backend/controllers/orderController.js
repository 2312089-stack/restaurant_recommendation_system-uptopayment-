// ============================================
// UPDATED: orderController.js
// Handles order creation and temporary tracking
// ============================================

import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import OrderHistory from '../models/OrderHistory.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getIO } from '../config/socket.js';
import sellerStatusManager from '../utils/sellerStatusManager.js';

class OrderController {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  initializeServices() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER.trim(),
          pass: process.env.EMAIL_PASS.trim(),
        },
      });
      console.log('✅ Email service initialized');
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID.trim(),
        process.env.TWILIO_AUTH_TOKEN.trim()
      );
      console.log('✅ SMS service initialized');
    }
  }

  // ✅ CREATE ORDER - Creates temporary Order + OrderHistory entry
  createOrder = async (req, res) => {
    try {
      console.log('=== ORDER CREATION REQUEST ===');
      
      const orderData = req.body.orderDetails || req.body;
      const { dishId, customerName, customerEmail, customerPhone, deliveryAddress, totalAmount, orderBreakdown, paymentMethod } = orderData;

      // Validation
      if (!dishId || !customerEmail || !customerPhone) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Fetch dish with seller
      const dish = await Dish.findById(dishId).populate('seller');
      
      if (!dish || !dish.seller) {
        return res.status(404).json({ success: false, error: 'Dish or seller not found' });
      }

      // Check seller status
      const sellerId = dish.seller._id.toString();
      const sellerStatus = sellerStatusManager.getSellerStatus(sellerId);

      if (!sellerStatus?.isOnline || sellerStatus?.dashboardStatus === 'offline') {
        return res.status(403).json({
          success: false,
          error: `${dish.seller.businessName} is currently closed`,
          errorCode: 'SELLER_OFFLINE'
        });
      }

      // Clean phone
      const cleanPhone = customerPhone.replace(/\D/g, '');

      // Handle address
      const addressString = typeof deliveryAddress === 'string' 
        ? deliveryAddress 
        : `${deliveryAddress.fullName}, ${deliveryAddress.address}, ${deliveryAddress.phoneNumber}`;

      // ✅ CREATE TEMPORARY ORDER (Main Order collection)
      const newOrderData = {
        seller: dish.seller._id,
        dish: dishId,
        customerName: customerName || 'Customer',
        customerEmail: customerEmail,
        customerPhone: cleanPhone,
        item: {
          name: dish.name,
          restaurant: dish.restaurantName || dish.seller.businessName,
          price: dish.price,
          image: dish.image,
          description: dish.description,
          dishId: dishId,
          category: dish.category,
          type: dish.type,
          quantity: 1
        },
        deliveryAddress: addressString,
        totalAmount: totalAmount || dish.price,
        paymentMethod: paymentMethod || 'pending',
        paymentStatus: paymentMethod === 'razorpay' ? 'completed' : 'pending',
        orderStatus: 'pending_seller',
        orderBreakdown: orderBreakdown || {
          itemPrice: dish.price,
          deliveryFee: 25,
          platformFee: 5,
          gst: Math.round(dish.price * 0.05)
        },
        estimatedDelivery: dish.preparationTime ? `${dish.preparationTime} minutes` : '25-30 minutes'
      };

      const savedOrder = await Order.create(newOrderData);
      console.log('✅ TEMPORARY ORDER CREATED:', savedOrder.orderId);

      // ✅ CREATE TEMPORARY HISTORY ENTRY (for real-time tracking)
      try {
        const orderHistory = new OrderHistory({
          orderId: savedOrder.orderId,
          customerId: req.user?._id || req.user?.userId,
          orderMongoId: savedOrder._id,
          snapshot: {
            dishId: savedOrder.dish,
            dishName: savedOrder.item.name,
            dishImage: savedOrder.item.image,
            restaurantId: savedOrder.seller,
            restaurantName: savedOrder.item.restaurant,
            totalAmount: savedOrder.totalAmount,
            deliveryAddress: savedOrder.deliveryAddress,
            paymentMethod: savedOrder.paymentMethod,
            customerPhone: savedOrder.customerPhone,
            orderBreakdown: savedOrder.orderBreakdown
          },
          statusHistory: [{
            status: 'pending_seller',
            timestamp: new Date(),
            actor: 'system',
            note: paymentMethod === 'razorpay' 
              ? 'Order created and payment completed. Sent to seller for confirmation.' 
              : 'Order created. Awaiting seller confirmation.'
          }],
          currentStatus: 'pending_seller',
          isTemporary: true  // ✅ Mark as temporary
        });
        
        await orderHistory.save();
        console.log('✅ TEMPORARY Order history entry created');
      } catch (historyError) {
        console.error('⚠️ Failed to create order history:', historyError);
      }

      // Emit to seller dashboard
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`seller-${dish.seller._id}`).emit('new-order', {
            orderId: savedOrder.orderId,
            _id: savedOrder._id,
            customerName: savedOrder.customerName,
            customerPhone: savedOrder.customerPhone,
            item: savedOrder.item,
            totalAmount: savedOrder.totalAmount,
            deliveryAddress: savedOrder.deliveryAddress,
            createdAt: savedOrder.createdAt,
            orderStatus: savedOrder.orderStatus,
            paymentStatus: savedOrder.paymentStatus,
            paymentMethod: savedOrder.paymentMethod,
            requiresConfirmation: true
          });
          console.log('🔔 New order notification sent to seller');
        }
      } catch (socketError) {
        console.warn('⚠️ Socket notification failed:', socketError.message);
      }

      res.status(201).json({
        success: true,
        message: paymentMethod === 'razorpay' 
          ? 'Payment completed. Order sent to restaurant for confirmation' 
          : 'Order created. Waiting for seller confirmation',
        orderId: savedOrder.orderId,
        order: {
          _id: savedOrder._id,
          orderId: savedOrder.orderId,
          orderStatus: savedOrder.orderStatus,
          paymentStatus: savedOrder.paymentStatus,
          paymentMethod: savedOrder.paymentMethod,
          customerEmail: savedOrder.customerEmail,
          customerPhone: savedOrder.customerPhone,
          totalAmount: savedOrder.totalAmount,
          item: savedOrder.item,
          deliveryAddress: savedOrder.deliveryAddress,
          estimatedDelivery: savedOrder.estimatedDelivery,
          createdAt: savedOrder.createdAt,
          seller: savedOrder.seller
        }
      });

    } catch (error) {
      console.error('❌ CREATE ORDER ERROR:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create order',
        details: error.message
      });
    }
  };

  // ✅ HANDLE DELIVERY - Moves to permanent storage and cleans temporary data
  handleOrderDelivery = async (orderId) => {
    try {
      console.log('📦 Processing order delivery:', orderId);

      // Get the order
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      order.orderStatus = 'delivered';
      order.actualDeliveryTime = new Date();
      await order.save();

      // ✅ MOVE TO PERMANENT STORAGE
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        // Mark as permanent (no longer temporary)
        history.isTemporary = false;
        history.currentStatus = 'delivered';
        history.deliveryInfo = {
          actualDeliveryTime: new Date(),
          estimatedTime: order.estimatedDelivery
        };
        
        history.statusHistory.push({
          status: 'delivered',
          timestamp: new Date(),
          actor: 'seller',
          note: 'Order delivered successfully'
        });

        await history.save();
        console.log('✅ Order moved to permanent storage');
      }

      // ✅ CLEAN UP TEMPORARY ORDER DATA (optional - keep for analytics)
      // You can choose to keep the Order document or delete it
      // await Order.findByIdAndDelete(orderId);  // Uncomment to delete

      // Emit socket event
      const io = getIO();
      if (io) {
        io.to(`user-${order.customerEmail}`).emit('order-status-updated', {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          orderStatus: 'delivered',
          message: 'Your order has been delivered! Enjoy your meal!',
          timestamp: new Date()
        });
      }

      return order;
    } catch (error) {
      console.error('Error handling delivery:', error);
      throw error;
    }
  };

  // ✅ HANDLE CANCELLATION - Moves to permanent storage with cancellation reason
  handleOrderCancellation = async (orderId, cancelledBy, reason) => {
    try {
      console.log('❌ Processing order cancellation:', orderId);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order
      order.orderStatus = 'cancelled';
      order.cancelledBy = cancelledBy;
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      await order.save();

      // ✅ MOVE TO PERMANENT STORAGE WITH CANCELLATION INFO
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        history.isTemporary = false;
        history.currentStatus = 'cancelled';
        history.cancellationInfo = {
          cancelledBy,
          reason,
          timestamp: new Date(),
          refundStatus: order.paymentStatus === 'completed' ? 'pending' : 'none'
        };
        
        history.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          actor: cancelledBy,
          note: reason
        });

        await history.save();
        console.log('✅ Cancelled order moved to permanent storage');
      }

      // Emit socket event
      const io = getIO();
      if (io) {
        io.to(`user-${order.customerEmail}`).emit('order-cancelled', {
          orderId: order.orderId,
          reason,
          cancelledBy,
          timestamp: new Date()
        });
      }

      return order;
    } catch (error) {
      console.error('Error handling cancellation:', error);
      throw error;
    }
  };

  // ✅ UPDATE ORDER STATUS (temporary updates)
  updateOrderStatus = async (orderId, newStatus, actor = 'system', note = '') => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if this is a final status
      const isFinalStatus = ['delivered', 'cancelled'].includes(newStatus);

      // Update order
      order.orderStatus = newStatus;
      await order.save();
      
      // ✅ UPDATE TEMPORARY HISTORY
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        await history.addStatusChange(newStatus, actor, note || `Order status changed to ${newStatus}`);
        console.log(`✅ Temporary history updated: ${newStatus}`);

        // If final status, handle accordingly
        if (newStatus === 'delivered') {
          await this.handleOrderDelivery(orderId);
        } else if (newStatus === 'cancelled') {
          await this.handleOrderCancellation(orderId, actor, note);
        }
      }
      
      // Emit socket event
      const io = getIO();
      if (io) {
        io.to(`user-${order.customerEmail}`).emit('order-status-updated', {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
          orderStatus: newStatus,
          message: note || `Order is now ${newStatus}`,
          timestamp: new Date()
        });
      }
      
      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  // GET customer orders (shows temporary tracking data)
  getCustomerOrders = async (req, res) => {
    try {
      const customerEmail = req.user?.email || req.user?.emailId;      
      
      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not found'
        });
      }

      const orders = await Order.find({ customerEmail })
        .populate('dish', 'name image category type')
        .populate('seller', 'businessName')
        .sort({ createdAt: -1 });

      console.log(`✅ Found ${orders.length} orders for ${customerEmail}`);

      res.json({
        success: true,
        orders,
        count: orders.length
      });
    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders'
      });
    }
  };

  // GET single order by ID
  getOrderById = async (req, res) => {
    try {
      const { orderId } = req.params;
      const customerEmail = req.user?.email || req.user?.emailId;

      const order = await Order.findOne({
        $or: [
          { orderId: orderId },
          { _id: orderId }
        ],
        customerEmail: customerEmail
      })
        .populate('dish', 'name image category type')
        .populate('seller', 'businessName');

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      res.json({
        success: true,
        order
      });
    } catch (error) {
      console.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  };
}

const orderController = new OrderController();

export default orderController;
export const createOrder = orderController.createOrder;
export const getCustomerOrders = orderController.getCustomerOrders;
export const getOrderById = orderController.getOrderById;
export const updateOrderStatus = orderController.updateOrderStatus;
export const handleOrderDelivery = orderController.handleOrderDelivery;
export const handleOrderCancellation = orderController.handleOrderCancellation;

