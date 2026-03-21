// quick-env-check.js - FIXED VERSION
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Check if .env file exists
const envPath = resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  // Read and show .env file content (without sensitive values)
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log('📄 .env file contains', lines.length, 'variables:');
    lines.forEach(line => {
      const [key] = line.split('=');
      console.log(`   - ${key}`);
    });
  } catch (error) {
    console.log('❌ Error reading .env file:', error.message);
  }
} else {
  console.log('❌ .env file NOT FOUND at:', envPath);
  
  // Check alternative locations
  const altPaths = [
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '..', '.env'),
    resolve(process.cwd(), 'backend', '.env')
  ];
  
  console.log('Checking alternative locations:');
  altPaths.forEach(path => {
    console.log(`   ${path}: ${fs.existsSync(path) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  });
}

// Load environment variables
console.log('\n🔄 Loading environment variables...');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('❌ Error loading .env:', result.error.message);
  
  // Try alternative approach
  console.log('🔄 Trying alternative loading method...');
  try {
    dotenv.config();
    console.log('✅ Alternative loading successful');
  } catch (altError) {
    console.log('❌ Alternative loading failed:', altError.message);
  }
} else {
  console.log('✅ .env file loaded successfully');
}

console.log('\n=== CHECKING CRITICAL VARIABLES ===');

const requiredVars = [
  'MONGODB_URI',
  'RAZORPAY_KEY_ID', 
  'RAZORPAY_KEY_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const display = exists ? '✅ SET' : '❌ MISSING';
  
  console.log(`${varName}: ${display}`);
  
  if (exists && varName.includes('KEY')) {
    // Show partial value for keys to verify they're correct
    console.log(`   Value preview: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
  }
  
  if (!exists) {
    allPresent = false;
  }
});

console.log('\n=== SUMMARY ===');
if (allPresent) {
  console.log('🎉 ALL REQUIRED ENVIRONMENT VARIABLES ARE SET!');
} else {
  console.log('⚠️  SOME REQUIRED ENVIRONMENT VARIABLES ARE MISSING');
  console.log('Please check your .env file and make sure all variables are set correctly.');
}

console.log('\n=== QUICK TESTS ===');

// Test MongoDB URI format
if (process.env.MONGODB_URI) {
  const isValidMongo = process.env.MONGODB_URI.startsWith('mongodb');
  console.log(`MongoDB URI format: ${isValidMongo ? '✅ Valid' : '❌ Invalid'}`);
}

// Test Razorpay key format
if (process.env.RAZORPAY_KEY_ID) {
  const isValidRazorpay = process.env.RAZORPAY_KEY_ID.startsWith('rzp_');
  console.log(`Razorpay Key format: ${isValidRazorpay ? '✅ Valid' : '❌ Invalid'}`);
}

// Test email format
if (process.env.EMAIL_USER) {
  const isValidEmail = process.env.EMAIL_USER.includes('@');
  console.log(`Email format: ${isValidEmail ? '✅ Valid' : '❌ Invalid'}`);
}

// Test Twilio SID format  
if (process.env.TWILIO_ACCOUNT_SID) {
  const isValidTwilio = process.env.TWILIO_ACCOUNT_SID.startsWith('AC');
  console.log(`Twilio SID format: ${isValidTwilio ? '✅ Valid' : '❌ Invalid'}`);
}

console.log('\n=== DONE ===');