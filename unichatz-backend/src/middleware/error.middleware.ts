import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

const isProduction = process.env.NODE_ENV === "production";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Unhandled error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose duplicate key error (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    message = "User already exists";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((el: any) => el.message);
    message = `Invalid input data. ${errors.join(". ")}`;
  }

  if (!isProduction) {
    return res.status(statusCode).json({
      status: "error",
      message,
      error: err,
      stack: err.stack,
    });
  }

  // Production error response
  if (err.isOperational || err.statusCode) {
    return res.status(statusCode).json({
      status: "error",
      message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
