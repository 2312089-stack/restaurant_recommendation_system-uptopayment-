// routes/payment.js - FIXED VERSION with dynamic notifications
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

// Dynamic configuration object - can be updated via API
let appConfig = {
  businessName: process.env.BUSINESS_NAME || 'TasteSphere',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@tastesphere.com',
  deliveryTimeDefault: process.env.DEFAULT_DELIVERY_TIME || '25-30 minutes',
  codFee: parseInt(process.env.COD_FEE) || 10,
  currency: process.env.CURRENCY || 'INR',
  countryCode: process.env.COUNTRY_CODE || '+91',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata'
};

// Enhanced service initialization with dynamic config
const initializeAllServices = async () => {
  console.log(`🔧 Initializing ${appConfig.businessName} payment services...`);
  
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

    // 2. Initialize Email Service (Dynamic provider support)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('🔧 Initializing Email service for:', process.env.EMAIL_USER);
      
      const emailConfig = {
        auth: {
          user: process.env.EMAIL_USER.trim(),
          pass: process.env.EMAIL_PASS.trim(),
        },
        tls: { rejectUnauthorized: false }
      };

      // Dynamic email provider configuration
      if (process.env.EMAIL_SERVICE) {
        emailConfig.service = process.env.EMAIL_SERVICE;
      } else {
        // Custom SMTP configuration
        emailConfig.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        emailConfig.port = parseInt(process.env.SMTP_PORT) || 587;
        emailConfig.secure = process.env.SMTP_SECURE === 'true' || false;
      }

      emailTransporter = nodemailer.createTransport(emailConfig);

      try {
        await emailTransporter.verify();
        console.log('✅ Email service verified and ready');
      } catch (emailError) {
        console.error('❌ Email verification failed:', emailError.message);
        emailTransporter = null;
      }
    } else {
      console.log('⚠️ Email credentials not configured');
    }

    // 3. Initialize Twilio Service for dynamic WhatsApp/SMS
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      console.log('🔧 Initializing Twilio service...');
      
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID.trim(),
        process.env.TWILIO_AUTH_TOKEN.trim()
      );
      
      try {
        const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID.trim()).fetch();
        console.log('✅ Twilio service initialized - Account:', account.friendlyName);
        
        if (process.env.TWILIO_WHATSAPP_FROM) {
          console.log('✅ Production WhatsApp number:', process.env.TWILIO_WHATSAPP_FROM);
        } else if (process.env.TWILIO_WHATSAPP_NUMBER) {
          console.log('⚠️ Sandbox WhatsApp number:', process.env.TWILIO_WHATSAPP_NUMBER);
        }
        
        if (process.env.TWILIO_PHONE_NUMBER) {
          console.log('✅ SMS phone number configured:', process.env.TWILIO_PHONE_NUMBER);
        }
        
      } catch (twilioError) {
        console.error('❌ Twilio verification failed:', twilioError.message);
        twilioClient = null;
      }
    } else {
      console.log('⚠️ Twilio credentials not configured');
    }

    servicesInitialized = true;
    console.log('🎉 Service initialization completed');
    return true;
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    servicesInitialized = false;
    return false;
  }
};

// Dynamic phone number formatting based on country
const formatPhoneNumber = (phoneNumber, countryCode = appConfig.countryCode) => {
  if (!phoneNumber) return null;
  
  let cleanPhone = phoneNumber.toString().replace(/\D/g, '');
  
  // Handle different country codes dynamically
  const codeDigits = countryCode.replace('+', '');
  const expectedLength = codeDigits.length + 10; // Assuming 10 digit local numbers
  
  if (cleanPhone.length === 10) {
    return countryCode + cleanPhone;
  } else if (cleanPhone.length === expectedLength && cleanPhone.startsWith(codeDigits)) {
    return '+' + cleanPhone;
  } else if (!cleanPhone.startsWith(codeDigits) && cleanPhone.length === 10) {
    return countryCode + cleanPhone;
  }
  
  return phoneNumber; // Return original if can't format
};

