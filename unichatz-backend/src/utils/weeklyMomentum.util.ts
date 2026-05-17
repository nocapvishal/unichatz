import User from "../models/User.model";

export const runWeeklyMomentumReset = async () => {
  try {
    const now = new Date();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const result = await User.updateMany(
      {
        lastWeeklyReset: { $lt: sevenDaysAgo },
      },
      [
        {
          $set: {
            weeklyConversations: 0,
            lastWeeklyReset: now,
            weeklyMomentum: {
              $cond: [
                { $gt: ["$weeklyMomentum", 0] },
                { $subtract: ["$weeklyMomentum", 1] },
                0,
              ],
            },
          },
        },
      ],
      { updatePipeline: true } // 🔥 REQUIRED for aggregation pipeline
    );

    console.log(
      `📅 Weekly reset done. Modified: ${result.modifiedCount}`
    );
  } catch (error) {
    console.error("Weekly momentum reset failed:", error);
  }
};