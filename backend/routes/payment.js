// routes/payment.js - RAZORPAY OPTIMIZED VERSION
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const router = express.Router();

// Global service instances
let razorpay = null;
let emailTransporter = null;
let twilioClient = null;
let servicesInitialized = false;

// App configuration
const appConfig = {
  businessName: process.env.BUSINESS_NAME || 'TasteSphere',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@tastesphere.com',
  deliveryTimeDefault: process.env.DEFAULT_DELIVERY_TIME || '25-30 minutes',
  codFee: parseInt(process.env.COD_FEE) || 10,
  currency: process.env.CURRENCY || 'INR',
  countryCode: process.env.COUNTRY_CODE || '+91',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
};

// ==================== SERVICE INITIALIZATION ====================
const initializeServices = async () => {
  console.log(`🚀 Initializing ${appConfig.businessName} payment services...`);
  
  try {
    // 1. RAZORPAY (REQUIRED)
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ CRITICAL: Razorpay credentials missing');
      return false;
    }

    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
    });
    console.log('✅ Razorpay initialized');

    // 2. EMAIL (OPTIONAL)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      emailTransporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER.trim(),
          pass: process.env.EMAIL_PASS.trim(),
        },
        tls: { rejectUnauthorized: false }
      });

      try {
        await emailTransporter.verify();
        console.log('✅ Email service verified');
      } catch (err) {
        console.error('⚠️ Email verification failed:', err.message);
        emailTransporter = null;
      }
    }

    // 3. TWILIO/WHATSAPP (OPTIONAL)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID.trim(),
        process.env.TWILIO_AUTH_TOKEN.trim()
      );

      try {
        await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID.trim()).fetch();
        console.log('✅ Twilio service initialized');
      } catch (err) {
        console.error('⚠️ Twilio verification failed:', err.message);
        twilioClient = null;
      }
    }

    servicesInitialized = true;
    console.log('✅ All services initialized');
    return true;
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    return false;
  }
};

// ==================== NOTIFICATION HELPERS ====================
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const clean = phone.toString().replace(/\D/g, '');
  return clean.length === 10 ? `${appConfig.countryCode}${clean}` : `+${clean}`;
};

const generateEmailHTML = (orderDetails) => {
  const symbol = appConfig.currency === 'INR' ? '₹' : appConfig.currency;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .order-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b35; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🍽️ Order Confirmed!</h1>
          <p style="margin: 10px 0 0;">Thank you for choosing ${appConfig.businessName}</p>
        </div>
        <div class="content">
          <h2>Hi ${orderDetails.customerName}! 👋</h2>
          <p>Your delicious order is being prepared with love!</p>
          <div class="order-box">
            <h3 style="color: #ff6b35; margin-top: 0;">📋 Order Details</h3>
            <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
            <p><strong>Item:</strong> ${orderDetails.item.name}</p>
            <p><strong>Restaurant:</strong> ${orderDetails.item.restaurant || appConfig.businessName}</p>
            <p><strong>Total Amount:</strong> ${symbol}${orderDetails.totalAmount}</p>
            <p><strong>Payment:</strong> ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</p>
            <p><strong>Delivery:</strong> ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}</p>
            <p><strong>Address:</strong> ${orderDetails.deliveryAddress}</p>
          </div>
          ${orderDetails.paymentMethod === 'cod' ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <strong>💵 COD Note:</strong> Please keep exact change ready (${symbol}${orderDetails.totalAmount})
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appConfig.businessName}. All rights reserved.</p>
          <p>Support: ${appConfig.supportEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const generateWhatsAppMessage = (orderDetails) => {
  const symbol = appConfig.currency === 'INR' ? '₹' : appConfig.currency;
  return `🍽️ *${appConfig.businessName} Order Confirmed!*

Hi ${orderDetails.customerName}! 👋

Your delicious order is being prepared!

📋 *Order Details:*
🆔 Order ID: ${orderDetails.orderId}
🍕 Item: ${orderDetails.item.name}
🏪 Restaurant: ${orderDetails.item.restaurant || appConfig.businessName}
💰 Total: ${symbol}${orderDetails.totalAmount}
💳 Payment: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
🕐 Delivery: ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

📍 *Address:*
${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `💵 *COD Note:*
Please keep exact change ready (${symbol}${orderDetails.totalAmount})

` : ''}Thank you for choosing ${appConfig.businessName}! 🙏`;
};

const sendEmailNotification = async (orderDetails) => {
  if (!emailTransporter || !orderDetails.customerEmail) {
    return { success: false, error: 'Email service not available' };
  }

  try {
    await emailTransporter.sendMail({
      from: `"${appConfig.businessName}" <${process.env.EMAIL_USER}>`,
      to: orderDetails.customerEmail,
      subject: `Order Confirmed #${orderDetails.orderId} - ${appConfig.businessName}`,
      html: generateEmailHTML(orderDetails)
    });

    console.log('✅ Email sent to:', orderDetails.customerEmail);
    return { success: true };
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return { success: false, error: error.message };
  }
};

const sendWhatsAppNotification = async (orderDetails) => {
  if (!twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER || !orderDetails.customerPhone) {
    return { success: false, error: 'WhatsApp service not available' };
  }

  try {
    const phone = formatPhoneNumber(orderDetails.customerPhone);
    const message = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
      body: generateWhatsAppMessage(orderDetails)
    });

    console.log('✅ WhatsApp sent to:', phone);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('❌ WhatsApp failed:', error.message);
    return { success: false, error: error.message };
  }
};

