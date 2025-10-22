// backend/scripts/checkAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const checkAdmin = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admins = await User.find({ role: 'admin' });
  console.log('Admin users:', admins);
  
  mongoose.connection.close();
};

checkAdmin();