// Dynamic message template generator - FIXED to use actual customer data
const generateMessageTemplate = (orderDetails, messageType = 'whatsapp') => {
  const templates = {
    whatsapp: `🍽️ *${appConfig.businessName} Order Confirmed!*

Hi ${orderDetails.customerName}! 👋

Your delicious order is being prepared with love!

📋 *Order Details:*
🆔 *Order ID:* ${orderDetails.orderId}
🍕 *Item:* ${orderDetails.item.name}
🏪 *Restaurant:* ${orderDetails.item.restaurant || appConfig.businessName}
💰 *Total Amount:* ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount}
💳 *Payment Method:* ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
🕐 *Estimated Delivery:* ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

📍 *Delivery Address:*
${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `💵 *Cash on Delivery Note:*
Please keep exact change ready. Our delivery partner will collect ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount} when your order arrives.

` : ''}🎉 Thank you for choosing ${appConfig.businessName}!
We're preparing your meal with love ❤️

_This is an automated message from ${appConfig.businessName}_`,

    sms: `${appConfig.businessName} Order Confirmed!

Hi ${orderDetails.customerName}!

Order ID: ${orderDetails.orderId}
Item: ${orderDetails.item.name}
Total: ${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount}
Payment: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
Delivery: ${orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault}

Address: ${orderDetails.deliveryAddress}

${orderDetails.paymentMethod === 'cod' ? `COD: Please keep exact change ready (${appConfig.currency === 'INR' ? '₹' : appConfig.currency}${orderDetails.totalAmount})` : ''}

Thank you for choosing ${appConfig.businessName}!`
  };

  return templates[messageType] || templates.sms;
};

