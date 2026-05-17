import User from "../models/User.model";

export async function canSendDM(userId: string) {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, reason: "User not found" };

  const today = new Date();
  const lastReset = user.lastDmReset || new Date(0);

  const isNewDay =
    today.toDateString() !== lastReset.toDateString();

  if (isNewDay) {
    user.dailyDmCount = 0;
    user.lastDmReset = today;
    await user.save();
  }

  // Tier rules
  if (user.tier === "Unhinged") {
    return { allowed: false, reason: "Improve your reputation to send requests" };
  }

  if (user.tier === "Actually Chill") {
    if (user.dailyDmCount >= 1) {
      return { allowed: false, reason: "Daily DM limit reached" };
    }
  }

  return { allowed: true };
}

export async function incrementDM(userId: string) {
  await User.findByIdAndUpdate(userId, {
    $inc: { dailyDmCount: 1 },
  });
}