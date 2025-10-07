// routes/payment.js - COMPLETE FIXED VERSION
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const router = express.Router();

// Global service instances
let razorpay = null;
let emailTransporter = null;
let twilioClient = null;
let servicesInitialized = false;

// Dynamic configuration object
let appConfig = {
  businessName: process.env.BUSINESS_NAME || 'TasteSphere',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@tastesphere.com',
  deliveryTimeDefault: process.env.DEFAULT_DELIVERY_TIME || '25-30 minutes',
  codFee: parseInt(process.env.COD_FEE) || 10,
  currency: process.env.CURRENCY || 'INR',
  countryCode: process.env.COUNTRY_CODE || '+91',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
};

// Enhanced service initialization
const initializeAllServices = async () => {
  console.log(`Initializing ${appConfig.businessName} payment services...`);
  
  try {
    // 1. Initialize Razorpay (REQUIRED)
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID.trim(),
        key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
      });
      console.log('✅ Razorpay initialized');
    } else {
      console.error('❌ Razorpay credentials missing');
      return false;
    }

    // 2. Initialize Email Service
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('Initializing Email service for:', process.env.EMAIL_USER);
      
      const emailConfig = {
        auth: {
          user: process.env.EMAIL_USER.trim(),
          pass: process.env.EMAIL_PASS.trim(),
        },
        tls: { rejectUnauthorized: false }
      };

      if (process.env.EMAIL_SERVICE) {
        emailConfig.service = process.env.EMAIL_SERVICE;
      } else {
        emailConfig.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        emailConfig.port = parseInt(process.env.SMTP_PORT) || 587;
        emailConfig.secure = process.env.SMTP_SECURE === 'true' || false;
      }

      emailTransporter = nodemailer.createTransport(emailConfig);

      try {
        await emailTransporter.verify();
        console.log('✅ Email service verified');
      } catch (emailError) {
        console.error('❌ Email verification failed:', emailError.message);
        emailTransporter = null;
      }
    } else {
      console.log('Email credentials not configured');
    }

    // 3. Initialize Twilio Service
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      console.log('Initializing Twilio service...');
      
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID.trim(),
        process.env.TWILIO_AUTH_TOKEN.trim()
      );
      
      try {
        const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID.trim()).fetch();
        console.log('✅ Twilio service initialized:', account.friendlyName);
      } catch (twilioError) {
        console.error('❌ Twilio verification failed:', twilioError.message);
        twilioClient = null;
      }
    } else {
      console.log('Twilio credentials not configured');
    }

    servicesInitialized = true;
    console.log('✅ Service initialization completed');
    return true;
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    servicesInitialized = false;
    return false;
  }
};

// Dynamic phone number formatting
const formatPhoneNumber = (phoneNumber, countryCode = appConfig.countryCode) => {
  if (!phoneNumber) return null;
  
  let cleanPhone = phoneNumber.toString().replace(/\D/g, '');
  
  const codeDigits = countryCode.replace('+', '');
  const expectedLength = codeDigits.length + 10;
  
  if (cleanPhone.length === 10) {
    return countryCode + cleanPhone;
  } else if (cleanPhone.length === expectedLength && cleanPhone.startsWith(codeDigits)) {
    return '+' + cleanPhone;
  } else if (!cleanPhone.startsWith(codeDigits) && cleanPhone.length === 10) {
    return countryCode + cleanPhone;
  }
  
  return phoneNumber;
};

// Dynamic message template generator
const generateMessageTemplate = (orderDetails, messageType = 'whatsapp') => {
  const templates = {
    whatsapp: `${appConfig.businessName} Order Confirmed!

Hi ${orderDetails.customerName}!

Your delicious order is being prepared with love!

Order Details:
Order ID: ${orderDetails.orderId}
Item: ${orderDetails.item.name}
Restaurant: ${orderDetails.item.restaurant || appConfig.businessName}
Total Amount: ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount}
Payment Method: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
Estimated Delivery: ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

Delivery Address:
${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `Cash on Delivery Note:
Please keep exact change ready. Our delivery partner will collect ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount} when your order arrives.

` : ''}Thank you for choosing ${appConfig.businessName}!

This is an automated message from ${appConfig.businessName}`,

    sms: `${appConfig.businessName} Order Confirmed!

Hi ${orderDetails.customerName}!

Order ID: ${orderDetails.orderId}
Item: ${orderDetails.item.name}
Total: ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount}
Payment: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
Delivery: ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

Address: ${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `COD: Please keep exact change ready (${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount})` : ''}

Thank you!`
  };

  return templates[messageType] || templates.sms;
};

