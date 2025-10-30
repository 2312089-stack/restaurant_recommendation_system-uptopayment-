import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Get and validate MongoDB URI
    const mongoURI = process.env.MONGODB_URI?.trim();
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('🌐 Environment:', process.env.NODE_ENV);
    console.log('📍 URI exists:', !!mongoURI);
    console.log('📍 URI starts with:', mongoURI?.substring(0, 15));
    console.log('📍 Connection String Preview:', mongoURI?.replace(/\/\/.*@/, '//***:***@'));

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
      throw new Error(`Invalid MongoDB URI format. URI starts with: "${mongoURI.substring(0, 20)}"`);
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority'
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Closing MongoDB connection...`);
      try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return conn;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

export default connectDB;