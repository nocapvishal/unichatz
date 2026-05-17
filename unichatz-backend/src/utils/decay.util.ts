import cron from "node-cron";
import User from "../models/User.model";

/* ================================
   BEHAVIOR DECAY (SAFE VERSION)
================================ */

export async function runBehaviorDecay() {
  try {
    const users = await User.find({
      behaviorScore: { $ne: 50 }
    }).select("_id behaviorScore");

    for (const user of users) {
      const drift = (50 - user.behaviorScore) * 0.02;

      const newScore = Math.max(
        0,
        Math.min(100, user.behaviorScore + drift)
      );

      await User.updateOne(
        { _id: user._id },
        { $set: { behaviorScore: newScore } }
      );
    }

    console.log("🧠 Behavior decay completed");
  } catch (err) {
    console.error("Behavior decay failed:", err);
  }
}

/* ================================
   TRUST + VIOLATION DECAY
================================ */

export const startTrustDecayJob = () => {

  cron.schedule("0 0 * * *", async () => {

    console.log("🔄 Running trust & violation decay job...");

    const users = await User.find({}).select(
      "_id trustScore violationScore lastViolationDecay isShadowIsolated shadowSince lastTrustReset dailyTrustGained"
    );

    const baseline = 1000;
    const trustDecayRate = 0.02;
    const now = new Date();

    for (const user of users) {

      let update: any = {};
      let modified = false;

      /* ---------- Trust Gravity ---------- */

      const newTrust =
        user.trustScore +
        (baseline - user.trustScore) * trustDecayRate;

      const roundedTrust = Math.round(newTrust);

      if (roundedTrust !== user.trustScore) {
        update.trustScore = Math.min(1500, Math.max(0, roundedTrust));
        modified = true;
      }

      /* ---------- Violation Decay ---------- */

      const lastDecay = user.lastViolationDecay || new Date(0);

      const daysSinceDecay =
        (now.getTime() - lastDecay.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSinceDecay >= 7 && user.violationScore > 0) {
        update.violationScore = user.violationScore - 1;
        update.lastViolationDecay = now;
        modified = true;
      }

      /* ---------- Shadow Auto-Lift ---------- */

      if (
        user.isShadowIsolated &&
        user.shadowSince &&
        user.violationScore < 10 &&
        user.trustScore > 850
      ) {
        const daysInShadow =
          (now.getTime() - user.shadowSince.getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysInShadow >= 14) {
          update.isShadowIsolated = false;
          update.shadowSince = null;
          modified = true;
          console.log(`🟢 Shadow lifted for user ${user._id}`);
        }
      }

      /* ---------- Daily Trust Gain Reset ---------- */

      const lastReset = user.lastTrustReset || new Date(0);

      const daysSinceReset =
        (now.getTime() - lastReset.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSinceReset >= 1) {
        update.dailyTrustGained = 0;
        update.lastTrustReset = now;
        modified = true;
      }

      /* ---------- APPLY UPDATE SAFELY ---------- */

      if (modified) {
        await User.updateOne(
          { _id: user._id },
          { $set: update }
        );
      }
    }

    console.log("✅ Decay job completed");

  }, {
    timezone: "Asia/Kolkata"
  });

};