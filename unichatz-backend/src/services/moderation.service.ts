import User from "../models/User.model";

const REPORT_WEIGHTS: Record<string, number> = {
  sexual: 5,
  hate: 5,
  threats: 7,
  spam: 2,
  minor: 1,
};

export class ModerationService {

  static async applyReport(userId: string, category: string) {

    const weight = REPORT_WEIGHTS[category] ?? 1;

    const user = await User.findById(userId);
    if (!user) return null;

    // Immediate small deduction
    user.trustScore -= weight * 5;

    user.violationScore += weight;
    user.reportCount += 1;

    let warningTriggered = false;

    if (user.violationScore >= 5 && user.violationScore < 10) {
      warningTriggered = true;
    }

    if (user.violationScore >= 10 && user.violationScore < 20) {
      user.softPenaltyLevel += 1;
    }

    if (user.violationScore >= 20 && !user.isShadowIsolated) {
  user.isShadowIsolated = true;
  user.shadowSince = new Date();
}

    await user.save();

    return {
      warningTriggered,
      violationScore: user.violationScore,
      trustScore: user.trustScore,
      isShadowIsolated: user.isShadowIsolated
    };
  }

}