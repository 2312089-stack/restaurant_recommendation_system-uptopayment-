import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('🌐 Environment:', process.env.NODE_ENV);
    console.log('📍 Connection String Preview:', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@'));

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection timeout and retry settings
      serverSelectionTimeoutMS: 15000, // Timeout after 15s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      heartbeatFrequencyMS: 10000, // Send a ping every 10s to keep connection alive
      
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain a minimum of 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      
      // REMOVED: bufferCommands and bufferMaxEntries - these are deprecated
      // bufferCommands: false, // REMOVED - deprecated
      // bufferMaxEntries: 0, // REMOVED - deprecated
      
      // Write concern
      retryWrites: true,
      w: 'majority'
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Connection State: ${getConnectionState(conn.connection.readyState)}`);

    // Enhanced event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

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
    
    // Enhanced error reporting
    if (error.message.includes('ENOTFOUND')) {
      console.log(`
🔧 DNS Resolution Error - Try:
1. Check your internet connection
2. Verify MongoDB Atlas cluster is active
3. Add your IP to Network Access (0.0.0.0/0 for development)
4. Try using Google DNS (8.8.8.8, 8.8.4.4)
      `);
    }
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log(`
🔧 IP Whitelist Error - Go to MongoDB Atlas:
1. Navigate to "Network Access"
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
4. Save changes and wait 2-3 minutes
      `);
    }
    
    throw error;
  }
};

// Helper function to get readable connection state
const getConnectionState = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[state] || 'Unknown';
};

export default connectDB;