import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.model";

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    /* =====================================
       1️⃣ COOKIE-BASED AUTH (PRIMARY)
    ===================================== */

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    /* =====================================
       2️⃣ OPTIONAL BEARER FALLBACK
       (Useful for mobile apps later)
    ===================================== */

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    /* =====================================
       3️⃣ VERIFY ACCESS TOKEN
    ===================================== */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const user = await User.findById(decoded.userId)
      .select("-passwordHash -refreshToken");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    /* =====================================
       4️⃣ EMAIL VERIFIED CHECK
    ===================================== */

    const isDevelopment = process.env.NODE_ENV !== "production";
 
if (!isDevelopment && !user.isVerified) {
  // ✅ Only enforce in production
  return res.status(403).json({
    message: "Email not verified",
  });
}
 
// In development, log a warning but allow access
if (isDevelopment && !user.isVerified) {
  console.warn(`⚠️  User ${user.email} is not verified (allowed in dev mode)`);
}

    /* =====================================
       5️⃣ BAN CHECK
    ===================================== */

    if (user.isBanned) {
      return res.status(403).json({
        message: "Account permanently banned",
      });
    }

    /* =====================================
       6️⃣ ACCOUNT LOCK CHECK
    ===================================== */

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        message: "Account temporarily locked",
      });
    }

    /* =====================================
       7️⃣ LIGHTWEIGHT ACTIVITY UPDATE
    ===================================== */

    const now = new Date();
    const diff = now.getTime() - user.lastActiveAt.getTime();

    if (diff > 5 * 60 * 1000) {
      user.lastActiveAt = now;
      await user.save();
    }

    req.user = user;

    next();

  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};