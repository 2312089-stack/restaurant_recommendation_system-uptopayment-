// final-fix.js - Make emailId index unique
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const finalFix = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // 1. Drop the existing non-unique emailId index
    try {
      await collection.dropIndex('emailId_1');
      console.log('✅ Dropped existing emailId_1 index');
    } catch (err) {
      console.log('ℹ️ emailId_1 index not found:', err.message);
    }
    
    // 2. Check for any remaining duplicates before creating unique index
    const duplicates = await collection.aggregate([
      { $match: { emailId: { $exists: true, $ne: null } } },
      { $group: { _id: "$emailId", count: { $sum: 1 }, docs: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    console.log(`Found ${duplicates.length} duplicate email groups`);
    
    for (let dup of duplicates) {
      const [keep, ...remove] = dup.docs;
      await collection.deleteMany({ _id: { $in: remove } });
      console.log(`✅ Removed ${remove.length} duplicate(s) for: ${dup._id}`);
    }
    
    // 3. Create the unique index
    await collection.createIndex({ emailId: 1 }, { unique: true });
    console.log('✅ Created unique index on emailId');
    
    // 4. Verify final state
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => ({ 
      name: idx.name, 
      key: idx.key, 
      unique: idx.unique || false 
    })));
    
    const totalUsers = await collection.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    console.log('🎉 Final fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during final fix:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

finalFix();