// Enhanced WhatsApp/SMS notification
const sendMessageNotification = async (orderDetails, preferWhatsApp = true) => {
  console.log('Attempting to send message notification to:', orderDetails.customerPhone);
  
  if (!twilioClient) {
    return { 
      success: false, 
      error: 'Messaging service not configured'
    };
  }

  if (!orderDetails.customerPhone) {
    console.error('No customer phone provided');
    return { 
      success: false, 
      error: 'Customer phone number not provided' 
    };
  }

  try {
    const customerPhone = formatPhoneNumber(orderDetails.customerPhone, appConfig.countryCode);
    
    if (!customerPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    console.log('Formatted phone number:', customerPhone);

    let messageResult = { success: false };
    
    // Try WhatsApp first if preferred and configured
    if (preferWhatsApp && (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER)) {
      const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER;
      const whatsappMessage = generateMessageTemplate(orderDetails, 'whatsapp');
      
      try {
        console.log('Attempting WhatsApp to:', `whatsapp:${customerPhone}`);
        
        const message = await twilioClient.messages.create({
          from: `whatsapp:${fromWhatsAppNumber}`,
          to: `whatsapp:${customerPhone}`,
          body: whatsappMessage
        });

        console.log('✅ WhatsApp sent successfully');
        messageResult = { 
          success: true, 
          sid: message.sid,
          method: 'whatsapp'
        };
        
      } catch (whatsappError) {
        console.log('WhatsApp failed, trying SMS fallback...');
        
        // Fallback to SMS
        if (process.env.TWILIO_PHONE_NUMBER) {
          try {
            const smsMessage = generateMessageTemplate(orderDetails, 'sms');
            
            const smsResult = await twilioClient.messages.create({
              from: process.env.TWILIO_PHONE_NUMBER,
              to: customerPhone,
              body: smsMessage
            });

            console.log('✅ SMS fallback sent successfully');
            messageResult = { 
              success: true, 
              sid: smsResult.sid,
              method: 'sms_fallback'
            };
            
          } catch (smsError) {
            console.error('❌ SMS fallback also failed:', smsError.message);
            messageResult = {
              success: false,
              error: `Both WhatsApp and SMS failed`
            };
          }
        }
      }
    } 
    // Direct SMS if WhatsApp not preferred
    else if (process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsMessage = generateMessageTemplate(orderDetails, 'sms');
        
        const message = await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: customerPhone,
          body: smsMessage
        });

        console.log('✅ SMS sent successfully');
        messageResult = { 
          success: true, 
          sid: message.sid,
          method: 'sms'
        };
        
      } catch (smsError) {
        console.error('❌ SMS sending failed:', smsError.message);
        messageResult = {
          success: false,
          error: smsError.message
        };
      }
    }
    
    return messageResult;
    
  } catch (error) {
    console.error('❌ Message notification failed:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
};

// Dynamic email template generator
const generateEmailTemplate = (orderDetails) => {
  const currencySymbol = appConfig.currency === 'INR' ? '₹' : appConfig.currency;
  const currentDate = new Date().toLocaleString('en-IN', { 
    timeZone: appConfig.timezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${appConfig.businessName} Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing ${appConfig.businessName}</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${orderDetails.customerName}!</h2>
          <p style="color: #666; line-height: 1.6;">Your order has been confirmed and we're preparing it with love!</p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff6b35;">
            <h3 style="color: #ff6b35; margin: 0 0 20px 0; font-size: 20px;">Order Summary</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Order ID:</td>
                <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #eee;">${orderDetails.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Item:</td>
                <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #eee;">${orderDetails.item.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Restaurant:</td>
                <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #eee;">${orderDetails.item.restaurant || appConfig.businessName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Payment Method:</td>
                <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #eee;">${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Total Amount:</td>
                <td style="padding: 10px 0; font-size: 20px; font-weight: bold; color: #ff6b35; border-bottom: 1px solid #eee;">${currencySymbol}${orderDetails.totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555; border-bottom: 1px solid #eee;">Order Time:</td>
                <td style="padding: 10px 0; color: #333; border-bottom: 1px solid #eee;">${currentDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Estimated Delivery:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2; font-size: 16px;">Delivery Address</h4>
            <p style="margin: 0; line-height: 1.5; color: #555;">${orderDetails.deliveryAddress}</p>
          </div>
          
          ${orderDetails.paymentMethod === 'cod' ? `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">Cash on Delivery Instructions</h4>
            <p style="margin: 0; line-height: 1.5; color: #856404;">Please keep exact change ready. Our delivery partner will collect ${currencySymbol}${orderDetails.totalAmount} at the time of delivery.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; padding: 25px; background: #f0f8ff; border-radius: 8px;">
            <h3 style="color: #ff6b35; margin: 0 0 10px 0; font-size: 22px;">Thank You!</h3>
            <p style="margin: 0; color: #666; line-height: 1.5;">Your delicious meal is being prepared right now</p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${appConfig.businessName}. All rights reserved.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">For support, contact us at ${appConfig.supportEmail}</p>
        </div>
        
      </div>
    </body>
    </html>
  `;
};

// Enhanced email notification
const sendEmailNotification = async (orderDetails) => {
  console.log('Attempting to send email notification to:', orderDetails.customerEmail);
  
  if (!emailTransporter) {
    return { 
      success: false, 
      error: 'Email service not configured'
    };
  }

  if (!orderDetails.customerEmail) {
    console.error('No customer email provided');
    return { 
      success: false, 
      error: 'Customer email not provided' 
    };
  }

  try {
    const emailTemplate = generateEmailTemplate(orderDetails);
    const currencySymbol = appConfig.currency === 'INR' ? '₹' : appConfig.currency;

    const mailOptions = {
      from: {
        name: appConfig.businessName,
        address: process.env.EMAIL_USER
      },
      to: orderDetails.customerEmail,
      subject: `Order Confirmed #${orderDetails.orderId} - ${appConfig.businessName}`,
      html: emailTemplate,
      text: `
${appConfig.businessName} Order Confirmation

Hi ${orderDetails.customerName}!

Your order has been confirmed:
- Order ID: ${orderDetails.orderId}
- Item: ${orderDetails.item.name}
- Restaurant: ${orderDetails.item.restaurant || appConfig.businessName}
- Total: ${currencySymbol}${orderDetails.totalAmount}
- Payment: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
- Estimated Delivery: ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

Delivery Address: ${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `Cash on Delivery: Please keep exact change ready (${currencySymbol}${orderDetails.totalAmount})` : ''}

Thank you for choosing ${appConfig.businessName}!

For support: ${appConfig.supportEmail}
      `
    };

    console.log('Sending email to:', orderDetails.customerEmail);
    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully');
    
    return { 
      success: true, 
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    return { 
      success: false, 
      error: error.message
    };
  }
};

// Middleware to ensure services are initialized
const ensureServicesReady = async (req, res, next) => {
  if (!servicesInitialized || !razorpay) {
    console.log('Services not ready, initializing...');
    const success = await initializeAllServices();
    
    if (!success || !razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment services are temporarily unavailable'
      });
    }
  }
  next();
};

// Health check
router.get('/health', async (req, res) => {
  if (!servicesInitialized) {
    await initializeAllServices();
  }
  
  const healthData = {
    success: !!razorpay,
    message: razorpay ? `${appConfig.businessName} payment service is healthy` : 'Payment service has issues',
    businessConfig: appConfig,
    services: {
      razorpay: razorpay ? 'initialized' : 'not initialized',
      email: emailTransporter ? 'initialized' : 'not configured',
      twilio: twilioClient ? 'initialized' : 'not configured'
    },
    timestamp: new Date().toISOString()
  };

  res.status(razorpay ? 200 : 503).json(healthData);
});

// Create Razorpay order
router.post('/create-order', ensureServicesReady, async (req, res) => {
  try {
    const { amount, currency = appConfig.currency, receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100),
      currency: currency.toUpperCase(),
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
      config: {
        businessName: appConfig.businessName,
        currency: appConfig.currency
      }
    });

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: error.message
    });
  }
});

// Verify payment endpoint
router.post('/verify-payment', ensureServicesReady, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderDetails,
    } = req.body;

    console.log('Payment verification request received');

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    console.log('✅ Payment signature verified');

    // Fetch dish and seller
    const Dish = (await import('../models/Dish.js')).default;
    const dish = await Dish.findById(orderDetails.dishId).populate('seller');

    if (!dish || !dish.seller) {
      return res.status(400).json({
        success: false,
        message: 'Unable to link order to restaurant'
      });
    }

    // Create order with seller linkage
    const orderDataForSave = {
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
      estimatedDelivery: orderDetails.estimatedDelivery || '25-30 minutes',
    };




    const newOrder = new Order(orderDataForSave);
    const savedOrder = await newOrder.save();
    
    console.log('✅ Order saved:', savedOrder.orderId);

    // Send notifications (non-blocking)
    const notificationPromises = [
      sendEmailNotification(orderDetails).catch(err => {
        console.error('Email notification failed:', err);
        return { success: false, error: err.message };
      }),
      sendMessageNotification(orderDetails, true).catch(err => {
        console.error('Message notification failed:', err);
        return { success: false, error: err.message };
      })
    ];

    const [emailResult, messageResult] = await Promise.allSettled(notificationPromises);

    // Return COMPLETE order data including _id
    res.json({
      success: true,
      message: 'Payment verified and order placed successfully',
      order: {
        _id: savedOrder._id.toString(),
        orderId: savedOrder.orderId,
        orderStatus: savedOrder.orderStatus,
        paymentStatus: savedOrder.paymentStatus,
        customerEmail: savedOrder.customerEmail,
        customerPhone: savedOrder.customerPhone,
        totalAmount: savedOrder.totalAmount,
        item: savedOrder.item,
        deliveryAddress: savedOrder.deliveryAddress,
        estimatedDelivery: savedOrder.estimatedDelivery,
        createdAt: savedOrder.createdAt,
        seller: savedOrder.seller.toString()
      },
      notifications: {
        email: emailResult.status === 'fulfilled' && emailResult.value.success ? 'sent' : 'failed',
        message: messageResult.status === 'fulfilled' && messageResult.value.success ? 'sent' : 'failed'
      }
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment verification',
      error: error.message
    });
  }
});

