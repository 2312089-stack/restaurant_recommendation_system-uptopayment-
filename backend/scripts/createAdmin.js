// backend/scripts/createAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tastesphere');
    console.log('✅ Connected to MongoDB');

    // Admin credentials
    const adminEmail = 'admin@tastesphere.com';
    const adminPassword = 'Admin@123456'; // Change this to your desired password
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ emailId: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin.passwordHash = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.emailVerified = true;
      await existingAdmin.save();
      
      console.log('✅ Admin password updated');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const adminUser = new User({
        name: adminName,
        emailId: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
        onboardingCompleted: true,
        preferences: {
          dietaryRestrictions: [],
          cuisinePreferences: [],
          spiceLevel: 'medium',
          allergies: []
        }
      });

      await adminUser.save();
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    }

    // List all admin users
    const admins = await User.find({ role: 'admin' }).select('name emailId role isActive');
    console.log('\n📋 All admin users in database:');
    admins.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.emailId}) - ${admin.isActive ? 'Active' : 'Inactive'}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createAdminUser();