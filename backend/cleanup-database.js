// cleanup-database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Check current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Drop problematic indexes
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Dropped email_1 index');
    } catch (err) {
      console.log('ℹ️ email_1 index not found');
    }
    
    // Remove documents with null emails
    const deleteResult = await collection.deleteMany({
      $or: [
        { email: null },
        { email: { $exists: false } },
        { emailId: null },
        { emailId: { $exists: false } },
        { emailId: "" }
      ]
    });
    console.log(`✅ Removed ${deleteResult.deletedCount} documents with null/empty emails`);
    
    // Update 'email' field to 'emailId'
    const updateResult = await collection.updateMany(
      { email: { $exists: true } },
      [{ $set: { emailId: "$email" } }, { $unset: "email" }]
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} documents from 'email' to 'emailId'`);
    
    // Create proper unique index
    await collection.createIndex({ emailId: 1 }, { unique: true });
    console.log('✅ Created unique index on emailId');
    
    console.log('🎉 Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
  }
};

fixDatabase();