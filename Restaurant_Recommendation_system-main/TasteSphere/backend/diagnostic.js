// diagnostic.js - Standalone script to test notification services
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Load environment
dotenv.config();

console.log('🔍 TasteSphere Notification Service Diagnostic');
console.log('='.repeat(50));

// Test email service
const testEmail = async () => {
  console.log('\n📧 Testing Email Service...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email credentials missing');
    console.log('EMAIL_USER:', !!process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', !!process.env.EMAIL_PASS);
    return false;
  }

  try {
    console.log('📧 Email User:', process.env.EMAIL_USER);
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('🔍 Verifying email connection...');
    await transporter.verify();
    console.log('✅ Email service: WORKING');
    
    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `TasteSphere Test <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: '🧪 TasteSphere Email Test',
      html: `
        <h2>✅ Email Service Test Successful!</h2>
        <p>This email confirms that your TasteSphere email service is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `
    });
    
    console.log('✅ Test email sent successfully');
    console.log('📧 Message ID:', info.messageId);
    return true;
    
  } catch (error) {
    console.log('❌ Email service error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('💡 Solution: Check if you need an App Password for Gmail');
      console.log('   1. Go to Google Account settings');
      console.log('   2. Security > App passwords');
      console.log('   3. Generate app password for "Mail"');
      console.log('   4. Use that password in EMAIL_PASS');
    }
    
    return false;
  }
};

// Test WhatsApp service
const testWhatsApp = async () => {
  console.log('\n📱 Testing WhatsApp Service...');
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    console.log('❌ Twilio credentials missing');
    console.log('TWILIO_ACCOUNT_SID:', !!process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN:', !!process.env.TWILIO_AUTH_TOKEN);
    console.log('TWILIO_WHATSAPP_NUMBER:', !!process.env.TWILIO_WHATSAPP_NUMBER);
    return false;
  }

  try {
    console.log('📱 Account SID:', process.env.TWILIO_ACCOUNT_SID.substring(0, 8) + '...');
    console.log('📱 WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log('🔍 Testing Twilio connection...');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio connection: WORKING');
    console.log('📱 Account Name:', account.friendlyName);
    console.log('📱 Account Status:', account.status);
    
    // Note: We can't send a test WhatsApp without a valid recipient
    console.log('⚠️ WhatsApp test requires a valid recipient number');
    console.log('💡 Use the /api/payment/test-notifications endpoint to test with real numbers');
    
    return true;
    
  } catch (error) {
    console.log('❌ WhatsApp service error:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('💡 Solution: Check your Twilio credentials');
      console.log('   1. Go to Twilio Console');
      console.log('   2. Verify Account SID and Auth Token');
      console.log('   3. Check WhatsApp Sandbox number');
    }
    
    return false;
  }
};

// Test Razorpay
const testRazorpay = async () => {
  console.log('\n💳 Testing Razorpay Service...');
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log('❌ Razorpay credentials missing');
    return false;
  }

  try {
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    console.log('💳 Key ID:', process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...');
    
    // Create a test order (but don't process it)
    const options = {
      amount: 100, // ₹1 in paise
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay service: WORKING');
    console.log('💳 Test Order ID:', order.id);
    return true;
    
  } catch (error) {
    console.log('❌ Razorpay service error:', error.message);
    return false;
  }
};

// Run all tests
const runDiagnostic = async () => {
  console.log('Starting comprehensive diagnostic...\n');
  
  const results = {
    email: await testEmail(),
    whatsapp: await testWhatsApp(),
    razorpay: await testRazorpay()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSTIC RESULTS');
  console.log('='.repeat(50));
  console.log('📧 Email Service:', results.email ? '✅ WORKING' : '❌ FAILED');
  console.log('📱 WhatsApp Service:', results.whatsapp ? '✅ WORKING' : '❌ FAILED');
  console.log('💳 Razorpay Service:', results.razorpay ? '✅ WORKING' : '❌ FAILED');
  
  const workingServices = Object.values(results).filter(Boolean).length;
  const totalServices = Object.keys(results).length;
  
  console.log('\n📈 Overall Status:', `${workingServices}/${totalServices} services working`);
  
  if (workingServices === totalServices) {
    console.log('🎉 All services are working correctly!');
  } else {
    console.log('⚠️ Some services need attention. Check the errors above.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Fix any failing services using the solutions provided');
  console.log('2. Restart your server after fixing credentials');
  console.log('3. Test notifications using /api/payment/test-notifications');
  console.log('4. Place a test order to verify everything works end-to-end');
};

// Run the diagnostic
runDiagnostic().catch(console.error);