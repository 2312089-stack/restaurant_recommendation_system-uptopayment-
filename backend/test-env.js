import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Current directory:', __dirname);
console.log('Looking for .env at:', path.join(__dirname, '.env'));

const result = dotenv.config();

if (result.error) {
  console.error('❌ Error loading .env:', result.error);
} else {
  console.log('✅ .env file loaded successfully!');
}

console.log('\nEnvironment variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || '❌ NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET || '❌ NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '❌ NOT SET');