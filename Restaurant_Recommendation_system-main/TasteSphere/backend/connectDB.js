import mongoose from 'mongoose';
import { getMongoUri } from './config/env.js';

const getConnectionState = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  return states[state] || 'Unknown';
};

const connectDB = async () => {
  const mongoUri = getMongoUri();

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Connection String Preview:', mongoUri?.replace(/\/\/.*@/, '//***:***@'));

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority',
    });

    console.log('MongoDB connected successfully');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Connection State: ${getConnectionState(conn.connection.readyState)}`);

    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Closing MongoDB connection...`);

      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed gracefully');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    if (error.message.includes('ENOTFOUND')) {
      console.log(`
DNS Resolution Error - Try:
1. Check your internet connection
2. Verify MongoDB Atlas cluster is active
3. Add your IP to Network Access (0.0.0.0/0 for development)
4. Try using Google DNS (8.8.8.8, 8.8.4.4)
      `);
    }

    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log(`
IP Whitelist Error - Go to MongoDB Atlas:
1. Navigate to "Network Access"
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
4. Save changes and wait 2-3 minutes
      `);
    }

    throw error;
  }
};

export default connectDB;
