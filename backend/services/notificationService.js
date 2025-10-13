// services/notificationService.js - Complete Notification System
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import User from '../models/User.js';
import Order from '../models/Order.js';

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  // Initialize email and Twilio services
  initializeServices() {
    try {
      // Initialize Email (Gmail)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER.trim(),
            pass: process.env.EMAIL_PASS.trim()
          },
          logger: process.env.NODE_ENV === 'development',
          debug: process.env.NODE_ENV === 'development'
        });
        console.log('✅ Email service initialized');
      } else {
        console.warn('⚠️  Email service not configured');
      }

      // Initialize Twilio (WhatsApp)
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID.trim(),
          process.env.TWILIO_AUTH_TOKEN.trim()
        );
        console.log('✅ Twilio/WhatsApp service initialized');
      } else {
        console.warn('⚠️  Twilio/WhatsApp service not configured');
      }

    } catch (error) {
      console.error('❌ Error initializing notification services:', error.message);
    }
  }

  // ✅ MAIN METHOD: Send all notifications after payment
  async sendOrderNotifications(orderDetails, userId = null) {
    console.log('📢 Starting notification process...');
    
    const results = {
      email: { sent: false, error: null },
      whatsapp: { sent: false, error: null }
    };

    try {
      // 1. Get user email from database if userId provided
      let customerEmail = orderDetails.customerEmail;
      
      if (userId && !customerEmail) {
        const user = await User.findById(userId).select('emailId');
        if (user) {
          customerEmail = user.emailId;
          console.log('✅ Fetched email from user account:', customerEmail);
        }
      }

      // 2. Validate we have required data
      if (!customerEmail) {
        console.error('❌ No email address available');
        results.email.error = 'Email address not found';
      }

      if (!orderDetails.customerPhone) {
        console.error('❌ No phone number available');
        results.whatsapp.error = 'Phone number not found';
      }

      // 3. Send Email Notification
      if (customerEmail && this.emailTransporter) {
        const emailResult = await this.sendEmailNotification({
          ...orderDetails,
          customerEmail
        });
        results.email = emailResult;
      }

      // 4. Send WhatsApp Notification
      if (orderDetails.customerPhone && this.twilioClient) {
        const whatsappResult = await this.sendWhatsAppNotification(orderDetails);
        results.whatsapp = whatsappResult;
      }

      // 5. Update order with notification status
      if (orderDetails.orderId) {
        await Order.findOneAndUpdate(
          { orderId: orderDetails.orderId },
          {
            'notifications.email.sent': results.email.sent,
            'notifications.email.sentAt': results.email.sent ? new Date() : null,
            'notifications.whatsapp.sent': results.whatsapp.sent,
            'notifications.whatsapp.sentAt': results.whatsapp.sent ? new Date() : null
          }
        );
      }

      console.log('📢 Notification process completed:', {
        email: results.email.sent ? '✅ Sent' : '❌ Failed',
        whatsapp: results.whatsapp.sent ? '✅ Sent' : '❌ Failed'
      });

      return results;

    } catch (error) {
      console.error('❌ Error in notification process:', error);
      return results;
    }
  }

  // ✅ Send Email with professional template
  async sendEmailNotification(orderDetails) {
    if (!this.emailTransporter) {
      return { sent: false, error: 'Email service not configured' };
    }

    try {
      console.log('📧 Sending email to:', orderDetails.customerEmail);

      const emailHtml = this.generateEmailHTML(orderDetails);
      
      const mailOptions = {
        from: `"TasteSphere 🍽️" <${process.env.EMAIL_USER}>`,
        to: orderDetails.customerEmail,
        subject: `Order Confirmed #${orderDetails.orderId} - TasteSphere`,
        html: emailHtml,
        text: this.generateEmailText(orderDetails)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', info.messageId);
      
      return {
        sent: true,
        messageId: info.messageId,
        error: null
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      
      if (error.code === 'EAUTH') {
        console.error('💡 Fix: Use Gmail App Password, not regular password');
        console.error('   Generate at: https://myaccount.google.com/apppasswords');
      }
      
      return {
        sent: false,
        error: error.message
      };
    }
  }

  // ✅ Send WhatsApp message (works with ANY number on paid Twilio plan)
  async sendWhatsAppNotification(orderDetails) {
    if (!this.twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
      return { sent: false, error: 'WhatsApp service not configured' };
    }

    try {
      // Clean phone number (remove spaces, dashes, etc.)
      let phoneNumber = orderDetails.customerPhone.replace(/\D/g, '');
      
      // Add country code if missing (assuming India +91)
      if (!phoneNumber.startsWith('91')) {
        phoneNumber = '91' + phoneNumber;
      }
      
      // Ensure it starts with +
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      console.log('📱 Sending WhatsApp to:', phoneNumber);
      console.log('📱 From number:', process.env.TWILIO_WHATSAPP_NUMBER);

      const message = this.generateWhatsAppMessage(orderDetails);

      const whatsappMessage = await this.twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
        body: message
      });

      console.log('✅ WhatsApp sent successfully:', whatsappMessage.sid);

      return {
        sent: true,
        sid: whatsappMessage.sid,
        error: null
      };

    } catch (error) {
      console.error('❌ WhatsApp sending failed:', error.message);
      
      // Provide helpful error messages
      if (error.code === 21408) {
        console.error('💡 Error 21408: Phone number not verified in Twilio');
        console.error('   Fix Options:');
        console.error('   1. Upgrade to Twilio PAID plan ($20/month) to send to ANY number');
        console.error('   2. OR verify numbers at: https://console.twilio.com/verify/services');
        console.error('   Current plan: FREE TRIAL (can only send to verified numbers)');
      } else if (error.code === 21211) {
        console.error('💡 Error 21211: Invalid phone number format');
      } else if (error.code === 63007) {
        console.error('💡 Error 63007: Number not opted-in to WhatsApp');
        console.error('   User must first send "JOIN" message to your Twilio WhatsApp number');
      }
      
      return {
        sent: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // ✅ Generate professional HTML email
  generateEmailHTML(orderDetails) {
    const { orderId, customerName, item, totalAmount, deliveryAddress, 
            estimatedDelivery, paymentMethod } = orderDetails;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #ff6b35 0%, #f97316 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .header p { color: white; margin: 10px 0 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
    .order-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .order-info h2 { margin: 0 0 15px 0; color: #111827; font-size: 18px; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-weight: 500; }
    .info-value { color: #111827; font-weight: 600; text-align: right; }
    .item-box { border: 2px solid #fef3c7; background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .item-name { font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 5px; }
    .restaurant { color: #6b7280; margin-bottom: 10px; }
    .price { color: #f97316; font-size: 24px; font-weight: bold; }
    .total-section { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .total-label { font-size: 20px; font-weight: bold; color: #111827; }
    .total-amount { font-size: 24px; font-weight: bold; color: #f97316; }
    .address-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f97316; }
    .button { display: inline-block; background: #f97316; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
    .divider { height: 2px; background: linear-gradient(90deg, #ff6b35, #f97316); margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🍽️ TasteSphere</h1>
      <p>Your Order is Confirmed!</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="success-badge">✓ Order Confirmed</div>
      
      <p style="font-size: 16px; color: #111827; line-height: 1.6;">
        Hi <strong>${customerName}</strong>,<br><br>
        Thank you for your order! We're excited to serve you delicious food. 
        Your order has been confirmed and will be delivered soon.
      </p>

      <!-- Order Details -->
      <div class="order-info">
        <h2>📋 Order Details</h2>
        <div class="info-row">
          <span class="info-label">Order ID</span>
          <span class="info-value">${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method</span>
          <span class="info-value">${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Order Time</span>
          <span class="info-value">${new Date().toLocaleString('en-IN')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estimated Delivery</span>
          <span class="info-value">${estimatedDelivery}</span>
        </div>
      </div>

      <!-- Item Details -->
      <div class="item-box">
        <div class="item-name">${item.name}</div>
        <div class="restaurant">from ${item.restaurant}</div>
        <div class="price">₹${typeof item.price === 'string' ? item.price.replace(/[^\d]/g, '') : item.price}</div>
      </div>

      <!-- Delivery Address -->
      <h3 style="color: #111827; margin-bottom: 10px;">📍 Delivery Address</h3>
      <div class="address-box">
        ${deliveryAddress}
      </div>

      <div class="divider"></div>

      <!-- Total Amount -->
      <div class="total-section">
        <div class="total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-amount">₹${totalAmount}</span>
        </div>
      </div>

      <!-- Track Order Button -->
      <div style="text-align: center;">
        <a href="http://localhost:5173/order-tracking/${orderId}" class="button">
          Track Your Order →
        </a>
      </div>

      <!-- Support Section -->
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin: 0 0 10px 0; color: #111827;">Need Help?</h3>
        <p style="margin: 5px 0; color: #6b7280;">
          📧 Email: support@tastesphere.com<br>
          📞 Phone: +91 1800-123-4567<br>
          🕐 Available: 24/7
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 10px 0;">Thank you for choosing TasteSphere! 🙏</p>
      <p style="margin: 5px 0; font-size: 12px;">
        This is an automated email. Please do not reply to this message.
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 12px;">
        © 2024 TasteSphere. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // ✅ Generate plain text email (fallback)
  generateEmailText(orderDetails) {
    return `
🍽️ TasteSphere - Order Confirmed!

Hi ${orderDetails.customerName},

Your order has been confirmed!

Order Details:
--------------
Order ID: ${orderDetails.orderId}
Item: ${orderDetails.item.name}
Restaurant: ${orderDetails.item.restaurant}
Total Amount: ₹${orderDetails.totalAmount}
Payment: ${orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
Estimated Delivery: ${orderDetails.estimatedDelivery}

Delivery Address:
${orderDetails.deliveryAddress}

Track your order: http://localhost:5173/order-tracking/${orderDetails.orderId}

Need help? Contact us at support@tastesphere.com

Thank you for choosing TasteSphere! 🙏
    `.trim();
  }

  // ✅ Generate WhatsApp message
  generateWhatsAppMessage(orderDetails) {
    const { orderId, customerName, item, totalAmount, estimatedDelivery, paymentMethod } = orderDetails;
    
    return `
🍽️ *TasteSphere - Order Confirmed!*

Hi ${customerName}! 👋

Your delicious food is on its way! 🚀

*Order Details:*
━━━━━━━━━━━━━━━━
📋 Order ID: *${orderId}*
🍕 Item: *${item.name}*
🏪 Restaurant: ${item.restaurant}
💰 Total: *₹${totalAmount}*
💳 Payment: ${paymentMethod === 'cod' ? '💵 Cash on Delivery' : '✅ Paid Online'}
🕐 Delivery: *${estimatedDelivery}*

*Delivery Address:*
📍 ${orderDetails.deliveryAddress}

━━━━━━━━━━━━━━━━
🔗 Track Order: http://localhost:5173/order-tracking/${orderId}

Need help? Reply to this message! 💬

Thank you for choosing TasteSphere! 🙏
━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// Export singleton instance
export default new NotificationService();