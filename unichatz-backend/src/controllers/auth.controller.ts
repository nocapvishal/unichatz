import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import OTP from "../models/OTP.model";
import { AppError } from "../utils/AppError";
import * as authService from "../services/auth.service";

const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: false,          // important for localhost
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

const clearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, getCookieOptions(authService.ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie("refreshToken", refreshToken, getCookieOptions(authService.REFRESH_TOKEN_MAX_AGE_MS));
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", clearCookieOptions());
  res.clearCookie("refreshToken", clearCookieOptions());
};

export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email } = req.body as { email?: string };

    if (!email) {
      throw new AppError("Email required", 400);
    }

    email = authService.normalizeEmail(email);

    if (!authService.isUniversityEmail(email)) {
      throw new AppError("Please use a valid university email address", 403);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User already registered", 400);
    }

    const otp = authService.generateOTP();
    await OTP.findOneAndUpdate(
      { email },
      {
        codeHash: authService.hashValue(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${email}: ${otp}`);
    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email, password, gender, otp } = req.body as {
      email?: string;
      password?: string;
      gender?: string;
      otp?: string;
    };

    if (!email || !password || !gender) {
      throw new AppError("Missing fields", 400);
    }

    email = authService.normalizeEmail(email);

    if (!authService.isUniversityEmail(email)) {
      throw new AppError("Invalid university email", 403);
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }

    if (!["male", "female", "other"].includes(gender)) {
      throw new AppError("Invalid gender selection", 400);
    }

    await authService.verifyOtpIfNeeded(email, otp);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User already exists", 400);
    }

    const alias = await authService.generateUniqueAlias();

    const user = new User({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      gender,
      genderLocked: true,
      isVerified: true,
      alias,
      university: authService.getUniversityFromEmail(email),
      tier: "Actually Chill",
      trustScore: 1000,
      behaviorScore: 50
    });

    await user.save();

    const { accessToken, refreshToken } = await authService.createSessionForUser(user);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: "Account created successfully",
      user: authService.buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError("Missing credentials", 400);
    }

    email = authService.normalizeEmail(email);

    const user = await User.findOne({ email }).select("+passwordHash +password +refreshToken");
    if (!user) {
      throw new AppError("Invalid credentials", 400);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError("Account locked. Try again later.", 423);
    }

    const hashToCompare = user.passwordHash || (user as any).password;
    if (!hashToCompare) {
      throw new AppError("Invalid credentials", 400);
    }

    const isValidPassword = await bcrypt.compare(password, hashToCompare);
    if (!isValidPassword) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.loginAttempts = 0;
      }

      await user.save();
      throw new AppError("Invalid credentials", 400);
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    // After successful login, migrate the field on the fly if needed
    if ((user as any).password && !user.passwordHash) {
      await User.updateOne({ _id: user._id }, {
        $set: { passwordHash: (user as any).password },
        $unset: { password: "" }
      });
    }

    const { accessToken, refreshToken } = await authService.createSessionForUser(user);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: "Login successful",
      user: authService.buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      throw new AppError("Email required", 400);
    }

    const normalizedEmail = authService.normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: "If account exists, reset link sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = authService.hashValue(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(
      `Reset link: ${(process.env.CLIENT_URL || "http://localhost:3001").replace(/\/$/, "")}/?resetToken=${resetToken}&email=${normalizedEmail}`
    );

    res.json({ message: "Reset link sent (check terminal)" });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, newPassword } = req.body as {
      email?: string;
      token?: string;
      newPassword?: string;
    };

    if (!email || !token || !newPassword) {
      throw new AppError("Missing fields", 400);
    }

    const user = await User.findOne({
      email: authService.normalizeEmail(email),
      passwordResetToken: authService.hashValue(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError("Invalid or expired token", 400);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new AppError("No refresh token", 401);
    }

    let decoded: authService.JwtPayload;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
      ) as authService.JwtPayload;
    } catch {
      clearAuthCookies(res);
      throw new AppError("Invalid refresh token", 403);
    }

    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || !user.refreshToken) {
      clearAuthCookies(res);
      throw new AppError("Invalid session", 403);
    }

    if (authService.hashValue(refreshToken) !== user.refreshToken) {
      clearAuthCookies(res);
      throw new AppError("Token mismatch", 403);
    }

    const newAccessToken = authService.signAccessToken(String(user._id));
    const newRefreshToken = authService.signRefreshToken(String(user._id));

    user.refreshToken = authService.hashValue(newRefreshToken);
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({
      message: "Token refreshed",
      user: authService.buildAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      const decoded = jwt.decode(refreshToken) as authService.JwtPayload | null;
      if (decoded?.userId) {
        await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
      }
    }

    clearAuthCookies(res);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await User.findById(req.user._id).select(
      "email alias university isVerified onboardingComplete trustScore behaviorScore tier qualityStreak weeklyConversations weeklyMomentum isShadowIsolated"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({ user: authService.buildAuthUser(user) });
  } catch (error) {
    next(error);
  }
};

export const checkUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    res.json({
      exists: !!user
    });
  } catch (err) {
    next(err);
  }
};
