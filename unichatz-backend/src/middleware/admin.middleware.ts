import { Request, Response, NextFunction } from "express";

export const adminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const adminKey = req.headers["x-admin-key"];

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({
      message: "Unauthorized",
    });
  }

  next();
};