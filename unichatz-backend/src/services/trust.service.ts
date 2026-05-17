import User from "../models/User.model";

const MAX_DAILY_TRUST = 40;

export function getTier(score: number): string {
  if (score >= 1200) return "Main Character";
  if (score >= 700) return "Lowkey Icon";
  if (score >= 300) return "Actually Chill";
  return "Unhinged";
}

export async function updateTrust(
  userId: string,
  delta: number
) {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  const lastReset = user.lastTrustReset || new Date(0);

  const isNewDay =
    today.toDateString() !== lastReset.toDateString();

  if (isNewDay) {
    user.dailyTrustGained = 0;
    user.lastTrustReset = today;
  }

  if (delta > 0) {
    const allowed = Math.min(
      delta,
      MAX_DAILY_TRUST - user.dailyTrustGained
    );

    if (allowed <= 0) return;

    user.trustScore += allowed;
    user.dailyTrustGained += allowed;
  } else {
    user.trustScore += delta;
  }

  user.trustScore = Math.max(0, Math.min(2000, user.trustScore));
  
  // Apply tier automatically based on trustScore
  user.tier = getTier(user.trustScore);

  await user.save();
}
