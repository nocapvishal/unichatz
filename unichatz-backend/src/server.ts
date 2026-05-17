import { runStreakDecay } from "./utils/streakDecay.util";
import { runWeeklyMomentumReset } from "./utils/weeklyMomentum.util";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { registerSocketHandlers } from "./sockets";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import feedRoutes from "./routes/feed.routes";
import adminRoutes from "./routes/admin.routes";
import { authRoutes } from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import { startTrustDecayJob, runBehaviorDecay } from "./utils/decay.util";
import commentRoutes from "./routes/comment.routes";
import connectionsRoutes from "./routes/connections.routes";
import voteRoutes from "./routes/vote.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import connectionRoutes from "./routes/connection.routes";
import { globalErrorHandler } from "./middleware/error.middleware";
dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const publicDir = path.resolve(__dirname, "../../public");

app.set("trust proxy", 1);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing in environment variables");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET missing in environment variables");
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI missing in environment variables");
}

// ✅ SIMPLIFIED CORS CONFIGURATION FOR LOCALHOST COOKIES
const corsOptions: cors.CorsOptions = {
  origin: "http://localhost:3000", // ✅ Explicit origin - required for credentials
  credentials: true, // ✅ CRITICAL: Must be true for cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
};

app.use(morgan(isProduction ? "combined" : "tiny"));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: isProduction ? undefined : false,
  }),
);

// ✅ CORS must come BEFORE other middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 5000,
  message: { status: "error", message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 100, // ✅ Increased for dev testing
  message: { status: "error", message: "Too many authentication attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use("/auth", authLimiter, authRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/connections", connectionsRoutes);
app.use("/admin", adminRoutes);
app.use(express.static(publicDir));
app.use("/votes", voteRoutes);
app.use("/api/connections", connectionRoutes);


app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
  });
});

app.use(globalErrorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket"],
});

registerSocketHandlers(io);

const startStreakDecayJob = () => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  runStreakDecay();
  setInterval(() => {
    runStreakDecay();
  }, oneDayMs);
};

const startWeeklyMomentumJob = () => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  runWeeklyMomentumReset();
  setInterval(() => {
    runWeeklyMomentumReset();
  }, oneDayMs);
};

const startBehaviorDecayJob = () => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  runBehaviorDecay();
  setInterval(() => {
    runBehaviorDecay();
  }, oneDayMs);
};

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    startTrustDecayJob();
    startStreakDecayJob();
    startWeeklyMomentumJob();
    startBehaviorDecayJob();

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
      console.log(`✅ CORS enabled for: http://localhost:3000`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();