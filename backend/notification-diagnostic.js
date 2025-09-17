// notification-diagnostic.js - Complete diagnostic tool for TasteSphere notifications
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

dotenv.config();

console.log('=== TASTESPHERE NOTIFICATION DIAGNOSTIC TOOL ===\n');

// 1. Environment Variables Check
console.log('1. CHECKING ENVIRONMENT VARIABLES:');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ? '✅ Set' : '❌ Missing');

if (process.env.EMAIL_USER) {
  console.log('Email format check:', process.env.EMAIL_USER.includes('@') ? '✅ Valid' : '❌ Invalid');
}

if (process.env.EMAIL_PASS) {
  console.log('Email password length:', process.env.EMAIL_PASS.length, 'characters');
  console.log('App password format:', process.env.EMAIL_PASS.length === 16 ? '✅ Correct length for app password' : '⚠️ Might not be app password');
}

console.log('\n2. TESTING EMAIL SERVICE:');

// 2. Email Service Test
async function testEmailService() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email credentials missing - skipping email test');
    return { success: false, error: 'Missing credentials' };
  }

  try {
    console.log('Creating email transporter...');
    
    const emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim(),
      },
      debug: true,
      logger: false // Set to true for detailed logs
    });

    console.log('Verifying email transporter...');
    
    // Test connection
    const verified = await emailTransporter.verify();
    console.log('✅ Email transporter verified successfully');

    // Send test email
    console.log('Sending test email...');
    
    const testEmail = {
      from: `TasteSphere Test <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'TasteSphere Notification Test - ' + new Date().toISOString(),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #ff6b35;">🍽️ TasteSphere Test Email</h1>
          <p>This is a test email from your TasteSphere notification system.</p>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Time: ${new Date().toLocaleString()}</li>
            <li>From: ${process.env.EMAIL_USER}</li>
            <li>Service: Gmail via Nodemailer</li>
          </ul>
          <p style="color: green;">✅ If you receive this email, your notification system is working!</p>
        </div>
      `
    };

    const info = await emailTransporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info) || 'N/A');
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 EMAIL FIX REQUIRED:');
      console.log('1. Your Gmail app password might be incorrect or expired');
      console.log('2. Generate a new app password:');
      console.log('   a) Go to https://myaccount.google.com/security');
      console.log('   b) Enable 2-Factor Authentication if not enabled');
      console.log('   c) Go to App passwords section');
      console.log('   d) Generate new password for "Mail"');
      console.log('   e) Use the 16-character password in your .env file');
      console.log('3. Make sure no spaces in EMAIL_PASS value');
    } else if (error.message.includes('timeout')) {
      console.log('\n🔧 NETWORK ISSUE:');
      console.log('1. Check your internet connection');
      console.log('2. Disable firewall/antivirus temporarily');
      console.log('3. Try from a different network');
    }
    
    return { success: false, error: error.message };
  }
}

// 3. WhatsApp/Twilio Service Test
async function testWhatsAppService() {
  console.log('\n3. TESTING WHATSAPP SERVICE:');
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    console.log('❌ Twilio credentials missing - skipping WhatsApp test');
    return { success: false, error: 'Missing credentials' };
  }

  try {
    console.log('Creating Twilio client...');
    
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID.trim(),
      process.env.TWILIO_AUTH_TOKEN.trim()
    );

    console.log('Testing Twilio connection...');
    
    // Test account info
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio account connected:', account.friendlyName);

    console.log('Sending test WhatsApp message...');
    
    // Send test message (to the WhatsApp sandbox number for testing)
    const message = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+14155238886`, // Twilio WhatsApp sandbox number
      body: `🍽️ *TasteSphere WhatsApp Test*

Hi! This is a test message from your TasteSphere notification system.

Test Details:
📅 Time: ${new Date().toLocaleString()}
📞 From: ${process.env.TWILIO_WHATSAPP_NUMBER}
🔧 Service: Twilio WhatsApp

✅ If you receive this message, your WhatsApp notifications are working!`
    });

    console.log('✅ Test WhatsApp message sent successfully!');
    console.log('Message SID:', message.sid);
    
    return { success: true, sid: message.sid };

  } catch (error) {
    console.log('❌ WhatsApp test failed:', error.message);
    
    if (error.code === 20003) {
      console.log('\n🔧 WHATSAPP FIX REQUIRED:');
      console.log('1. Your Twilio credentials might be incorrect');
      console.log('2. Check your Twilio console: https://console.twilio.com/');
      console.log('3. Verify Account SID and Auth Token');
      console.log('4. Make sure WhatsApp sandbox is set up');
      console.log('5. For production, verify your WhatsApp Business Account');
    } else if (error.code === 63016) {
      console.log('\n🔧 WHATSAPP SANDBOX SETUP:');
      console.log('1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message');
      console.log('2. Follow the sandbox setup instructions');
      console.log('3. Send "join <sandbox-word>" to the sandbox number first');
    }
    
    return { success: false, error: error.message, code: error.code };
  }
}

// 4. Integration Test
async function testFullNotificationFlow() {
  console.log('\n4. TESTING FULL NOTIFICATION FLOW:');
  
  const testOrderDetails = {
    orderId: 'TEST' + Date.now(),
    customerName: 'Test Customer',
    customerEmail: process.env.EMAIL_USER, // Use same email for testing
    customerPhone: '1234567890',
    item: {
      name: 'Test Pizza Margherita',
      restaurant: 'Test Restaurant',
      price: 299
    },
    deliveryAddress: 'Test Address, Test City, 123456',
    totalAmount: 324, // 299 + 25 delivery
    paymentMethod: 'test',
    estimatedDelivery: '25-30 minutes'
  };

  console.log('Testing with order details:');
  console.log('Order ID:', testOrderDetails.orderId);
  console.log('Customer Email:', testOrderDetails.customerEmail);
  console.log('Customer Phone:', testOrderDetails.customerPhone);

  // Test both notifications
  const emailResult = await testEmailService();
  const whatsappResult = await testWhatsAppService();

  return {
    email: emailResult,
    whatsapp: whatsappResult,
    overall: emailResult.success || whatsappResult.success
  };
}

// 5. Run all tests
async function runDiagnostic() {
  try {
    console.log('Starting comprehensive diagnostic...\n');
    
    const results = await testFullNotificationFlow();
    
    console.log('\n=== DIAGNOSTIC RESULTS ===');
    console.log('Email Service:', results.email.success ? '✅ Working' : '❌ Failed');
    console.log('WhatsApp Service:', results.whatsapp.success ? '✅ Working' : '❌ Failed');
    console.log('Overall Status:', results.overall ? '✅ At least one service working' : '❌ All services failed');
    
    if (!results.overall) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      if (!results.email.success) {
        console.log('- Email notifications not working:', results.email.error);
      }
      if (!results.whatsapp.success) {
        console.log('- WhatsApp notifications not working:', results.whatsapp.error);
      }
      
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Fix the credential issues mentioned above');
      console.log('2. Run this diagnostic again');
      console.log('3. Test your actual payment flow');
    } else {
      console.log('\n🎉 SUCCESS! Your notification system has working components.');
      console.log('You can now test the payment flow with confidence.');
    }
    
  } catch (error) {
    console.log('❌ Diagnostic failed:', error.message);
  }
}

// Run the diagnostic
runDiagnostic();