// FIXED: Enhanced WhatsApp/SMS notification with proper customer data handling
const sendMessageNotification = async (orderDetails, preferWhatsApp = true) => {
  console.log('📱 Attempting to send message notification to:', orderDetails.customerPhone);
  
  if (!twilioClient) {
    return { 
      success: false, 
      error: 'Messaging service not configured',
      suggestion: 'Configure Twilio credentials in environment variables'
    };
  }

  // FIXED: Check the actual customer phone from orderDetails
  if (!orderDetails.customerPhone) {
    console.error('❌ No customer phone provided:', orderDetails);
    return { 
      success: false, 
      error: 'Customer phone number not provided' 
    };
  }

  try {
    // FIXED: Use the actual customer phone number from the order
    const customerPhone = formatPhoneNumber(orderDetails.customerPhone, appConfig.countryCode);
    
    if (!customerPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    console.log('📱 Formatted phone number:', customerPhone);

    let messageResult = { success: false };
    
    // Try WhatsApp first if preferred and configured
    if (preferWhatsApp && (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER)) {
      const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER;
      const whatsappMessage = generateMessageTemplate(orderDetails, 'whatsapp');
      
      try {
        console.log('📱 Attempting WhatsApp to:', `whatsapp:${customerPhone}`);
        console.log('📱 From number:', `whatsapp:${fromWhatsAppNumber}`);
        
        const message = await twilioClient.messages.create({
          from: `whatsapp:${fromWhatsAppNumber}`,
          to: `whatsapp:${customerPhone}`,
          body: whatsappMessage
        });

        console.log('✅ WhatsApp sent successfully to:', customerPhone);
        messageResult = { 
          success: true, 
          sid: message.sid,
          method: 'whatsapp',
          details: 'WhatsApp notification sent successfully',
          phoneNumber: customerPhone,
          fromNumber: fromWhatsAppNumber
        };
        
      } catch (whatsappError) {
        console.log('⚠️ WhatsApp failed, trying SMS fallback...');
        console.error('WhatsApp error:', whatsappError.message);
        
        // Fallback to SMS if WhatsApp fails
        if (process.env.TWILIO_PHONE_NUMBER) {
          try {
            const smsMessage = generateMessageTemplate(orderDetails, 'sms');
            
            const smsResult = await twilioClient.messages.create({
              from: process.env.TWILIO_PHONE_NUMBER,
              to: customerPhone,
              body: smsMessage
            });

            console.log('✅ SMS fallback sent successfully to:', customerPhone);
            messageResult = { 
              success: true, 
              sid: smsResult.sid,
              method: 'sms_fallback',
              details: 'SMS notification sent (WhatsApp fallback)',
              phoneNumber: customerPhone,
              fromNumber: process.env.TWILIO_PHONE_NUMBER,
              whatsappError: whatsappError.message
            };
            
          } catch (smsError) {
            console.error('❌ SMS fallback also failed:', smsError.message);
            messageResult = {
              success: false,
              error: `Both WhatsApp and SMS failed. WhatsApp: ${whatsappError.message}, SMS: ${smsError.message}`
            };
          }
        } else {
          messageResult = {
            success: false,
            error: `WhatsApp failed and no SMS fallback configured. Error: ${whatsappError.message}`
          };
        }
      }
    } 
    // Direct SMS if WhatsApp not preferred or not configured
    else if (process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsMessage = generateMessageTemplate(orderDetails, 'sms');
        
        console.log('📱 Sending SMS to:', customerPhone);
        
        const message = await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: customerPhone,
          body: smsMessage
        });

        console.log('✅ SMS sent successfully to:', customerPhone);
        messageResult = { 
          success: true, 
          sid: message.sid,
          method: 'sms',
          details: 'SMS notification sent successfully',
          phoneNumber: customerPhone,
          fromNumber: process.env.TWILIO_PHONE_NUMBER
        };
        
      } catch (smsError) {
        console.error('❌ SMS sending failed:', smsError.message);
        messageResult = {
          success: false,
          error: smsError.message,
          code: smsError.code
        };
      }
    } else {
      messageResult = {
        success: false,
        error: 'No messaging service configured (WhatsApp or SMS)'
      };
    }
    
    return messageResult;
    
  } catch (error) {
    console.error('❌ Message notification failed:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

// FIXED: Dynamic email template generator - using actual customer data
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
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🍽️ Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing ${appConfig.businessName}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${orderDetails.customerName}! 👋</h2>
          <p style="color: #666; line-height: 1.6;">Your order has been confirmed and we're preparing it with love!</p>
          
          <!-- Order Details Box -->
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff6b35;">
            <h3 style="color: #ff6b35; margin: 0 0 20px 0; font-size: 20px;">📋 Order Summary</h3>
            
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
          
          <!-- Delivery Address -->
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2; font-size: 16px;">📍 Delivery Address</h4>
            <p style="margin: 0; line-height: 1.5; color: #555;">${orderDetails.deliveryAddress}</p>
          </div>
          
          ${orderDetails.paymentMethod === 'cod' ? `
          <!-- COD Notice -->
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">💵 Cash on Delivery Instructions</h4>
            <p style="margin: 0; line-height: 1.5; color: #856404;">Please keep exact change ready. Our delivery partner will collect ${currencySymbol}${orderDetails.totalAmount} at the time of delivery.</p>
          </div>
          ` : ''}
          
          <!-- Thank You Section -->
          <div style="text-align: center; margin-top: 30px; padding: 25px; background: #f0f8ff; border-radius: 8px;">
            <h3 style="color: #ff6b35; margin: 0 0 10px 0; font-size: 22px;">🎉 Thank You!</h3>
            <p style="margin: 0; color: #666; line-height: 1.5;">Your delicious meal is being prepared right now with love ❤️</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${appConfig.businessName}. All rights reserved.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">For support, contact us at ${appConfig.supportEmail}</p>
        </div>
        
      </div>
    </body>
    </html>
  `;
};

// FIXED: Enhanced email notification with proper customer email handling
const sendEmailNotification = async (orderDetails) => {
  console.log('📧 Attempting to send email notification to:', orderDetails.customerEmail);
  
  if (!emailTransporter) {
    return { 
      success: false, 
      error: 'Email service not configured',
      suggestion: 'Configure email credentials in environment variables'
    };
  }

  // FIXED: Check the actual customer email from orderDetails
  if (!orderDetails.customerEmail) {
    console.error('❌ No customer email provided:', orderDetails);
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
      to: orderDetails.customerEmail, // FIXED: Use actual customer email
      subject: `🍽️ Order Confirmed #${orderDetails.orderId} - ${appConfig.businessName}`,
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

    console.log('📧 Sending email to:', orderDetails.customerEmail);
    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully to:', orderDetails.customerEmail);
    
    return { 
      success: true, 
      messageId: info.messageId,
      details: 'Email notification sent successfully',
      recipientEmail: orderDetails.customerEmail
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      recipientEmail: orderDetails.customerEmail
    };
  }
};

