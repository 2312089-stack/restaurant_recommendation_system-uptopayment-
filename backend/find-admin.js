// find-admin.js
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './models/User.js'; // Adjust path as needed

async function findAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═══════════════════════════════════════');
    console.log('👤 SEARCHING FOR ADMIN USERS');
    console.log('═══════════════════════════════════════\n');

    // Find all admin users
    const admins = await User.find({ role: 'admin' });
    
    if (admins.length === 0) {
      console.log('❌ No admin users found in database');
      console.log('💡 You may need to create one\n');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);
      
      admins.forEach((admin, index) => {
        console.log(`Admin #${index + 1}:`);
        console.log('  ID:', admin._id);
        console.log('  Email:', admin.email || admin.emailId);
        console.log('  Name:', admin.name);
        console.log('  Auth Provider:', admin.authProvider || 'local');
        console.log('  Created:', admin.createdAt);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findAdmin();