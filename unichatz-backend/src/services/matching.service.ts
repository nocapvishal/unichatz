import User from "../models/User.model";

interface QueueUser {
  userId: string;
  gender: string;
  preference: string;
  intent: string;
  joinedAt: number;
  trustScore: number;
  tier: string;
  isShadowIsolated: boolean;
  blockList: string[];
  lastRefreshedAt?: number;
}

export class MatchingService {
  private queue: Map<string, QueueUser> = new Map();
  private MATCH_WAIT_EXPIRY = 2 * 60 * 1000;

  /* =========================
     ADD USER (CACHE LOAD)
  ========================= */

  async add(user: {
    userId: string;
    gender: string;
    preference: string;
    intent: string;
    joinedAt: number;
  }) {
    const dbUser = await User.findById(user.userId).select(
      "trustScore tier isShadowIsolated blockList isBanned"
    );

    if (!dbUser || dbUser.isBanned) return;

    this.queue.set(user.userId, {
      ...user,
      trustScore: dbUser.trustScore,
      tier: dbUser.tier,
      isShadowIsolated: dbUser.isShadowIsolated,
      blockList: dbUser.blockList.map((id: any) => id.toString()),
    });
  }

  remove(userId: string) {
    this.queue.delete(userId);
  }

  getCounts() {
    const counts = { friendship: 0, dating: 0, casual: 0 };
    for (const user of this.queue.values()) {
      if (user.intent === "friendship") counts.friendship++;
      else if (user.intent === "dating") counts.dating++;
      else if (user.intent === "casual") counts.casual++;
    }
    return counts;
  }

  /* =========================
     CLEANUP EXPIRED
  ========================= */

  private cleanupExpired() {
    const now = Date.now();

    for (const [id, user] of this.queue.entries()) {
      if (now - user.joinedAt > this.MATCH_WAIT_EXPIRY) {
        this.queue.delete(id);
      }
    }
  }

  /* =========================
     REFRESH STALE USER DATA
  ========================= */

  private async refreshUserIfStale(user: QueueUser) {
    const now = Date.now();

    if (!user.lastRefreshedAt) {
      user.lastRefreshedAt = user.joinedAt;
    }

    if (now - user.lastRefreshedAt < 30000) return; // 30s cache

    const dbUser = await User.findById(user.userId)
      .select("trustScore tier isShadowIsolated blockList");

    if (!dbUser) return;

    user.trustScore = dbUser.trustScore;
    user.tier = dbUser.tier;
    user.isShadowIsolated = dbUser.isShadowIsolated;
    user.blockList = dbUser.blockList.map((id: any) => id.toString());
    user.lastRefreshedAt = now;
  }

  /* =========================
     TIER COMPATIBILITY
  ========================= */

  private tierCompatible(tierA: string, tierB: string): boolean {
    const compatibility: Record<string, string[]> = {
      "Unhinged": ["Unhinged", "Actually Chill"],
      "Actually Chill": ["Unhinged", "Actually Chill", "Lowkey Icon"],
      "Lowkey Icon": ["Actually Chill", "Lowkey Icon", "Main Character"],
      "Main Character": ["Lowkey Icon", "Main Character"],
    };

    return compatibility[tierA]?.includes(tierB) ?? false;
  }

  /* =========================
     TRUST PROXIMITY SCORE
  ========================= */

  private trustScoreCompatibility(trustA: number, trustB: number): number {
    const diff = Math.abs(trustA - trustB);
    return 1 - diff / 2000; // normalized 0 → 1
  }

  /* =========================
     TIER WEIGHT (MATCHING BOOST)
  ========================= */

  private tierWeight(tier: string): number {
    switch (tier) {
      case "Main Character": return 0.4;
      case "Lowkey Icon": return 0.3;
      case "Actually Chill": return 0.2;
      case "Unhinged": return 0.1;
      default: return 0;
    }
  }

  /* =========================
     MATCH LOGIC (ENHANCED WITH TIERS)
  ========================= */

  async tryMatch() {
    this.cleanupExpired();

    const MAX_QUEUE_SCAN = 150;
    const users = Array.from(this.queue.values()).slice(0, MAX_QUEUE_SCAN);

    if (users.length < 2) return null;

    // Batch refresh stale users
    const refreshPromises: Promise<void>[] = [];
    for (const user of users) {
      refreshPromises.push(this.refreshUserIfStale(user));
    }
    await Promise.all(refreshPromises);

    const now = Date.now();
    let bestMatch: { userAId: string; userBId: string } | null = null;
    let highestScore = -1;

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const a = users[i];
        const b = users[j];

        if (!this.canMatch(a, b, now)) continue;
        if (!this.tierCompatible(a.tier, b.tier)) continue;

        // Enhanced scoring with tier boost
        const trustScore = this.trustScoreCompatibility(a.trustScore, b.trustScore);
        const tierBonus = a.tier === b.tier ? 0.2 : 0;
        const tierWeightBoost = (this.tierWeight(a.tier) + this.tierWeight(b.tier)) / 2;
        const waitTimeBias = 
          Math.log1p((now - a.joinedAt) / 60000) + 
          Math.log1p((now - b.joinedAt) / 60000);

        const totalScore = 
          trustScore * 0.4 +      // 40% trust proximity
          tierBonus * 0.2 +       // 20% same tier bonus  
          tierWeightBoost * 0.3 + // 30% tier boost (higher tiers prioritized)
          waitTimeBias * 0.1;     // 10% wait time

        if (totalScore > highestScore) {
          highestScore = totalScore;
          bestMatch = { userAId: a.userId, userBId: b.userId };
        }
      }
    }

    if (!bestMatch) return null;

    this.queue.delete(bestMatch.userAId);
    this.queue.delete(bestMatch.userBId);

    return bestMatch;
  }

  /* =========================
     BASIC COMPATIBILITY
  ========================= */

  private canMatch(a: QueueUser, b: QueueUser, now: number): boolean {
    if (a.userId === b.userId) return false;
    if (a.intent !== b.intent) return false;

    if (
      (a.preference !== "any" && a.preference !== b.gender) ||
      (b.preference !== "any" && b.preference !== a.gender)
    ) return false;

    if (
      a.blockList.includes(b.userId) ||
      b.blockList.includes(a.userId)
    ) return false;

    if (a.isShadowIsolated !== b.isShadowIsolated) return false;

    const trustDiff = Math.abs(a.trustScore - b.trustScore);

    // Stricter for shadow isolated
    if (a.isShadowIsolated && b.isShadowIsolated) {
      return trustDiff <= 300;
    }

    const waitedA = now - a.joinedAt;
    const waitedB = now - b.joinedAt;

    if (trustDiff <= 200) return true;
    if (trustDiff <= 400 && waitedA > 5000 && waitedB > 5000) return true;
    if (trustDiff > 400 && waitedA > 25000 && waitedB > 25000) return true;

    return false;
  }
}

// Tier colors for frontend (export separately or use constants file)
export const tierColors = {
  "Unhinged": "text-red-400 bg-red-500/10 border-red-500/30",
  "Actually Chill": "text-gray-400 bg-gray-500/10 border-gray-500/30", 
  "Lowkey Icon": "text-purple-400 bg-purple-500/10 border-purple-500/30",
  "Main Character": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
} as const;
