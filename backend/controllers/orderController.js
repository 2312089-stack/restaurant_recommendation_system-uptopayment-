// controllers/orderController.js - COMPLETE FIXED VERSION
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

// controllers/orderController.js
createOrder = async (req, res) => {
  try {
    console.log('=== ORDER CREATION REQUEST (NEW FLOW) ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from JWT:', req.user);
    
    // ✅ FIX: Extract from nested orderDetails OR directly from body
    const orderData = req.body.orderDetails || req.body;
    
    const {
      dishId,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      totalAmount,
      orderBreakdown
    } = orderData;

    // Validation
    if (!dishId) {
      return res.status(400).json({
        success: false,
        error: 'Dish ID is required'
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Customer email is required'
      });
    }

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        error: 'Customer phone is required'
      });
    }

    // Clean phone number
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

    // ✅ Check seller status
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

    console.log('✅ Seller is online, creating order with pending_seller status');

    // ✅ Handle deliveryAddress - could be string or object
    const addressString = typeof deliveryAddress === 'string' 
      ? deliveryAddress 
      : `${deliveryAddress.fullName}, ${deliveryAddress.address}${deliveryAddress.landmark ? ', ' + deliveryAddress.landmark : ''}, ${deliveryAddress.phoneNumber}`;

    // ✅ Create order in PENDING_SELLER state
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
      paymentMethod: 'pending',
      paymentStatus: 'pending',
      orderStatus: 'pending_seller',
      orderBreakdown: orderBreakdown || {
        itemPrice: dish.price,
        deliveryFee: 25,
        platformFee: 5,
        gst: Math.round(dish.price * 0.05)
      },
      estimatedDelivery: dish.preparationTime ? `${dish.preparationTime} minutes` : '25-30 minutes'
    };

    console.log('📝 Creating order with data:', JSON.stringify(newOrderData, null, 2));
    const order = await Order.create(newOrderData);

    console.log('✅ ORDER CREATED SUCCESSFULLY:', {
      orderId: order.orderId,
      _id: order._id,
      seller: order.seller,
      orderStatus: order.orderStatus,
      customerEmail: order.customerEmail
    });

    // ✅ Emit to seller dashboard for confirmation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`seller-${dish.seller._id}`).emit('new-order', {
          orderId: order.orderId,
          _id: order._id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          item: order.item,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt,
          orderStatus: order.orderStatus,
          requiresConfirmation: true
        });
        console.log('🔔 New order notification sent to seller:', dish.seller._id);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket notification failed:', socketError.message);
    }

    // ✅ RETURN COMPLETE ORDER DATA
    res.status(201).json({
      success: true,
      message: 'Order sent to restaurant for confirmation',
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
        createdAt: order.createdAt,
        seller: order.seller
      }
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
          subject: `Order Sent for Confirmation - ${order.orderId}`,
          html: `
            <h2>Order Sent to Restaurant</h2>
            <p>Your order has been sent to ${order.item.restaurant} for confirmation.</p>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> Awaiting restaurant confirmation</p>
            <p><strong>Item:</strong> ${order.item.name}</p>
            <p><strong>Total:</strong> ₹${order.totalAmount}</p>
            <p>You'll be notified once the restaurant confirms your order.</p>
          `
        };

        const info = await this.emailTransporter.sendMail(mailOptions);
        results.email.sent = true;
        results.email.messageId = info.messageId;
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
          body: `Order ${order.orderId} sent to ${order.item.restaurant}. Awaiting confirmation. Total: ₹${order.totalAmount}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+91${order.customerPhone}`
        });

        results.whatsapp.sent = true;
        results.whatsapp.sid = message.sid;
        console.log('✅ SMS notification sent');
      } catch (err) {
        console.error('❌ SMS notification failed:', err);
        results.whatsapp.error = err.message;
      }
    }

    return results;
  };

  // GET customer orders (includes all statuses)
  getCustomerOrders = async (req, res) => {
    try {
      const customerEmail = req.user?.email || req.user?.emailId;      
      
      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          error: 'Customer email not found'
        });
      }

      // ✅ Fetch ALL orders including pending_seller, seller_rejected, etc.
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