// Create COD order - SINGLE FIXED VERSION
router.post('/create-cod-order', async (req, res) => {
  try {
    const { orderDetails } = req.body;

    // Validation
    if (!orderDetails || !orderDetails.customerEmail || !orderDetails.customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Order details with customer email and phone are required'
      });
    }

    console.log('📝 Processing COD order for:', orderDetails.customerName);

    // Extract and validate dishId
    const dishId = orderDetails.dishId || orderDetails.item?.dishId;
    
    if (!dishId) {
      console.error('❌ No dishId provided in orderDetails');
      return res.status(400).json({
        success: false,
        message: 'Dish ID is required for order creation'
      });
    }

    // Fetch dish and seller
    const Dish = (await import('../models/Dish.js')).default;
    const dish = await Dish.findById(dishId).populate('seller');

    if (!dish || !dish.seller) {
      console.error('❌ Dish or seller not found for dishId:', dishId);
      return res.status(400).json({
        success: false,
        message: 'Unable to link order to restaurant'
      });
    }

    console.log('✅ Dish and seller found:', {
      dishName: dish.name,
      sellerName: dish.seller.businessName
    });

    // Calculate final amount
    let totalAmount = 0;
    if (typeof orderDetails.totalAmount === 'string') {
      totalAmount = parseInt(orderDetails.totalAmount.replace(/[^\d]/g, '')) || 0;
    } else {
      totalAmount = orderDetails.totalAmount;
    }

    const finalAmount = totalAmount; // COD fee should already be included from frontend

    // Create order with seller linkage
    const orderDataForSave = {
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
      totalAmount: finalAmount,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'seller_accepted',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    };

    const newOrder = new Order(orderDataForSave);
    const savedOrder = await newOrder.save();
    
    console.log('✅ COD order saved with ID:', savedOrder._id);

    // Prepare notification data
    const notificationData = {
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: dish.name,
        restaurant: dish.restaurantName || dish.seller.businessName,
        price: dish.price
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: finalAmount,
      paymentMethod: 'cod',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    };

    // Send notifications (non-blocking)
    const notificationPromises = [
      sendEmailNotification(notificationData).catch(err => {
        console.error('Email notification failed:', err);
        return { success: false, error: err.message };
      }),
      sendMessageNotification(notificationData, true).catch(err => {
        console.error('Message notification failed:', err);
        return { success: false, error: err.message };
      })
    ];

    const [emailResult, messageResult] = await Promise.allSettled(notificationPromises);

    // CRITICAL: Return COMPLETE order data including _id for socket rooms
    res.json({
      success: true,
      message: 'COD order placed successfully',
      order: {
        _id: savedOrder._id.toString(),  // CRITICAL FOR SOCKET ROOMS
        orderId: savedOrder.orderId,
        orderStatus: savedOrder.orderStatus,
        paymentStatus: savedOrder.paymentStatus,
        customerEmail: savedOrder.customerEmail,
        customerPhone: savedOrder.customerPhone,
        totalAmount: savedOrder.totalAmount,
        item: savedOrder.item,
        deliveryAddress: savedOrder.deliveryAddress,
        estimatedDelivery: savedOrder.estimatedDelivery,
        createdAt: savedOrder.createdAt,
        seller: savedOrder.seller.toString()
      },
      notifications: {
        email: emailResult.status === 'fulfilled' && emailResult.value.success ? 'sent' : 'failed',
        message: messageResult.status === 'fulfilled' && messageResult.value.success ? 'sent' : 'failed'
      }
    });

  } catch (error) {
    console.error('❌ COD order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating COD order',
      error: error.message
    });
  }
});

