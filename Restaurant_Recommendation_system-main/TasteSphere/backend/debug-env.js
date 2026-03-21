// debug-env.js - Run this to check your environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===\n');

// Check if dotenv is being loaded
console.log('1. Checking dotenv configuration:');
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  if (result.error) {
    console.log('❌ dotenv error:', result.error);
  } else {
    console.log('✅ dotenv loaded successfully');
    console.log('   .env file path:', result.parsed ? 'found' : 'not found');
  }
} catch (error) {
  console.log('❌ dotenv not installed or error:', error.message);
}

console.log('\n2. Checking Email Configuration:');
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('EMAIL_USER value:', process.env.EMAIL_USER);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

console.log('\n3. Checking Twilio Configuration:');
console.log('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_ACCOUNT_SID value:', process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('TWILIO_AUTH_TOKEN length:', process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.length : 0);
console.log('TWILIO_WHATSAPP_NUMBER exists:', !!process.env.TWILIO_WHATSAPP_NUMBER);
console.log('TWILIO_WHATSAPP_NUMBER value:', process.env.TWILIO_WHATSAPP_NUMBER);

console.log('\n4. Checking Razorpay Configuration:');
console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_ID value:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
console.log('RAZORPAY_KEY_SECRET length:', process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0);

console.log('\n5. Current Working Directory:', process.cwd());
console.log('6. NODE_ENV:', process.env.NODE_ENV || 'not set');

// Test nodemailer configuration
console.log('\n7. Testing NodeMailer Configuration:');
try {
  const nodemailer = require('nodemailer');
  
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim(),
      },
    });
    
    console.log('✅ NodeMailer transporter created');
    
    // Test connection
    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ Email connection test failed:', error.message);
        if (error.message.includes('Invalid login')) {
          console.log('💡 Hint: Make sure you\'re using Gmail App Password, not regular password');
        }
      } else {
        console.log('✅ Email connection test successful');
      }
    });
  } else {
    console.log('❌ Email credentials missing');
  }
} catch (error) {
  console.log('❌ NodeMailer test error:', error.message);
}

// Test Twilio configuration
console.log('\n8. Testing Twilio Configuration:');
try {
  const twilio = require('twilio');
  
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID.trim(),
      process.env.TWILIO_AUTH_TOKEN.trim()
    );
    
    console.log('✅ Twilio client created');
    
    // Test by fetching account info
    client.api.accounts(process.env.TWILIO_ACCOUNT_SID)
      .fetch()
      .then(account => {
        console.log('✅ Twilio connection test successful');
        console.log('   Account status:', account.status);
      })
      .catch(error => {
        console.log('❌ Twilio connection test failed:', error.message);
        if (error.code === 20003) {
          console.log('💡 Hint: Check your Twilio Account SID and Auth Token');
        }
      });
  } else {
    console.log('❌ Twilio credentials missing');
  }
} catch (error) {
  console.log('❌ Twilio test error:', error.message);
}

console.log('\n=== END DEBUG ===');