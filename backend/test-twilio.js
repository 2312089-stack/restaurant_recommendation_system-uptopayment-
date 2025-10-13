// test-twilio.js - Run this to verify WhatsApp works
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const testTwilioWhatsApp = async () => {
  console.log('🚀 Testing Twilio WhatsApp Setup...\n');

  // Validate credentials
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    console.error('❌ Missing Twilio credentials in .env file');
    process.exit(1);
  }

  try {
    // Initialize Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID.trim(),
      process.env.TWILIO_AUTH_TOKEN.trim()
    );

    console.log('✅ Twilio client initialized');
    console.log(`📱 WhatsApp Number: ${process.env.TWILIO_WHATSAPP_NUMBER}\n`);

    // Test 1: Verify Account
    console.log('🔐 Test 1: Verifying Twilio account...');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID.trim()).fetch();
    console.log(`✅ Account Status: ${account.status}`);
    console.log(`✅ Account Type: ${account.type}`);
    console.log(`✅ Account Created: ${account.dateCreated}\n`);

    // Test 2: Check Balance
    console.log('💰 Test 2: Checking account balance...');
    const balance = await client.balance.fetch();
    console.log(`✅ Balance: ${balance.currency} ${balance.balance}`);
    console.log(`✅ Account SID: ${balance.accountSid}\n`);

    // Test 3: Send Test WhatsApp Message
    console.log('📤 Test 3: Sending test WhatsApp message...');
    console.log('⚠️  Make sure you joined the sandbox first!');
    console.log('   Step 1: Open WhatsApp');
    console.log('   Step 2: Message +1 415 523 8886');
    console.log('   Step 3: Send: join <your-sandbox-code>\n');

    // Replace with YOUR phone number (must have joined sandbox)
    const YOUR_TEST_PHONE = '+918428817940'; // ⚠️ CHANGE THIS TO YOUR NUMBER
    
    console.log(`📱 Attempting to send to: whatsapp:${YOUR_TEST_PHONE}`);
    console.log('   (Make sure this number joined the sandbox!)\n');

    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${YOUR_TEST_PHONE}`,
      body: `🍽️ *TasteSphere Test Message*\n\nHi there! 👋\n\nThis is a test notification from TasteSphere.\n\nIf you received this, WhatsApp notifications are working! ✅\n\nTest Time: ${new Date().toLocaleString()}`
    });

    console.log('✅ WhatsApp message sent successfully!');
    console.log(`✅ Message SID: ${message.sid}`);
    console.log(`✅ Status: ${message.status}`);
    console.log(`✅ Sent to: ${message.to}`);
    console.log(`✅ From: ${message.from}\n`);

    console.log('🎉 ALL TESTS PASSED!');
    console.log('📊 Summary:');
    console.log('   - Twilio Account: Active ✅');
    console.log('   - WhatsApp Sandbox: Working ✅');
    console.log('   - Message Delivery: Success ✅');
    console.log('\n💡 Next Steps:');
    console.log('   1. Test with customer orders');
    console.log('   2. Monitor free tier usage (1000 msgs/month)');
    console.log('   3. For production: Get WhatsApp Business approval');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    
    if (error.code === 20003) {
      console.error('\n❌ Authentication Failed!');
      console.error('Fix: Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    } else if (error.code === 21211) {
      console.error('\n❌ Invalid Phone Number!');
      console.error('Fix: Make sure phone number is in E.164 format (+919876543210)');
    } else if (error.code === 63016) {
      console.error('\n❌ User Not Joined Sandbox!');
      console.error('Fix: The recipient must send "join <code>" to +14155238886 first');
    }
    
    console.error('\n📖 Full Error Details:');
    console.error(error);
  }
};

// Run the test
testTwilioWhatsApp();