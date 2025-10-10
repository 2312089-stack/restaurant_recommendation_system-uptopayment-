// backend/diagnostic.js - Run this to check your setup
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 TasteSphere Backend Diagnostic Check\n');
console.log('='.repeat(50));

// 1. Check .env file
console.log('\n📁 Checking .env file...');
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  console.log('✅ .env file found at:', envPath);
} else {
  console.log('❌ .env file NOT found at:', envPath);
  console.log('   Create a .env file in your backend root directory');
  process.exit(1);
}

// 2. Load environment variables
dotenv.config();

// 3. Check Razorpay credentials
console.log('\n💳 Checking Razorpay Configuration...');
if (process.env.RAZORPAY_KEY_ID) {
  console.log('✅ RAZORPAY_KEY_ID found:', process.env.RAZORPAY_KEY_ID.substring(0, 15) + '...');
} else {
  console.log('❌ RAZORPAY_KEY_ID is missing');
}

if (process.env.RAZORPAY_KEY_SECRET) {
  console.log('✅ RAZORPAY_KEY_SECRET found: (hidden)');
} else {
  console.log('❌ RAZORPAY_KEY_SECRET is missing');
}

// 4. Check Email credentials
console.log('\n📧 Checking Email Configuration...');
if (process.env.EMAIL_USER) {
  console.log('✅ EMAIL_USER found:', process.env.EMAIL_USER);
} else {
  console.log('⚠️  EMAIL_USER is missing (optional)');
}

if (process.env.EMAIL_PASS) {
  console.log('✅ EMAIL_PASS found: (hidden)');
} else {
  console.log('⚠️  EMAIL_PASS is missing (optional)');
}

// 5. Check other important variables
console.log('\n🔧 Checking Other Configuration...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');
console.log('PORT:', process.env.PORT || '5000 (default)');

// 6. Test Razorpay initialization
console.log('\n🧪 Testing Razorpay Initialization...');
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
    });
    console.log('✅ Razorpay instance created successfully');
    
    // Try creating a test order
    console.log('   Testing order creation...');
    razorpay.orders.create({
      amount: 100,
      currency: 'INR',
      receipt: 'diagnostic_test'
    }).then(() => {
      console.log('✅ Razorpay API connection successful!');
      console.log('\n' + '='.repeat(50));
      console.log('✅ ALL CHECKS PASSED - Your setup is correct!');
      console.log('='.repeat(50));
    }).catch((err) => {
      console.log('❌ Razorpay API call failed:', err.message);
      console.log('\n❌ POSSIBLE ISSUES:');
      console.log('   1. Invalid API credentials');
      console.log('   2. No internet connection');
      console.log('   3. Razorpay account not activated');
    });
  } catch (error) {
    console.log('❌ Failed to initialize Razorpay:', error.message);
  }
} else {
  console.log('❌ Cannot test - Razorpay credentials missing');
  console.log('\n❌ SETUP INCOMPLETE - Add Razorpay credentials to .env');
}

console.log('\n' + '='.repeat(50));
console.log('Diagnostic complete.');
console.log('='.repeat(50) + '\n');