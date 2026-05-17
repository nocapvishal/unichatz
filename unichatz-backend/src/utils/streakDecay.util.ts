import User from "../models/User.model";

export const runStreakDecay = async () => {
  try {
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const startOfYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    // Find users whose lastQualityDate is older than yesterday
    const result = await User.updateMany(
      {
        qualityStreak: { $gt: 0 },
        $or: [
          { lastQualityDate: null },
          { lastQualityDate: { $lt: startOfYesterday } },
        ],
      },
      {
        $set: { qualityStreak: 0 },
      }
    );

    console.log(`🔥 Streak decay executed. Reset count: ${result.modifiedCount}`);
  } catch (error) {
    console.error("❌ Streak decay failed:", error);
  }
};