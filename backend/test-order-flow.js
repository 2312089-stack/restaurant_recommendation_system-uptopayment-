import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function testOrderFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB Atlas for test");

    // your test logic here...

    await mongoose.disconnect();
    console.log("✅ Disconnected after test");
  } catch (err) {
    console.error("❌ Test error:", err);
  }
}

testOrderFlow();
