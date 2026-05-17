import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import OTP from "../models/OTP.model";
import { generateAlias } from "../utils/aliasGenerator";
import { AppError } from "../utils/AppError";

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface JwtPayload {
  userId: string;
}

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const hashValue = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getAllowedUniversityDomains = () =>
  (process.env.UNIVERSITY_EMAIL_DOMAINS || "pondiuni.ac.in")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

export const isUniversityEmail = (email: string) => {
  const [, domain] = normalizeEmail(email).split("@");
  return Boolean(domain && getAllowedUniversityDomains().includes(domain));
};

export const getUniversityFromEmail = (email: string) => {
  const [, domain = "unknown"] = normalizeEmail(email).split("@");
  return domain;
};

const requiresOtpVerification = () => process.env.AUTH_REQUIRE_OTP === "true";

export const signAccessToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  });

export const signRefreshToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });

export const createSessionForUser = async (user: any) => {
  const userId = String(user._id);
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  user.refreshToken = hashValue(refreshToken);
  await user.save();

  return { accessToken, refreshToken };
};

export const buildAuthUser = (user: any) => ({
  id: String(user._id),
  email: user.email,
  alias: user.alias,
  university: user.university,
  isVerified: user.isVerified,
  onboardingComplete: !!user.onboardingComplete,
  trustScore: user.trustScore,
  behaviorScore: user.behaviorScore,
  tier: user.tier,
});

export const verifyOtpIfNeeded = async (email: string, otp?: string) => {
  if (!requiresOtpVerification()) {
    return;
  }

  if (!otp) {
    throw new AppError("OTP is required", 400);
  }

  const otpRecord = await OTP.findOne({ email });

  if (!otpRecord) {
    throw new AppError("OTP not found", 400);
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteOne({ email });
    throw new AppError("OTP expired", 400);
  }

  otpRecord.attempts += 1;

  if (otpRecord.attempts > 5) {
    await OTP.deleteOne({ email });
    throw new AppError("Too many attempts", 400);
  }

  if (hashValue(otp) !== otpRecord.codeHash) {
    await otpRecord.save();
    throw new AppError("Invalid OTP", 400);
  }

  await OTP.deleteOne({ email });
};

export const generateUniqueAlias = async () => {
  let alias = generateAlias();
  while (await User.findOne({ alias })) {
    alias = generateAlias();
  }
  return alias;
};