// ==================== MIDDLEWARE ====================
const ensureRazorpayReady = async (req, res, next) => {
  if (!razorpay) {
    const initialized = await initializeServices();
    if (!initialized || !razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service temporarily unavailable'
      });
    }
  }
  next();
};

// ==================== ROUTES ====================

// Health Check
router.get('/health', async (req, res) => {
  if (!servicesInitialized) await initializeServices();
  
  res.json({
    success: !!razorpay,
    message: razorpay ? 'Payment service healthy' : 'Payment service unavailable',
    services: {
      razorpay: razorpay ? '✅ Ready' : '❌ Not initialized',
      email: emailTransporter ? '✅ Ready' : '⚠️ Not configured',
      whatsapp: twilioClient ? '✅ Ready' : '⚠️ Not configured'
    },
    config: appConfig,
    timestamp: new Date().toISOString()
  });
});

// Create Razorpay Order
router.post('/create-order', ensureRazorpayReady, async (req, res) => {
  try {
    const { amount, currency = appConfig.currency, receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1
    });

    console.log('✅ Razorpay order created:', order.id);

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('❌ Razorpay order creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

// Verify Razorpay Payment
router.post('/verify-payment', ensureRazorpayReady, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderDetails
    } = req.body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters'
      });
    }

    // Verify signature
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      console.error('❌ Payment signature mismatch');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    console.log('✅ Payment signature verified');

    // Get dish and seller info
    const dish = await Dish.findById(orderDetails.dishId).populate('seller');
    
    if (!dish || !dish.seller) {
      return res.status(400).json({
        success: false,
        message: 'Unable to find dish or restaurant'
      });
    }

    // Create order
    const newOrder = new Order({
      seller: dish.seller._id,
      dish: orderDetails.dishId,
      orderId: orderDetails.orderId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: dish.name,
        restaurant: dish.restaurantName || dish.seller.businessName,
        price: dish.price,
        image: dish.image || '',
        description: dish.description || '',
        dishId: orderDetails.dishId,
        category: dish.category,
        type: dish.type,
        quantity: 1
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: orderDetails.totalAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      orderStatus: 'pending_seller',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    });

    const savedOrder = await newOrder.save();
    console.log('✅ Order saved:', savedOrder.orderId);

    // Send notifications (non-blocking)
    const notifData = {
      ...orderDetails,
      item: {
        name: dish.name,
        restaurant: dish.restaurantName || dish.seller.businessName
      }
    };

    const [emailResult, whatsappResult] = await Promise.allSettled([
      sendEmailNotification(notifData),
      sendWhatsAppNotification(notifData)
    ]);

    res.json({
      success: true,
      message: 'Payment verified and order placed successfully',
      order: {
        _id: savedOrder._id.toString(),
        orderId: savedOrder.orderId,
        orderStatus: savedOrder.orderStatus,
        paymentStatus: savedOrder.paymentStatus,
        totalAmount: savedOrder.totalAmount,
        item: savedOrder.item,
        deliveryAddress: savedOrder.deliveryAddress,
        estimatedDelivery: savedOrder.estimatedDelivery,
        createdAt: savedOrder.createdAt,
        seller: savedOrder.seller.toString()
      },
      notifications: {
        email: emailResult.status === 'fulfilled' && emailResult.value.success ? 'sent' : 'failed',
        whatsapp: whatsappResult.status === 'fulfilled' && whatsappResult.value.success ? 'sent' : 'failed'
      }
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// Create COD Order
router.post('/create-cod-order', async (req, res) => {
  try {
    const { orderDetails } = req.body;

    if (!orderDetails || !orderDetails.customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Order details required'
      });
    }

    const dishId = orderDetails.dishId || orderDetails.item?.dishId;
    
    if (!dishId) {
      return res.status(400).json({
        success: false,
        message: 'Dish ID required'
      });
    }

    // Get dish and seller
    const dish = await Dish.findById(dishId).populate('seller');
    
    if (!dish || !dish.seller) {
      return res.status(400).json({
        success: false,
        message: 'Unable to find dish or restaurant'
      });
    }

    // Calculate total (COD fee already added in frontend)
    const totalAmount = typeof orderDetails.totalAmount === 'string'
      ? parseInt(orderDetails.totalAmount.replace(/\D/g, ''))
      : orderDetails.totalAmount;

    // Create COD order
    const newOrder = new Order({
      seller: dish.seller._id,
      dish: dishId,
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: dish.name,
        restaurant: dish.restaurantName || dish.seller.businessName,
        price: dish.price,
        image: dish.image || '',
        description: dish.description || '',
        dishId: dishId,
        category: dish.category,
        type: dish.type,
        quantity: 1
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: totalAmount,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'seller_accepted',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    });

    const savedOrder = await newOrder.save();
    console.log('✅ COD order saved:', savedOrder.orderId);

    // Send notifications
    const notifData = {
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: dish.name,
        restaurant: dish.restaurantName || dish.seller.businessName
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: totalAmount,
      paymentMethod: 'cod',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    };

    const [emailResult, whatsappResult] = await Promise.allSettled([
      sendEmailNotification(notifData),
      sendWhatsAppNotification(notifData)
    ]);

    res.json({
      success: true,
      message: 'COD order placed successfully',
      order: {
        _id: savedOrder._id.toString(),
        orderId: savedOrder.orderId,
        orderStatus: savedOrder.orderStatus,
        paymentStatus: savedOrder.paymentStatus,
        totalAmount: savedOrder.totalAmount,
        item: savedOrder.item,
        deliveryAddress: savedOrder.deliveryAddress,
        estimatedDelivery: savedOrder.estimatedDelivery,
        createdAt: savedOrder.createdAt,
        seller: savedOrder.seller.toString()
      },
      notifications: {
        email: emailResult.status === 'fulfilled' && emailResult.value.success ? 'sent' : 'failed',
        whatsapp: whatsappResult.status === 'fulfilled' && whatsappResult.value.success ? 'sent' : 'failed'
      }
    });

  } catch (error) {
    console.error('❌ COD order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create COD order',
      error: error.message
    });
  }
});

// Test notifications
router.post('/test-notifications', async (req, res) => {
  const { customerEmail, customerPhone, customerName = 'Test User' } = req.body;

  if (!customerEmail && !customerPhone) {
    return res.status(400).json({
      success: false,
      message: 'Email or phone required'
    });
  }

  if (!servicesInitialized) await initializeServices();

  const testData = {
    orderId: `TEST${Date.now()}`,
    customerName,
    customerEmail,
    customerPhone,
    item: { name: 'Test Pizza', restaurant: 'Test Restaurant' },
    deliveryAddress: '123 Test Street, Test City',
    totalAmount: 299,
    paymentMethod: 'test',
    estimatedDelivery: appConfig.deliveryTimeDefault
  };

  const results = {};
  
  if (customerEmail) results.email = await sendEmailNotification(testData);
  if (customerPhone) results.whatsapp = await sendWhatsAppNotification(testData);

  res.json({
    success: true,
    message: 'Test notifications sent',
    results
  });
});

// Initialize services on startup
console.log('💳 Payment routes loaded - initializing services...');
setTimeout(() => initializeServices(), 2000);

export default router;