// Test message endpoint
router.post('/test-message', async (req, res) => {
  const { 
    phoneNumber, 
    customerName = 'Test Customer', 
    preferWhatsApp = true
  } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required for testing'
    });
  }

  if (!servicesInitialized) {
    await initializeAllServices();
  }

  const testOrderDetails = {
    orderId: 'TEST' + Date.now(),
    customerName: customerName,
    customerPhone: phoneNumber,
    item: {
      name: 'Test Margherita Pizza',
      restaurant: 'Test Pizzeria'
    },
    deliveryAddress: '123 Test Street, Test City',
    totalAmount: 299,
    paymentMethod: 'test',
    estimatedDelivery: appConfig.deliveryTimeDefault
  };

  const messageResult = await sendMessageNotification(testOrderDetails, preferWhatsApp);

  res.json({
    success: messageResult.success,
    message: messageResult.success ? 'Test message sent successfully' : 'Message sending failed',
    result: messageResult
  });
});

// Test notifications endpoint
router.post('/test-notifications', async (req, res) => {
  const { 
    customerEmail, 
    customerPhone, 
    customerName = 'Test Customer'
  } = req.body;
  
  if (!customerEmail && !customerPhone) {
    return res.status(400).json({
      success: false,
      message: 'Either customer email or phone number is required'
    });
  }

  if (!servicesInitialized) {
    await initializeAllServices();
  }

  const testOrderDetails = {
    orderId: 'TEST' + Date.now(),
    customerName: customerName,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    item: {
      name: 'Test Margherita Pizza',
      restaurant: 'Test Pizzeria'
    },
    deliveryAddress: '123 Test Street, Test City',
    totalAmount: 299,
    paymentMethod: 'test',
    estimatedDelivery: appConfig.deliveryTimeDefault
  };

  const results = {};
  
  if (customerEmail) {
    results.email = await sendEmailNotification(testOrderDetails);
  }
  
  if (customerPhone) {
    results.message = await sendMessageNotification(testOrderDetails, true);
  }

  res.json({
    success: true,
    message: 'Notification test completed',
    results: results
  });
});

// Initialize services on module load
console.log('Dynamic payment routes loaded - initializing services...');
setTimeout(async () => {
  console.log('Starting service initialization...');
  await initializeAllServices();
}, 2000);

export default router;