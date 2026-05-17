import { Server, Socket } from "socket.io";
import Connection from "../models/Connection.model";
import User from "../models/User.model";
import { SYSTEM_AI_ID, AI_ALIAS, AI_TIER } from "../constants/ai.constants";

export const registerConnectionSockets = (
  io: Server,
  socket: Socket,
  connectedUsers: Map<string, Socket>
) => {
  const userId = socket.data.userId as string;

  // =========================
  // GET CONNECTIONS (FULL INBOX PAYLOAD)
  // =========================

  socket.on("get-connections", async () => {
    try {
      const now = new Date();

      // Ensure AI connection exists
      let aiConn = await Connection.findOne({
        participants: { $all: [userId, SYSTEM_AI_ID] }
      });

      if (!aiConn) {
        aiConn = await Connection.create({
          userAId: userId,
          userBId: SYSTEM_AI_ID,
          participants: [userId, SYSTEM_AI_ID],
          expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
          locked: true,
          lastMessagePreview: "Hi! I'm your Unichatz AI. Ask me anything!",
        });
      }

      // Fetch ALL connections (including expired ones for display)
      const connections = await Connection.find({
        participants: userId,
      }).sort({ lastMessageAt: -1, createdAt: -1 }).limit(50);

      // Bulk fetch all partner users
      const partnerIds = connections.map((conn) =>
        conn.userAId === userId ? conn.userBId : conn.userAId
      );

      const partners = await User.find({ _id: { $in: partnerIds } });
      const partnerMap = new Map<string, any>();
      partners.forEach((p) => partnerMap.set(p._id.toString(), p));

      const formatted = connections.map((conn) => {
        const pA = conn.userAId.toString();
        const pB = conn.userBId.toString();
        const partnerIdStr = pA === userId.toString() ? pB : pA;
        
        const isAI = partnerIdStr === SYSTEM_AI_ID;
        const partner = isAI ? null : partnerMap.get(partnerIdStr);

        if (!partner && !isAI) return null;

        // Derive status
        const isExpired = conn.expiresAt < now;
        const hoursLeft = (conn.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isExpiringSoon = !isExpired && hoursLeft <= 6;

        let status: "active" | "expiring" | "expired" | "user-locked";
        if (isExpired) {
          status = "expired";
        } else if (conn.locked && !isAI) {
          status = "user-locked";
        } else if (isExpiringSoon && !isAI) {
          status = "expiring";
        } else {
          status = "active";
        }

        // Check if partner is currently online
        const partnerOnline = isAI ? true : connectedUsers.has(partnerIdStr);

        return {
          roomId: conn._id.toString(),
          partnerId: partnerIdStr,
          alias: isAI ? AI_ALIAS : (partner?.alias || "Anonymous"),
          tier: isAI ? AI_TIER : (partner?.tier || "Actually Chill"),
          avatarUrl: isAI ? "/ai-avatar.png" : null,
          partnerOnline,
          status,
          expiresAt: conn.expiresAt.toISOString(),
          lastMessage: conn.lastMessagePreview || null,
          lastMessageAt: conn.lastMessageAt?.toISOString() || null,
          unreadCount: 0, // TODO: track in Message model
          // AI fields
          aiSummary: conn.aiSummary || null,
          vibe: conn.vibe || null,
          replySuggestions: conn.replySuggestions || [],
          recommendExtend: conn.recommendExtend || false,
        };
      });

      const validConnections = formatted.filter((c) => c !== null);
      socket.emit("connections-list", validConnections);

    } catch (error) {
      console.error("Error fetching connections:", error);
      socket.emit("connections-error", { message: "Failed to load connections" });
    }
  });

  // =========================
  // LOCK CONNECTION (User-initiated)
  // =========================

  socket.on("lock-connection", async ({ roomId }: { roomId: string }) => {
    try {
      const connection = await Connection.findOne({
        _id: roomId,
        participants: userId,
      });

      if (!connection) {
        socket.emit("lock-error", { message: "Connection not found" });
        return;
      }

      connection.locked = true;
      await connection.save();

      socket.emit("connection-locked", { roomId });

      // Notify partner
      const partnerId = connection.userAId === userId ? connection.userBId : connection.userAId;
      connectedUsers.get(partnerId)?.emit("connection-locked-by-partner", { roomId });

    } catch (error) {
      console.error("Error locking connection:", error);
      socket.emit("lock-error", { message: "Failed to lock connection" });
    }
  });

  // =========================
  // UNLOCK CONNECTION
  // =========================

  socket.on("unlock-connection", async ({ partnerId }: { partnerId: string }) => {
    try {
      const connection = await Connection.findOne({
        participants: { $all: [userId, partnerId] },
        expiresAt: { $gt: new Date() },
      });

      if (!connection) {
        socket.emit("unlock-error", { message: "Connection not found or expired" });
        return;
      }

      connection.locked = false;
      await connection.save();

      socket.emit("connection-unlocked", { partnerId });

    } catch (error) {
      console.error("Error unlocking connection:", error);
      socket.emit("unlock-error", { message: "Failed to unlock connection" });
    }
  });

  // =========================
  // REMOVE CONNECTION
  // =========================

  socket.on("remove-connection", async ({ partnerId }: { partnerId: string }) => {
    try {
      const result = await Connection.deleteOne({
        participants: { $all: [userId, partnerId] },
      });

      if (result.deletedCount === 0) {
        socket.emit("remove-error", { message: "Connection not found" });
        return;
      }

      socket.emit("connection-removed", { partnerId });

      const partnerSocket = connectedUsers.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("connection-removed-by-partner", { userId });
      }

    } catch (error) {
      console.error("Error removing connection:", error);
      socket.emit("remove-error", { message: "Failed to remove connection" });
    }
  });
};