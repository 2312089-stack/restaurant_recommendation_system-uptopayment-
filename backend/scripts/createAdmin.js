// backend/scripts/createAdmin.js
// Run this script to create an admin user: node scripts/createAdmin.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const adminEmail = 'admin@tastesphere.com';
    const adminPassword = 'Admin@123'; // CHANGE THIS!

    // Check if admin already exists
    const existingAdmin = await User.findOne({ emailId: adminEmail });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      console.log('   Role:', existingAdmin.role);
      console.log('   Active:', existingAdmin.isActive);
      console.log('   Has Password:', !!existingAdmin.passwordHash);

      // Update existing admin if needed
      if (!existingAdmin.passwordHash || existingAdmin.role !== 'admin') {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin.passwordHash = hashedPassword;
        existingAdmin.role = 'admin';
        existingAdmin.isActive = true;
        existingAdmin.emailVerified = true;
        await existingAdmin.save();
        console.log('✅ Admin user updated successfully!');
      }
    } else {
      // Create new admin user
      console.log('📝 Creating new admin user...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminUser = new User({
        name: 'Admin',
        emailId: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
        phoneNumber: '1234567890'
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

createAdminUser();