// Dynamic configuration update endpoint
router.post('/update-config', (req, res) => {
  const allowedFields = [
    'businessName', 'supportEmail', 'deliveryTimeDefault', 
    'codFee', 'currency', 'countryCode', 'timezone'
  ];
  
  const updates = {};
  let hasUpdates = false;
  
  for (const [key, value] of Object.entries(req.body)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updates[key] = value;
      appConfig[key] = value;
      hasUpdates = true;
    }
  }
  
  if (!hasUpdates) {
    return res.status(400).json({
      success: false,
      message: 'No valid configuration fields provided',
      allowedFields: allowedFields,
      currentConfig: appConfig
    });
  }
  
  res.json({
    success: true,
    message: 'Configuration updated successfully',
    updatedFields: updates,
    currentConfig: appConfig
  });
});

// Get current configuration
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: appConfig,
    serviceStatus: {
      razorpay: !!razorpay,
      email: !!emailTransporter,
      twilio: !!twilioClient,
      whatsapp: !!(process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER),
      sms: !!process.env.TWILIO_PHONE_NUMBER
    }
  });
});

// Middleware to ensure services are initialized
const ensureServicesReady = async (req, res, next) => {
  if (!servicesInitialized || !razorpay) {
    console.log('🔄 Services not ready, initializing...');
    const success = await initializeAllServices();
    
    if (!success || !razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment services are temporarily unavailable',
        error: 'Critical services failed to initialize'
      });
    }
  }
  next();
};

// Enhanced health check
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
    messaging_options: {
      whatsapp_production: !!process.env.TWILIO_WHATSAPP_FROM,
      whatsapp_sandbox: !!process.env.TWILIO_WHATSAPP_NUMBER,
      sms: !!process.env.TWILIO_PHONE_NUMBER,
      preferred_method: process.env.TWILIO_WHATSAPP_FROM ? 'whatsapp_production' : 
                       process.env.TWILIO_WHATSAPP_NUMBER ? 'whatsapp_sandbox' :
                       process.env.TWILIO_PHONE_NUMBER ? 'sms' : 'none'
    },
    environment_variables: {
      razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      email_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      twilio_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    },
    timestamp: new Date().toISOString()
  };

  res.status(razorpay ? 200 : 503).json(healthData);
});

// Universal message test with dynamic phone numbers
router.post('/test-message', async (req, res) => {
  const { 
    phoneNumber, 
    customerName = 'Test Customer', 
    preferWhatsApp = true,
    customMessage 
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
    deliveryAddress: '123 Test Street, Test City, Test State - 123456',
    totalAmount: 299,
    paymentMethod: 'test',
    estimatedDelivery: appConfig.deliveryTimeDefault
  };

  // Use custom message if provided
  if (customMessage) {
    const originalGenerator = generateMessageTemplate;
    generateMessageTemplate = () => customMessage;
    
    const result = await sendMessageNotification(testOrderDetails, preferWhatsApp);
    
    generateMessageTemplate = originalGenerator; // Restore original
    
    return res.json({
      success: result.success,
      message: result.success ? 'Custom message sent successfully' : 'Message sending failed',
      result: result,
      test_details: {
        phone_number: phoneNumber,
        formatted_phone: formatPhoneNumber(phoneNumber),
        prefer_whatsapp: preferWhatsApp,
        custom_message_used: true
      }
    });
  }

  const messageResult = await sendMessageNotification(testOrderDetails, preferWhatsApp);

  res.json({
    success: messageResult.success,
    message: messageResult.success ? 'Test message sent successfully' : 'Message sending failed',
    result: messageResult,
    config: appConfig,
    test_details: {
      phone_number: phoneNumber,
      formatted_phone: formatPhoneNumber(phoneNumber),
      prefer_whatsapp: preferWhatsApp,
      messaging_method: messageResult.method
    }
  });
});

