// controllers/paymentController.js
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import Order from '../models/Order.js';

class PaymentController {
  constructor() {
    this.razorpay = null;
    this.twilioClient = null;
    this.emailTransporter = null;
    this.initializeServices();
  }

  // Initialize all payment services
  initializeServices() {
    try {
      console.log('🚀 Initializing Payment Services...');

      // Initialize Razorpay (REQUIRED)
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID.trim(),
          key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
        });
        console.log('✅ Razorpay initialized successfully');
      } else {
        throw new Error('Razorpay credentials missing');
      }

      // Initialize Twilio (OPTIONAL)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID.trim(),
          process.env.TWILIO_AUTH_TOKEN.trim()
        );
        console.log('✅ Twilio initialized successfully');
      }

      // Initialize Email (OPTIONAL)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.emailTransporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER.trim(),
            pass: process.env.EMAIL_PASS.trim(),
          },
        });
        console.log('✅ Email transporter initialized successfully');
      }

    } catch (error) {
      console.error('❌ Error initializing payment services:', error.message);
      throw error;
    }
  }

  // Health check
  getHealthStatus = (req, res) => {
    const status = {
      success: true,
      message: 'Payment service is running',
      services: {
        razorpay: this.razorpay ? 'initialized' : 'not initialized',
        twilio: this.twilioClient ? 'initialized' : 'not initialized',
        email: this.emailTransporter ? 'initialized' : 'not initialized'
      },
      core_functionality: this.razorpay ? 'available' : 'unavailable',
      timestamp: new Date().toISOString()
    };

    if (!this.razorpay) {
      return res.status(503).json({
        ...status,
        success: false,
        message: 'Payment service is not properly configured'
      });
    }

    res.json(status);
  };

  // Create Razorpay order
  createOrder = async (req, res) => {
    try {
      const { amount, currency = 'INR', receipt } = req.body;

      // Validation
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount provided',
          received: { amount, currency, receipt }
        });
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid positive number'
        });
      }

      const options = {
        amount: Math.round(numericAmount * 100),
        currency: currency.toUpperCase(),
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1,
      };

      const order = await this.razorpay.orders.create(options);
      console.log('✅ Razorpay order created successfully:', order.id);

      res.json({
        success: true,
        order,
        key_id: process.env.RAZORPAY_KEY_ID,
      });

    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating payment order',
        error: error.message
      });
    }
  };

  // Verify payment
  verifyPayment = async (req, res) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        orderDetails,
      } = req.body;

      // Validation
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required payment parameters'
        });
      }

      if (!orderDetails) {
        return res.status(400).json({
          success: false,
          message: 'Order details are required'
        });
      }

      // Verify signature
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

      // Save order
      const savedOrder = await this.saveOrder(orderDetails, razorpay_payment_id, razorpay_order_id, 'razorpay');
      
      // Send notifications
      const notifications = await this.sendNotifications(orderDetails);

      res.json({
        success: true,
        message: 'Payment verified and order placed successfully',
        order: savedOrder,
        notifications
      });

    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing payment verification',
        error: error.message
      });
    }
  };

  // Create COD order
  createCODOrder = async (req, res) => {
    try {
      const { orderDetails } = req.body;

      if (!orderDetails) {
        return res.status(400).json({
          success: false,
          message: 'Order details are required'
        });
      }

      // Save COD order
      const savedOrder = await this.saveOrder({
        ...orderDetails,
        totalAmount: orderDetails.totalAmount + 10 // COD fee
      }, null, null, 'cod');

      // Send notifications
      const notifications = await this.sendNotifications({
        ...orderDetails,
        totalAmount: orderDetails.totalAmount + 10,
        paymentMethod: 'cod'
      });

      res.json({
        success: true,
        message: 'COD order placed successfully',
        order: savedOrder,
        notifications
      });

    } catch (error) {
      console.error('❌ Error creating COD order:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating COD order',
        error: error.message
      });
    }
  };

  // Helper method to save order
  async saveOrder(orderDetails, paymentId = null, orderId = null, paymentMethod) {
    const newOrder = new Order({
      orderId: orderDetails.orderId,
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      customerPhone: orderDetails.customerPhone,
      item: orderDetails.item,
      deliveryAddress: orderDetails.deliveryAddress,
      totalAmount: orderDetails.totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'razorpay' ? 'completed' : 'pending',
      orderStatus: 'confirmed',
      estimatedDelivery: orderDetails.estimatedDelivery || '25-30 minutes',
      createdAt: new Date(),
    });

    const savedOrder = await newOrder.save();
    console.log(`✅ ${paymentMethod.toUpperCase()} order saved to database:`, savedOrder.orderId);
    return savedOrder;
  }

  // Helper method to send notifications
  async sendNotifications(orderDetails) {
    const emailResult = await this.sendEmailNotification(orderDetails);
    const whatsappResult = await this.sendWhatsAppNotification(orderDetails);

    return {
      email: emailResult.success ? 'sent' : 'failed',
      whatsapp: whatsappResult.success ? 'sent' : 'failed',
      message: `Order confirmed! ${emailResult.success ? 'Email sent.' : 'Email failed.'} ${whatsappResult.success ? 'WhatsApp sent.' : 'WhatsApp failed.'}`
    };
  }

  // Email notification helper
  async sendEmailNotification(orderDetails) {
    if (!this.emailTransporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `TasteSphere <${process.env.EMAIL_USER}>`,
        to: orderDetails.customerEmail,
        subject: `Order Confirmation - ${orderDetails.orderId}`,
        html: this.generateEmailTemplate(orderDetails)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // WhatsApp notification helper
  async sendWhatsAppNotification(orderDetails) {
    if (!this.twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const message = this.generateWhatsAppMessage(orderDetails);
      
      const whatsappMessage = await this.twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:+91${orderDetails.customerPhone}`,
        body: message
      });

      return { success: true, sid: whatsappMessage.sid };
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Email template generator
  generateEmailTemplate(orderDetails) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>🍽️ TasteSphere - Order Confirmed!</h1>
        <h2>Thank you, ${orderDetails.customerName}!</h2>
        <div>
          <h3>📋 Order Details</h3>
          <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
          <p><strong>Item:</strong> ${orderDetails.item.name}</p>
          <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount}</p>
          <p><strong>Estimated Delivery:</strong> ${orderDetails.estimatedDelivery}</p>
        </div>
      </div>
    `;
  }

  // WhatsApp message generator
  generateWhatsAppMessage(orderDetails) {
    return `🍽️ *TasteSphere Order Confirmed!*

Hi ${orderDetails.customerName}! 👋

Your order has been confirmed:
📋 *Order ID:* ${orderDetails.orderId}
🍕 *Item:* ${orderDetails.item.name}
💰 *Total:* ₹${orderDetails.totalAmount}
🕐 *Estimated Delivery:* ${orderDetails.estimatedDelivery}

Thank you for choosing TasteSphere! 🙏`;
  }

  // Middleware to check services
  checkServices = (req, res, next) => {
    if (!this.razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is temporarily unavailable',
        error: 'Payment service unavailable'
      });
    }
    next();
  };
}

export default PaymentController;