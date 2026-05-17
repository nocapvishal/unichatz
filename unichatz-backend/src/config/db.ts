import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ MongoDB Connected");

    // Clean up stale indexes from old schema versions
    try {
      const db = mongoose.connection.db;
      if (db) {
        const usersCollection = db.collection("users");
        const indexes = await usersCollection.indexes();
        const staleIndex = indexes.find((idx: any) => idx.name === "emailHash_1");
        if (staleIndex) {
          await usersCollection.dropIndex("emailHash_1");
          console.log("🧹 Dropped stale emailHash_1 index");
        }
      }
    } catch (indexErr: any) {
      // Ignore if index doesn't exist
      if (indexErr.code !== 27) {
        console.warn("⚠️ Index cleanup warning:", indexErr.message);
      }
    }
  } catch (error) {
    console.error("❌ DB Connection Failed", error);
    process.exit(1);
  }
};