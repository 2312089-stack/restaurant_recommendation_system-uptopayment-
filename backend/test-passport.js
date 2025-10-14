// backend/test-passport.js - Run this to verify passport setup
import dotenv from 'dotenv';
dotenv.config();

console.log('\n========================================');
console.log('🔍 PASSPORT CONFIGURATION TEST');
console.log('========================================\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking Environment Variables:');
console.log('  ✓ GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ MISSING');
console.log('  ✓ GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('  ✓ GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL || 'Using default');
console.log('  ✓ JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('  ✓ MONGODB_URI:', process.env.MONGODB_URI ? '✅ SET' : '❌ MISSING');

// Test 2: Import passport config
console.log('\n2️⃣ Testing Passport Import:');
try {
  const passport = await import('./config/passport.js');
  console.log('  ✅ Passport config imported successfully');
  
  // Check if Google strategy is registered
  const strategies = passport.default._strategies || {};
  if (strategies.google) {
    console.log('  ✅ Google strategy registered');
  } else {
    console.log('  ⚠️  Google strategy NOT found in passport._strategies');
    console.log('  Available strategies:', Object.keys(strategies));
  }
} catch (error) {
  console.log('  ❌ Error importing passport:', error.message);
}

// Test 3: Check User model
console.log('\n3️⃣ Testing User Model:');
try {
  const User = await import('./models/User.js');
  console.log('  ✅ User model imported successfully');
  
  // Check if User model has required fields
  const schema = User.default.schema.obj;
  console.log('  ✓ googleId field:', schema.googleId ? '✅' : '❌');
  console.log('  ✓ authProvider field:', schema.authProvider ? '✅' : '❌');
  console.log('  ✓ emailId field:', schema.emailId ? '✅' : '❌');
} catch (error) {
  console.log('  ❌ Error importing User model:', error.message);
}

console.log('\n========================================');
console.log('📋 RECOMMENDATIONS:');
console.log('========================================\n');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.log('⚠️  Set up Google OAuth credentials:');
  console.log('   1. Go to https://console.cloud.google.com/');
  console.log('   2. Create a project or select existing one');
  console.log('   3. Enable Google+ API');
  console.log('   4. Create OAuth 2.0 credentials');
  console.log('   5. Add authorized redirect URI:');
  console.log('      http://localhost:5000/api/auth/google/callback');
  console.log('   6. Copy Client ID and Client Secret to .env file\n');
}

console.log('✅ Run your server with: npm run dev');
console.log('✅ Test Google OAuth at: http://localhost:5000/api/auth/google\n');