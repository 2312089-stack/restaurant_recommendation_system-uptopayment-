// Create a new file: debug-razorpay.js in your backend root
import dotenv from 'dotenv';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

console.log('\n🔍 DEBUGGING RAZORPAY CONFIGURATION\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : 'MISSING');
console.log('   RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 10)}...` : 'MISSING');

// Check if values are strings and not empty
console.log('\n2. Variable Types:');
console.log('   KEY_ID type:', typeof process.env.RAZORPAY_KEY_ID);
console.log('   KEY_SECRET type:', typeof process.env.RAZORPAY_KEY_SECRET);
console.log('   KEY_ID length:', process.env.RAZORPAY_KEY_ID?.length || 0);
console.log('   KEY_SECRET length:', process.env.RAZORPAY_KEY_SECRET?.length || 0);

// Try to initialize Razorpay
console.log('\n3. Testing Razorpay Initialization:');
try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Missing Razorpay credentials in environment');
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log('   ✅ Razorpay instance created successfully');
  
  // Try to create a test order
  console.log('\n4. Testing Order Creation:');
  
  const testOrder = await razorpay.orders.create({
    amount: 100, // ₹1 in paise
    currency: 'INR',
    receipt: 'test_receipt_' + Date.now()
  });
  
  console.log('   ✅ Test order created successfully:', testOrder.id);
  console.log('   Order amount:', testOrder.amount);
  console.log('   Order currency:', testOrder.currency);
  
} catch (error) {
  console.log('   ❌ Razorpay initialization/test failed:');
  console.log('   Error:', error.message);
  console.log('   Stack:', error.stack);
  
  if (error.message.includes('Your key')) {
    console.log('\n💡 SOLUTION: Your Razorpay API keys might be incorrect or inactive.');
    console.log('   - Check your Razorpay Dashboard: https://dashboard.razorpay.com/app/keys');
    console.log('   - Make sure you\'re using TEST keys for development');
    console.log('   - Ensure the keys are copied correctly without extra spaces');
  }
}

console.log('\n🔍 DEBUG COMPLETE\n');