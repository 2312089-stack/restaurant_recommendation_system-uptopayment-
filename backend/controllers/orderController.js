// backend/controllers/orderController.js - COMPLETE WITH NOTIFICATION INTEGRATION
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import User from '../models/User.js';
import OrderHistory from '../models/OrderHistory.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notificationService.js';
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

  // ✅ CREATE ORDER with notifications
  createOrder = async (req, res) => {
    try {
      console.log('=== ORDER CREATION REQUEST ===');
      
      const orderData = req.body.orderDetails || req.body;
      const { dishId, customerName, customerEmail, customerPhone, deliveryAddress, totalAmount, orderBreakdown, paymentMethod } = orderData;

      if (!dishId || !customerEmail || !customerPhone) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // ✅ CRITICAL: Find user FIRST to get customerId
      const user = await User.findOne({ emailId: customerEmail });
      
      if (!user) {
        console.error('❌ User not found for email:', customerEmail);
        return res.status(404).json({ 
          success: false, 
          error: 'User not found. Please ensure you are logged in.' 
        });
      }

      console.log('✅ User found:', {
        userId: user._id,
        email: user.emailId,
        name: user.name || user.fullName
      });

      const dish = await Dish.findById(dishId).populate('seller');
      
      if (!dish || !dish.seller) {
        return res.status(404).json({ success: false, error: 'Dish or seller not found' });
      }

      if (!dish.seller.isActive) {
        return res.status(403).json({
          success: false,
          error: `${dish.seller.businessName} account is currently inactive`,
          errorCode: 'SELLER_INACTIVE'
        });
      }

      if (!dish.availability || !dish.isActive) {
        return res.status(403).json({
          success: false,
          error: 'This dish is currently unavailable',
          errorCode: 'DISH_UNAVAILABLE'
        });
      }

      const cleanPhone = customerPhone.replace(/\D/g, '');
      const addressString = typeof deliveryAddress === 'string' 
        ? deliveryAddress 
        : `${deliveryAddress.fullName}, ${deliveryAddress.address}, ${deliveryAddress.phoneNumber}`;

      // ✅ CRITICAL: Include customerId in order data
      const newOrderData = {
        customerId: user._id, // ← CRITICAL FIX: Add this line!
        seller: dish.seller._id,
        dish: dishId,
        customerName: customerName || user.name || user.fullName || 'Customer',
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

      console.log('📦 Creating order with customerId:', user._id);

      const savedOrder = await Order.create(newOrderData);
      console.log('✅ ORDER CREATED:', {
        orderId: savedOrder.orderId,
        customerId: savedOrder.customerId,
        customerEmail: savedOrder.customerEmail
      });

      // ✅ SEND NOTIFICATION TO CUSTOMER
      try {
        if (paymentMethod === 'razorpay') {
          await notificationService.createNotification(
            user._id,
            'payment_confirmed',
            '✅ Payment Successful!',
            `Payment of ₹${savedOrder.totalAmount} received for order #${savedOrder.orderId}. Your order has been sent to the restaurant for confirmation.`,
            {
              orderId: savedOrder.orderId,
              orderMongoId: savedOrder._id,
              actionUrl: `/order-tracking/${savedOrder.orderId}`,
              priority: 'high',
              amount: savedOrder.totalAmount,
              restaurant: savedOrder.item.restaurant
            }
          );
          console.log('✅ Payment confirmation notification sent');
        } else {
          await notificationService.createNotification(
            user._id,
            'general',
            '📦 Order Placed Successfully!',
            `Your order #${savedOrder.orderId} has been placed and sent to ${savedOrder.item.restaurant} for confirmation.`,
            {
              orderId: savedOrder.orderId,
              orderMongoId: savedOrder._id,
              actionUrl: `/order-tracking/${savedOrder.orderId}`,
              priority: 'high',
              amount: savedOrder.totalAmount,
              restaurant: savedOrder.item.restaurant
            }
          );
          console.log('✅ Order placement notification sent');
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send customer notification:', notificationError);
      }

      // ✅ CREATE ORDER HISTORY ENTRY
      try {
        const orderHistory = new OrderHistory({
          orderId: savedOrder.orderId,
          customerId: user._id, // ← Include customerId
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
          isTemporary: true
        });
        
        await orderHistory.save();
        console.log('✅ Order history entry created with customerId');
      } catch (historyError) {
        console.error('⚠️ Failed to create order history:', historyError);
      }

      // ✅ EMIT TO SELLER DASHBOARD
      try {
        const io = req.app.get('io');
        const sellerId = dish.seller._id.toString();

        if (io) {
          io.to(`seller-${sellerId}`).emit('new-order', {
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
          console.log('🔔 Real-time notification sent to seller');
        }
      } catch (socketError) {
        console.warn('⚠️ Socket notification failed:', socketError.message);
      }

      // ✅ SEND EMAIL NOTIFICATION to seller
      try {
        if (this.emailTransporter && dish.seller.email) {
          await this.emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: dish.seller.email,
            subject: `🔔 New Order #${savedOrder.orderId} - ${dish.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff6b35;">New Order Received!</h2>
                <p>You have a new order waiting for confirmation.</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>Order Details</h3>
                  <p><strong>Order ID:</strong> ${savedOrder.orderId}</p>
                  <p><strong>Item:</strong> ${savedOrder.item.name}</p>
                  <p><strong>Customer:</strong> ${savedOrder.customerName}</p>
                  <p><strong>Phone:</strong> ${savedOrder.customerPhone}</p>
                  <p><strong>Amount:</strong> ₹${savedOrder.totalAmount}</p>
                  <p><strong>Payment:</strong> ${paymentMethod === 'razorpay' ? '✅ Paid Online' : '💵 COD'}</p>
                </div>

                <p style="color: #666;">
                  <strong>⚠️ Action Required:</strong><br>
                  Please log in to your dashboard to accept or reject this order.
                </p>

                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/dashboard" 
                   style="display: inline-block; background: #ff6b35; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; margin-top: 20px;">
                  View Order in Dashboard
                </a>
              </div>
            `
          });
          console.log('✅ Email notification sent to seller');
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send email notification:', emailError);
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
          customerId: savedOrder.customerId, // ← Include in response
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

  // ✅ UPDATE ORDER STATUS with notifications
  updateOrderStatus = async (orderId, newStatus, actor = 'system', note = '') => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      order.orderStatus = newStatus;
      await order.save();
      
      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
        await history.addStatusChange(newStatus, actor, note || `Order status changed to ${newStatus}`);
        console.log(`✅ History updated: ${newStatus}`);
      }

      // ✅ SEND NOTIFICATION TO CUSTOMER using notificationService
      const user = await User.findOne({ emailId: order.customerEmail });
      
      if (user) {
        await notificationService.sendOrderStatusNotification(orderId, newStatus, user._id);
      }

      // Handle special cases
      if (newStatus === 'delivered') {
        await this.handleOrderDelivery(orderId);
        
        // Send reorder suggestion after 3 days
        if (user) {
          setTimeout(() => {
            notificationService.sendReorderSuggestion(user._id);
          }, 3 * 24 * 60 * 60 * 1000); // 3 days
        }
      } else if (newStatus === 'cancelled') {
        await this.handleOrderCancellation(orderId, actor, note);
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

  // ✅ HANDLE DELIVERY
  handleOrderDelivery = async (orderId) => {
    try {
      console.log('📦 Processing order delivery:', orderId);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.orderStatus = 'delivered';
      order.actualDeliveryTime = new Date();
      await order.save();

      const history = await OrderHistory.findOne({ orderMongoId: orderId });
      if (history) {
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

      return order;
    } catch (error) {
      console.error('Error handling delivery:', error);
      throw error;
    }
  };

  // ✅ HANDLE CANCELLATION
  handleOrderCancellation = async (orderId, cancelledBy, reason) => {
    try {
      console.log('❌ Processing order cancellation:', orderId);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.orderStatus = 'cancelled';
      order.cancelledBy = cancelledBy;
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      await order.save();

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

      return order;
    } catch (error) {
      console.error('Error handling cancellation:', error);
      throw error;
    }
  };

  // ✅ GET CUSTOMER ORDERS
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

  // ✅ GET SINGLE ORDER BY ID
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