// Universal notification test
router.post('/test-notifications', async (req, res) => {
  const { 
    customerEmail, 
    customerPhone, 
    customerName = 'Test Customer',
    customOrderData = {}
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

  // Merge custom order data with defaults
  const testOrderDetails = {
    orderId: 'TEST' + Date.now(),
    customerName: customerName,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    item: {
      name: 'Test Margherita Pizza',
      restaurant: 'Test Pizzeria',
      ...customOrderData.item
    },
    deliveryAddress: '123 Test Street, Test City, Test State - 123456',
    totalAmount: 299,
    paymentMethod: 'test',
    estimatedDelivery: appConfig.deliveryTimeDefault,
    ...customOrderData
  };

  const results = {};
  
  // Test email if provided
  if (customerEmail) {
    console.log('🧪 Testing email notification...');
    results.email = await sendEmailNotification(testOrderDetails);
  }
  
  // Test message (WhatsApp/SMS) if provided
  if (customerPhone) {
    console.log('🧪 Testing message notification...');
    results.message = await sendMessageNotification(testOrderDetails, true);
  }

  res.json({
    success: true,
    message: 'Notification test completed',
    results: results,
    config: appConfig,
    service_status: {
      email_configured: !!emailTransporter,
      twilio_configured: !!twilioClient,
      whatsapp_available: !!(process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER),
      sms_available: !!process.env.TWILIO_PHONE_NUMBER,
      messaging_priority: process.env.TWILIO_WHATSAPP_FROM ? 'production_whatsapp' : 
                         process.env.TWILIO_WHATSAPP_NUMBER ? 'sandbox_whatsapp' : 'sms'
    }
  });
});

// Create Razorpay order with dynamic config
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

// FIXED: Verify payment and send dynamic notifications to actual customer
router.post('/verify-payment', ensureServicesReady, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderDetails,
    } = req.body;

    console.log('🔍 Payment verification request received for customer:', orderDetails.customerName, orderDetails.customerEmail, orderDetails.customerPhone);

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    if (!orderDetails || !orderDetails.customerEmail || !orderDetails.customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Order details with customer email and phone are required'
      });
    }

    // Verify Razorpay signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      console.error('❌ Payment signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    console.log('✅ Payment signature verified successfully');

    // FIXED: Ensure proper data structure for saving
    const orderDataForSave = {
      orderId: orderDetails.orderId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: orderDetails.item.name,
        restaurant: orderDetails.item.restaurant || appConfig.businessName,
        price: orderDetails.item.price || orderDetails.totalAmount,
        image: orderDetails.item.image || '',
        description: orderDetails.item.description || ''
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: orderDetails.totalAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      orderStatus: 'confirmed',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault,
    };

    // Save order to database
    const newOrder = new Order(orderDataForSave);
    const savedOrder = await newOrder.save();
    console.log('✅ Order saved to database:', savedOrder.orderId);

    // FIXED: Send notifications using the actual customer data from orderDetails
    console.log('📤 Sending notifications to customer:', orderDetails.customerEmail, orderDetails.customerPhone);
    
    const notificationOrderData = {
      ...orderDetails,
      paymentMethod: 'razorpay',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    };

    const emailResult = await sendEmailNotification(notificationOrderData);
    const messageResult = await sendMessageNotification(notificationOrderData, true);

    // Update order with notification status
    try {
      if (emailResult.success) {
        await savedOrder.markNotificationSent('email', emailResult.messageId);
        console.log('✅ Email notification status updated');
      }

      if (messageResult.success) {
        await savedOrder.markNotificationSent('whatsapp', null, messageResult.sid);
        console.log('✅ Message notification status updated');
      }
    } catch (updateError) {
      console.error('⚠️ Error updating notification status:', updateError.message);
    }

    const notificationSummary = `Order confirmed! ${emailResult.success ? 'Email sent' : 'Email failed'}. ${messageResult.success ? `${messageResult.method} sent` : 'Message failed'}.`;

    res.json({
      success: true,
      message: 'Payment verified and order placed successfully',
      order: savedOrder,
      notifications: {
        email: emailResult.success ? 'sent' : 'failed',
        message: messageResult.success ? 'sent' : 'failed',
        message_method: messageResult.method || 'none',
        summary: notificationSummary,
        details: {
          email: emailResult,
          message: messageResult
        }
      },
      config: appConfig
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment verification',
      error: error.message
    });
  }
});

