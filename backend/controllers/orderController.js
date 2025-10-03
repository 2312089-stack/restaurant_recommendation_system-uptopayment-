// controllers/orderController.js
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { getIO, emitNewOrder, emitOrderConfirmation } from '../config/socket.js';
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

  // CREATE ORDER - UPDATED WITH SELLER STATUS CHECK
  createOrder = async (req, res) => {
    try {
      console.log('=== ORDER CREATION REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User from JWT:', req.user);
              
      const {
        dishId,
        customerName,
        deliveryAddress,
        paymentMethod,
        totalAmount,
        orderBreakdown,
        razorpayPaymentId,
        razorpayOrderId
      } = req.body;

      // Get email and phone from authenticated user (JWT)
      const customerEmail = req.user?.email || req.user?.emailId;
      const customerPhone = req.user?.phone || req.user?.phoneNumber || req.user?.mobileNumber;

      console.log('🔍 Extracted user info:', {
        customerEmail,
        customerPhone,
        fromJWT: { 
          email: req.user?.email, 
          emailId: req.user?.emailId,
          phone: req.user?.phone,
          phoneNumber: req.user?.phoneNumber,
          mobileNumber: req.user?.mobileNumber
        }
      });

      // Validation
      if (!dishId) {
        return res.status(400).json({
          success: false,
          error: 'Dish ID is required'
        });
      }

      if (!customerEmail) {
        console.error('❌ Customer email missing from JWT');
        return res.status(400).json({
          success: false,
          error: 'Customer email is required. Please login again.'
        });
      }

      if (!customerPhone) {
        console.error('❌ Customer phone missing from JWT');
        return res.status(400).json({
          success: false,
          error: 'Customer phone is required. Please update your profile.'
        });
      }

      // Clean phone number (remove non-digits)
      const cleanPhone = customerPhone.replace(/\D/g, '');

      // Fetch dish with seller information
      const dish = await Dish.findById(dishId).populate('seller');
      
      if (!dish) {
        console.error('❌ Dish not found:', dishId);
        return res.status(404).json({
          success: false,
          error: 'Dish not found'
        });
      }

      if (!dish.seller) {
        console.error('❌ Dish has no seller reference');
        return res.status(400).json({
          success: false,
          error: 'Seller information not found for this dish'
        });
      }

      // ================== SELLER STATUS VALIDATION (NEW) ===================
      const sellerId = dish.seller._id.toString();
      const sellerStatus = sellerStatusManager.getSellerStatus(sellerId);

      console.log('🔍 Checking seller status:', {
        sellerId,
        isOnline: sellerStatus?.isOnline,
        dashboardStatus: sellerStatus?.dashboardStatus
      });

      // Reject order if seller is offline
      if (!sellerStatus?.isOnline || sellerStatus?.dashboardStatus === 'offline') {
        console.log('❌ Order rejected: Seller is offline');
        return res.status(403).json({
          success: false,
          error: `${dish.seller.businessName} is currently closed and cannot accept orders. Please try again when they are online.`,
          errorCode: 'SELLER_OFFLINE',
          sellerStatus: {
            isOnline: sellerStatus?.isOnline,
            dashboardStatus: sellerStatus?.dashboardStatus,
            lastActive: sellerStatus?.lastActive
          }
        });
      }

      // Optionally log if seller is busy (still allow order)
      if (sellerStatus?.dashboardStatus === 'busy') {
        console.log('⚠️ Warning: Seller is busy but accepting order');
      }
      // ====================================================

      console.log('✅ Seller is online, proceeding with order creation');

      // Create order data
      const orderData = {
        seller: dish.seller._id,
        dish: dishId,
        razorpayPaymentId: razorpayPaymentId || null,
        razorpayOrderId: razorpayOrderId || null,
        customerName: customerName || req.user?.name || 'Customer',
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
        deliveryAddress: deliveryAddress || 'Address not provided',
        totalAmount: totalAmount || dish.price,
        paymentMethod: paymentMethod || 'razorpay',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
        orderStatus: 'confirmed',
        orderBreakdown: orderBreakdown || {
          itemPrice: dish.price,
          deliveryFee: 25,
          platformFee: 5,
          gst: Math.round(dish.price * 0.05)
        },
        estimatedDelivery: dish.preparationTime ? `${dish.preparationTime} minutes` : '25-30 minutes'
      };

      console.log('📝 Creating order with data:', JSON.stringify(orderData, null, 2));
      const order = await Order.create(orderData);

      console.log('✅ ORDER CREATED SUCCESSFULLY:', {
        orderId: order.orderId,
        _id: order._id,
        seller: order.seller,
        orderStatus: order.orderStatus,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone
      });

      // Real-time seller notification
      try {
        emitNewOrder(dish.seller._id, {
          orderId: order.orderId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          item: order.item,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt,
          orderStatus: order.orderStatus
        });
        console.log('🔔 Real-time notification sent to seller:', dish.seller._id);
      } catch (socketError) {
        console.warn('⚠️ Socket notification failed:', socketError.message);
      }

      // Real-time customer confirmation
      try {
        emitOrderConfirmation(order.customerEmail, {
          orderId: order.orderId,
          status: order.orderStatus,
          estimatedTime: order.estimatedDelivery
        });
        console.log('✅ Real-time confirmation sent to customer:', order.customerEmail);
      } catch (socketError) {
        console.warn('⚠️ Customer socket notification failed:', socketError.message);
      }

      // Send email/SMS notifications
      const notificationResults = await this.sendOrderNotifications(order, dish.seller);

      // RETURN COMPLETE ORDER DATA
      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        orderId: order.orderId,
        order: {
          _id: order._id,
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          totalAmount: order.totalAmount,
          item: order.item,
          deliveryAddress: order.deliveryAddress,
          estimatedDelivery: order.estimatedDelivery,
          createdAt: order.createdAt
        },
        notifications: notificationResults
      });

    } catch (error) {
      console.error('❌ CREATE ORDER ERROR:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to create order',
        details: error.message
      });
    }
  };

  // Send order notifications (email/SMS)
  sendOrderNotifications = async (order, seller) => {
    const results = {
      email: { sent: false },
      whatsapp: { sent: false }
    };

    // Email notification
    if (this.emailTransporter && order.customerEmail) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: order.customerEmail,
          subject: `Order Confirmed - ${order.orderId}`,
          html: `
            <h2>Order Confirmation</h2>
            <p>Your order has been confirmed!</p>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
            <p><strong>Item:</strong> ${order.item.name}</p>
            <p><strong>Total:</strong> ₹${order.totalAmount}</p>
            <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
          `
        };

        const info = await this.emailTransporter.sendMail(mailOptions);
        results.email.sent = true;
        results.email.messageId = info.messageId;
        
        await order.markNotificationSent('email', info.messageId);
        console.log('✅ Email notification sent');
      } catch (err) {
        console.error('❌ Email notification failed:', err);
        results.email.error = err.message;
      }
    }

    // SMS/WhatsApp notification
    if (this.twilioClient && order.customerPhone) {
      try {
        const message = await this.twilioClient.messages.create({
          body: `Order ${order.orderId} confirmed! Status: ${order.orderStatus}. Total: ₹${order.totalAmount}. Estimated delivery: ${order.estimatedDelivery}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+91${order.customerPhone}`
        });

        results.whatsapp.sent = true;
        results.whatsapp.sid = message.sid;
        
        await order.markNotificationSent('whatsapp', null, message.sid);
        console.log('✅ SMS notification sent');
      } catch (err) {
        console.error('❌ SMS notification failed:', err);
        results.whatsapp.error = err.message;
      }
    }

    return results;
  };

  // GET customer orders
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
