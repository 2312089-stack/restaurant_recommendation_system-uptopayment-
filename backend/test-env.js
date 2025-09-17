// test-env.js - Create this file in your backend directory
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('=== Environment Variables Test ===');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID || 'NOT FOUND');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'FOUND (length: ' + process.env.RAZORPAY_KEY_SECRET.length + ')' : 'NOT FOUND');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'FOUND' : 'NOT FOUND');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'FOUND' : 'NOT FOUND');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT FOUND');
console.log('Working Directory:', process.cwd());
console.log('=== Test Complete ===');