// FIXED: Create COD order with dynamic notifications to actual customer
router.post('/create-cod-order', async (req, res) => {
  try {
    const { orderDetails } = req.body;

    if (!orderDetails || !orderDetails.customerEmail || !orderDetails.customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Order details with customer email and phone are required'
      });
    }

    console.log('📦 Processing COD order for customer:', orderDetails.customerName, orderDetails.customerEmail, orderDetails.customerPhone);

    // Process amount conversion
    let totalAmount = 0;
    if (orderDetails.totalAmount) {
      if (typeof orderDetails.totalAmount === 'string') {
        totalAmount = parseInt(orderDetails.totalAmount.replace(/[^\d]/g, '')) || 0;
      } else {
        totalAmount = orderDetails.totalAmount;
      }
    }

    // Add dynamic COD fee
    const finalAmount = totalAmount + appConfig.codFee;

    // Process item price
    let itemPrice = 0;
    if (orderDetails.item && orderDetails.item.price) {
      if (typeof orderDetails.item.price === 'string') {
        itemPrice = parseInt(orderDetails.item.price.replace(/[^\d]/g, '')) || 0;
      } else {
        itemPrice = orderDetails.item.price;
      }
    }

    // FIXED: Create COD order with proper data structure
    const orderDataForSave = {
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: orderDetails.item.name,
        restaurant: orderDetails.item.restaurant || appConfig.businessName,
        price: itemPrice,
        image: orderDetails.item.image || '',
        description: orderDetails.item.description || ''
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: finalAmount,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'confirmed',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault,
    };

    const newOrder = new Order(orderDataForSave);
    const savedOrder = await newOrder.save();
    console.log('✅ COD order saved:', savedOrder.orderId);

    // FIXED: Prepare notification data with actual customer information
    const notificationData = {
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: {
        name: orderDetails.item.name,
        restaurant: orderDetails.item.restaurant || appConfig.businessName,
        price: itemPrice
      },
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: finalAmount,
      paymentMethod: 'cod',
      estimatedDelivery: orderDetails.estimatedDelivery || appConfig.deliveryTimeDefault
    };

    // Send notifications to actual customer
    console.log('📤 Sending COD order notifications to:', notificationData.customerEmail, notificationData.customerPhone);
    const emailResult = await sendEmailNotification(notificationData);
    const messageResult = await sendMessageNotification(notificationData, true);

    // Update order with notification status
    try {
      if (emailResult.success) {
        await savedOrder.markNotificationSent('email', emailResult.messageId);
        console.log('✅ Email notification status updated for COD order');
      }

      if (messageResult.success) {
        await savedOrder.markNotificationSent('whatsapp', null, messageResult.sid);
        console.log('✅ Message notification status updated for COD order');
      }
    } catch (updateError) {
      console.error('⚠️ Error updating COD notification status:', updateError.message);
    }

    const notificationSummary = `COD Order confirmed! ${emailResult.success ? 'Email sent' : 'Email failed'}. ${messageResult.success ? `${messageResult.method} sent` : 'Message failed'}.`;

    res.json({
      success: true,
      message: 'COD order placed successfully',
      order: savedOrder,
      notifications: {
        email: emailResult.success ? 'sent' : 'failed',
        message: messageResult.success ? 'sent' : 'failed',
        message_method: messageResult.method || 'none',
        summary: notificationSummary,
        details: {
          email: emailResult,
          message: messageResult
        }
      },
      config: appConfig,
      pricing: {
        originalAmount: totalAmount,
        codFee: appConfig.codFee,
        finalAmount: finalAmount,
        currency: appConfig.currency
      }
    });

  } catch (error) {
    console.error('❌ Error creating COD order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating COD order',
      error: error.message
    });
  }
});

