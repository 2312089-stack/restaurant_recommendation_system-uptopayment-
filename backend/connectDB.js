import mongoose from 'mongoose';
import { getMongoUri } from './config/env.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(getMongoUri());
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
