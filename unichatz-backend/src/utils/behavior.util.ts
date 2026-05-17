import User from "../models/User.model";

/* =========================
   SMOOTH UPDATE
========================= */

export function smoothUpdate(
  oldValue: number,
  newValue: number,
  weight = 0.15
) {
  return oldValue * (1 - weight) + newValue * weight;
}

/* =========================
   BEHAVIOR UPDATE V1
========================= */

export async function updateBehaviorV1(
  userId: string,
  metadata: any
) {
  const user = await User.findById(userId);
  if (!user) return;

  const durationSec =
    (Date.now() - metadata.startedAt) / 1000;

  const totalMessages =
    metadata.messageCountA + metadata.messageCountB;

  const earlyExit = durationSec < 30;

  /* =====================
     RESPECT
  ===================== */

  let respect = 80;

  if (metadata.reports > 0) respect -= 40;
  if (user.violationScore > 0) respect -= 20;

  respect = Math.max(0, Math.min(100, respect));

  /* =====================
     STABILITY
  ===================== */

  let stability = 50;

  if (durationSec > 120) stability += 15;
  if (durationSec > 180) stability += 15;
  if (earlyExit) stability -= 20;

  stability = Math.max(0, Math.min(100, stability));

  /* =====================
     ENGAGEMENT
  ===================== */

  let engagement = 50;

  if (metadata.mutualLike) engagement += 25;
  if (totalMessages >= 10) engagement += 15;

  engagement = Math.max(0, Math.min(100, engagement));

  /* =====================
     SMOOTH UPDATE
  ===================== */

  user.respectScore =
    smoothUpdate(user.respectScore, respect);

  user.stabilityScore =
    smoothUpdate(user.stabilityScore, stability);

  user.engagementScore =
    smoothUpdate(user.engagementScore, engagement);

  user.behaviorScore =
    user.respectScore * 0.4 +
    user.stabilityScore * 0.3 +
    user.engagementScore * 0.3;

  user.behaviorScore =
    Math.max(0, Math.min(100, user.behaviorScore));

  await user.save();
}