// Bulk message sending for marketing/updates
router.post('/send-bulk-messages', async (req, res) => {
  const { 
    recipients, // Array of {name, phone, email}
    message,
    messageType = 'both', // 'email', 'sms', 'whatsapp', 'both'
    emailSubject = `Update from ${appConfig.businessName}`
  } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Recipients array is required'
    });
  }

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }

  if (!servicesInitialized) {
    await initializeAllServices();
  }

  const results = {
    total: recipients.length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const recipient of recipients) {
    const recipientResult = {
      name: recipient.name,
      phone: recipient.phone,
      email: recipient.email,
      email_status: 'not_attempted',
      message_status: 'not_attempted'
    };

    // Send email if requested and email available
    if ((messageType === 'email' || messageType === 'both') && recipient.email && emailTransporter) {
      try {
        const emailResult = await emailTransporter.sendMail({
          from: {
            name: appConfig.businessName,
            address: process.env.EMAIL_USER
          },
          to: recipient.email,
          subject: emailSubject,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #ff6b35;">${appConfig.businessName}</h2>
              <div style="white-space: pre-wrap; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                This message was sent by ${appConfig.businessName}<br>
                For support: ${appConfig.supportEmail}
              </p>
            </div>
          `
        });
        recipientResult.email_status = 'sent';
        recipientResult.email_id = emailResult.messageId;
      } catch (error) {
        recipientResult.email_status = 'failed';
        recipientResult.email_error = error.message;
      }
    }

    // Send message (WhatsApp/SMS) if requested and phone available
    if ((messageType === 'sms' || messageType === 'whatsapp' || messageType === 'both') && recipient.phone && twilioClient) {
      try {
        const mockOrderDetails = {
          customerName: recipient.name,
          customerPhone: recipient.phone
        };
        
        // Override message generation for bulk messages
        const originalGenerator = generateMessageTemplate;
        generateMessageTemplate = () => `Hi ${recipient.name}!\n\n${message}\n\n- ${appConfig.businessName}`;
        
        const messageResult = await sendMessageNotification(mockOrderDetails, messageType === 'whatsapp');
        
        generateMessageTemplate = originalGenerator; // Restore
        
        if (messageResult.success) {
          recipientResult.message_status = 'sent';
          recipientResult.message_method = messageResult.method;
          recipientResult.message_sid = messageResult.sid;
        } else {
          recipientResult.message_status = 'failed';
          recipientResult.message_error = messageResult.error;
        }
      } catch (error) {
        recipientResult.message_status = 'failed';
        recipientResult.message_error = error.message;
      }
    }

    // Count success/failure
    if (recipientResult.email_status === 'sent' || recipientResult.message_status === 'sent') {
      results.successful++;
    } else {
      results.failed++;
    }

    results.details.push(recipientResult);
  }

  res.json({
    success: true,
    message: `Bulk messaging completed. ${results.successful} successful, ${results.failed} failed.`,
    results: results,
    config: appConfig
  });
});

// Initialize services on module load
console.log('🚀 Dynamic payment routes loaded - initializing services...');
setTimeout(async () => {
  console.log('🔄 Starting service initialization...');
  await initializeAllServices();
}, 2000);

export default router;