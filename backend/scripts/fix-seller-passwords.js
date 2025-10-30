// backend/scripts/fix-seller-passwords.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Import Seller model AFTER dotenv config
import Seller from '../models/Seller.js';

// Use MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables!');
  console.error('Please check your .env file');
  process.exit(1);
}

async function fixSellerPasswords() {
  try {
    console.log('🔧 Connecting to MongoDB Atlas...');
    console.log('📍 URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define sellers that need password reset
    const sellersToReset = [
      { email: '2312088@nec.edu.in', newPassword: 'TempPass123!' },
      { email: '2312089@nec.edu.in', newPassword: 'TempPass123!' }
    ];

    console.log('========================================');
    console.log('🔐 RESETTING SELLER PASSWORDS');
    console.log('========================================\n');

    for (const sellerData of sellersToReset) {
      console.log(`📧 Processing: ${sellerData.email}`);
      
      // Find seller
      const seller = await Seller.findOne({ email: sellerData.email });
      
      if (!seller) {
        console.log(`❌ Seller not found: ${sellerData.email}\n`);
        continue;
      }

      console.log(`✅ Seller found: ${seller.businessName}`);

      // Hash password with bcrypt (single hash only)
      const hashedPassword = await bcrypt.hash(sellerData.newPassword, 12);
      
      console.log(`🔒 Old hash: ${seller.passwordHash.substring(0, 20)}...`);
      console.log(`🔒 New hash: ${hashedPassword.substring(0, 20)}...`);

      // Update using updateOne to bypass pre-save hooks
      await Seller.updateOne(
        { email: sellerData.email },
        { 
          $set: { 
            passwordHash: hashedPassword,
            passwordChangedAt: new Date()
          },
          $unset: { 
            passwordResetToken: '',
            passwordResetExpires: '' 
          }
        }
      );

      console.log(`✅ Password reset successfully!`);
      console.log(`   Email: ${sellerData.email}`);
      console.log(`   New Password: ${sellerData.newPassword}`);
      console.log(`   Hash length: ${hashedPassword.length}`);
      
      // Verify the password works
      const verifyResult = await bcrypt.compare(sellerData.newPassword, hashedPassword);
      console.log(`   Verification: ${verifyResult ? '✅ Success' : '❌ Failed'}\n`);
    }

    console.log('========================================');
    console.log('✅ ALL PASSWORDS RESET SUCCESSFULLY!');
    console.log('========================================');
    console.log('\n📝 Login Credentials:');
    sellersToReset.forEach(s => {
      console.log(`   Email: ${s.email}`);
      console.log(`   Password: ${s.newPassword}\n`);
    });

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixSellerPasswords();