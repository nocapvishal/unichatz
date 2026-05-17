import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import { registerModerationSockets } from "./moderation.socket";
import { registerChatSockets } from "./chat.socket";
import { registerConnectionSockets } from "./connection.socket";
import { isQualityConversation } from "../utils/conversationQuality.util";

interface JwtPayload {
  userId: string;
}

interface ActiveConversation {
  startedAt: Date;
  totalMessages: number;
  user1Id: string;
  user2Id: string;
  user1Messages: number;
  user2Messages: number;
  wasReported: boolean;
  wasEarlySkipped: boolean;
}

const activeConversations = new Map<string, ActiveConversation>();
const connectedUsers = new Map<string, Socket>();

const getCookieToken = (cookieHeader?: string) => {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});

  return cookies.accessToken;
};

export const registerSocketHandlers = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const bearerToken = socket.handshake.auth?.token;
      const cookieToken = getCookieToken(socket.handshake.headers.cookie);
      const token = cookieToken || bearerToken;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as JwtPayload;

      socket.data.userId = decoded.userId;

      // Verify user async to avoid blocking connection
      User.findById(decoded.userId).then((user) => {
        if (!user || !user.isVerified || user.isBanned) {
          socket.disconnect(true);
        } else {
          socket.data.user = user;
        }
      }).catch((err) => {
        console.error("Socket user fetch error:", err);
        socket.disconnect(true);
      });

      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;

    console.log("User connected:", userId);

    connectedUsers.set(userId, socket);

    registerModerationSockets(io, socket);
    registerChatSockets(io, socket, connectedUsers);
    registerConnectionSockets(io, socket, connectedUsers);

    socket.on("conversation-start", ({ conversationId, user1Id, user2Id }) => {
      activeConversations.set(conversationId, {
        startedAt: new Date(),
        totalMessages: 0,
        user1Id,
        user2Id,
        user1Messages: 0,
        user2Messages: 0,
        wasReported: false,
        wasEarlySkipped: false,
      });
    });

    socket.on("message", ({ conversationId }) => {
      const convo = activeConversations.get(conversationId);
      if (!convo) return;

      convo.totalMessages++;

      if (socket.data.userId === convo.user1Id) {
        convo.user1Messages++;
      } else if (socket.data.userId === convo.user2Id) {
        convo.user2Messages++;
      }
    });

    socket.on("report-user", ({ conversationId }) => {
      const convo = activeConversations.get(conversationId);
      if (convo) convo.wasReported = true;
    });

    socket.on("early-skip", ({ conversationId }) => {
      const convo = activeConversations.get(conversationId);
      if (convo) convo.wasEarlySkipped = true;
    });

    socket.on("conversation-end", async ({ conversationId }) => {
      const convo = activeConversations.get(conversationId);
      if (!convo) return;

      const endedAt = new Date();

      const qualifies = isQualityConversation({
        startedAt: convo.startedAt,
        endedAt,
        totalMessages: convo.totalMessages,
        user1Messages: convo.user1Messages,
        user2Messages: convo.user2Messages,
        wasReported: convo.wasReported,
        wasEarlySkipped: convo.wasEarlySkipped,
      });

      if (qualifies) {
        await handleQualityStreak(convo.user1Id);
        await handleQualityStreak(convo.user2Id);
      }

      activeConversations.delete(conversationId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
      connectedUsers.delete(userId);
    });
  });
};

const handleQualityStreak = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const last = user.lastQualityDate;

  if (last) {
    const lastDate = new Date(last);

    const sameDay = lastDate.toDateString() === today.toDateString();
    const wasYesterday = lastDate.toDateString() === yesterday.toDateString();

    if (sameDay) return;

    if (wasYesterday) {
      user.qualityStreak += 1;
    } else {
      user.qualityStreak = 1;
    }
  } else {
    user.qualityStreak = 1;
  }

  user.lastQualityDate = today;
  user.totalQualityConversations += 1;

  if (user.qualityStreak === 3) user.trustScore += 15;
  if (user.qualityStreak === 7) user.trustScore += 30;
  if (user.qualityStreak === 14) user.trustScore += 50;

  await user.save();
};
