import { Server, Socket } from "socket.io";
import { MatchingService } from "../services/matching.service";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.model";
import Connection from "../models/Connection.model";
import { logEvent } from "../utils/analytics.util";
import Message from "../models/Message.model";
import { saveMessage } from "../services/message.service";
import { createNotification } from "../services/notification.service";
import { updateTrust } from "../services/trust.service";
import { canSendDM, incrementDM } from "../services/dm.service";
import { generateChatInsights, generateAIResponse } from "../services/ai.service";
import { SYSTEM_AI_ID } from "../constants/ai.constants";

const roomConnectionMap = new Map<string, string>();

// Global singleton instance
const matchingService = new MatchingService();

// Active rooms in memory (safe for early stage)
// TODO: Move to Redis for horizontal scaling
const activeRooms = new Map<string, string>();

// Connected users map for O(1) socket lookup
// TODO: Move to Redis for horizontal scaling
const connectedUsers = new Map<string, Socket>();

// Conversation metadata tracking
interface ConversationMetadata {
  startedAt: number;
  messageCountA: number;
  messageCountB: number;
  mutualLike: boolean;
  likedByA: boolean;
  likedByB: boolean;
  reports: number;
  userAId: string;
  userBId: string;
  conversationStart: number;
  lastActivity: number;
  processing: boolean; // ADDED: Prevent double processing
}

const conversationMetadata = new Map<string, ConversationMetadata>();

/* ================================
   MEMORY LEAK PREVENTION: TTL CLEANUP
================================ */
setInterval(() => {
  const now = Date.now();
  for (const [roomId, metadata] of conversationMetadata.entries()) {
    // Only delete if conversation is stale AND no active room exists
    const roomStillActive = activeRooms.has(metadata.userAId) || activeRooms.has(metadata.userBId);
    const isStale = now - metadata.lastActivity > 60 * 60 * 1000; // 1 hour since last activity
    
    if (isStale && !roomStillActive) {
      conversationMetadata.delete(roomId);
    }
  }
}, 10 * 60 * 1000);

/* ================================
   HELPER: NORMALIZE USER IDS (RACE CONDITION FIX)
================================ */
function normalizeUserIds(userAId: string, userBId: string) {
  // Lexicographic ordering ensures consistency
  return userAId < userBId 
    ? { userAId, userBId }
    : { userAId: userBId, userBId: userAId };
}

/* ================================
   HELPER: PROCESS CONVERSATION END
================================ */
async function processConversationEnd(roomId: string) {
  const metadata = conversationMetadata.get(roomId);
  if (!metadata) return;

  // RACE CONDITION FIX: Check if already processing
  if (metadata.processing) return;
  
  // Set processing flag BEFORE deletion
  metadata.processing = true;

  // Prevent double processing by deleting immediately after lock
  conversationMetadata.delete(roomId);

  const now = Date.now();
  const durationMs = now - metadata.startedAt;
  const durationSec = durationMs / 1000;
  const totalMessages =
    metadata.messageCountA + metadata.messageCountB;

  logEvent("conversation_ended", {
    roomId,
    metadata: {
      duration: durationMs,
      totalMessages,
    },
  }).catch(() => {});

  /* =========================
     TRUST REWARD CONDITIONS
  ========================= */
  const isTrustEligible =
    durationMs >= 30000 &&
    metadata.messageCountA >= 3 &&
    metadata.messageCountB >= 3 &&
    metadata.reports === 0 &&
    metadata.mutualLike === true;

  /* =========================
     QUALITY CONDITIONS
  ========================= */
  const isQualityConversation =
    totalMessages >= 10 &&
    metadata.messageCountA >= 3 &&
    metadata.messageCountB >= 3 &&
    durationSec >= 180;

  /* =========================
     CONNECTION PERSISTENCE (RACE-SAFE)
  ========================= */
  if (metadata.mutualLike || isQualityConversation) {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    try {
      // RACE CONDITION FIX: Normalize user IDs for consistent ordering
      const { userAId, userBId } = normalizeUserIds(metadata.userAId, metadata.userBId);

      // Try to create - unique index will prevent duplicates at DB level
      const connection = await Connection.create({
        userAId,
        userBId,
        participants: [userAId, userBId],
        expiresAt,
        locked: true,
      });

      // cache connectionId for this room
      roomConnectionMap.set(roomId, connection._id.toString());

      logEvent("connection_created", {
        userAId: metadata.userAId,
        userBId: metadata.userBId,
        reason: metadata.mutualLike ? "mutual_like" : "quality_conversation"
      }).catch(() => {});

    } catch (error: any) {
      // Duplicate key error is expected and safe - ignore it
      if (error.code !== 11000) {
        console.error("Error creating connection:", error);
      }
    }
  }

  // Fetch both users in one query (optimization)
  const userIds = [metadata.userAId, metadata.userBId];
  const users = await User.find({
    _id: { $in: userIds }
  });

  // OPTIMIZATION: Prepare bulk write operations
  const bulkOps: any[] = [];

  for (const user of users) {
    if (!user) continue;

    /* =========================
       DAILY TRUST RESET
    ========================= */
    const today = new Date();
    const lastReset = user.lastTrustReset || new Date(0);
    
    const isNewDay =
      today.toDateString() !== lastReset.toDateString();

    if (isNewDay) {
      user.dailyTrustGained = 0;
      user.lastTrustReset = today;
    }

    /* =========================
       TRUST REWARD
    ========================= */
    if (isTrustEligible) {
      const reward = 8;
      const maxDaily = 40;

      if (user.dailyTrustGained < maxDaily) {
        const allowedReward = Math.min(
          reward,
          maxDaily - user.dailyTrustGained
        );

        user.trustScore += allowedReward;
        user.dailyTrustGained += allowedReward;
      }
    }

    /* =========================
       QUALITY REWARD
    ========================= */
    if (isQualityConversation) {
      user.weeklyConversations = (user.weeklyConversations || 0) + 1;
      user.totalQualityConversations =
        (user.totalQualityConversations || 0) + 1;
      user.conversationCount =
        (user.conversationCount || 0) + 1;

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const lastDate = user.lastQualityDate;

      if (!lastDate) {
        user.qualityStreak = 1;
      } else {
        const isYesterday =
          lastDate.toDateString() ===
          yesterday.toDateString();

        const isToday =
          lastDate.toDateString() ===
          today.toDateString();

        if (isYesterday) {
          user.qualityStreak += 1;
        } else if (!isToday) {
          user.qualityStreak = 1;
        }
      }

      user.lastQualityDate = today;
    }

    // Clamp trust with max 2000
    user.trustScore = Math.min(
      2000,
      Math.max(0, user.trustScore)
    );

    // 🔥 AUTO-UPDATE TIER BASED ON TRUST SCORE
    const currentTier = user.tier;
    const newTier = getTier(user.trustScore);
    if (currentTier !== newTier) {
      user.tier = newTier;
    }

    // OPTIMIZATION: Use individual saves for now
    await user.save();
  }
}

// 🔥 TIER MAPPING FUNCTION (shared across services)
function getTier(score: number): string {
  if (score >= 1200) return "Main Character";
  if (score >= 700) return "Lowkey Icon";
  if (score >= 300) return "Actually Chill";
  return "Unhinged";
}

/* ================================
   SOCKET HANDLERS
================================ */
interface StartSearchPayload {
  gender: string;
  preference: string;
  intent: string;
}

export const registerChatSockets = (
  io: Server,
  socket: Socket,
  connectedUsers: Map<string, Socket>
) => {
  const userId = socket.data.userId as string;

  // Register this socket in connected users map
  connectedUsers.set(userId, socket);

  /* ================================
     🔥 THREAD / DISCUSSION SOCKETS (ALIVE SYSTEM)
  ================================= */
  // Join thread (post discussion)
  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const count = clients ? clients.size : 0;

    io.to(roomId).emit("room_users", count);
  });

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
  });

  // Inbox connection chat
  socket.on("join-connection-chat", async ({ connectionId }: { connectionId: string }) => {
    try {
      socket.join(connectionId);
      activeRooms.set(userId, connectionId);

      const connection = await Connection.findById(connectionId);
      if (connection) {
        // Populate metadata so send-message knows who is who
        conversationMetadata.set(connectionId, {
          userAId: connection.userAId.toString(),
          userBId: connection.userBId.toString(),
          messageCountA: 0,
          messageCountB: 0,
          startedAt: Date.now(),
          conversationStart: Date.now(),
          lastActivity: Date.now(),
          mutualLike: true,
          likedByA: true,
          likedByB: true,
          reports: 0,
          processing: false
        });

        // Mark this room as a connection-room for ai logic
        roomConnectionMap.set(connectionId, connectionId);

        // Fetch history
        const history = await Message.find({ connectionId })
          .sort({ createdAt: 1 })
          .limit(50);
        
        socket.emit("chat-history", history.map(m => ({
          messageId: m.messageId,
          text: m.text,
          timestamp: m.createdAt.getTime(),
          senderId: m.senderId.toString(),
          reactions: m.reactions || []
        })));
      }
    } catch (err) {
      console.error("Join connection error:", err);
    }
  });

  // Leave thread
  socket.on("leave_room", (roomId: string) => {
    socket.leave(roomId);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const count = clients ? clients.size : 0;

    io.to(roomId).emit("room_users", count);
  });

  // Typing indicator
  socket.on("typing", (roomId: string) => {
    socket.to(roomId).emit("user_typing");
  });

  // Stop typing
  socket.on("stop_typing", (roomId: string) => {
    socket.to(roomId).emit("user_stop_typing");
  });

  // Handle disconnect from thread rooms
  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId: string) => {
      // Ignore private room (socket.id)
      if (roomId === socket.id) return;

      const clients = io.sockets.adapter.rooms.get(roomId);
      const count = clients ? clients.size - 1 : 0;

      io.to(roomId).emit("room_users", count);
    });
  });

  // =========================
  // SPAM PROTECTION TRACKERS
  // =========================
  const messageTimestamps: number[] = [];
  let lastSearchTime = 0;
  let lastSkipTime = 0;
  let spamStrikeCount = 0;
  let lastSpamTime = 0;
  let lastStrikeResetTime = Date.now();

  // =========================
  // START SEARCH
  // =========================
  socket.on("start-search", async (payload: StartSearchPayload) => {

    // =========================
    // ALREADY IN ROOM PROTECTION
    // =========================
    if (activeRooms.has(userId)) {
      return;
    }

    // =========================
    // SEARCH COOLDOWN PROTECTION
    // =========================
    const now = Date.now();

    if (now - lastSearchTime < 3000) {
      socket.emit("search-cooldown", {
        message: "Please wait before starting another search.",
      });
      return;
    }

    lastSearchTime = now;

    const { gender, preference, intent } = payload;

    if (!gender || !preference || !intent) return;

    // =========================
    // FETCH USER FIRST
    // =========================
    const user = await User.findById(userId);

    if (!user) return;

    // Throttle activity updates (only update if >5 minutes since last update)
    const nowDate = new Date();
    let userUpdated = false;
    if (!user.lastActiveAt || nowDate.getTime() - user.lastActiveAt.getTime() > 5 * 60 * 1000) {
      user.lastActiveAt = nowDate;
      userUpdated = true;
    }

    if (!user.onboardingComplete) {
      user.onboardingComplete = true;
      userUpdated = true;
    }

    if (userUpdated) {
      await user.save();
    }

    // =========================
    // SHADOW CHECK
    // =========================
    if (user.isShadowIsolated) {

      socket.emit("shadow-status", {
        trustScore: user.trustScore,
        violationScore: user.violationScore,
        shadowSince: user.shadowSince,
      });

      return;
    }

    // =========================
    // ADD TO MATCHING QUEUE
    // =========================
    await matchingService.add({
      userId,
      gender,
      preference,
      intent,
      joinedAt: Date.now(),
    });

    // Broadcast updated counts to all searching students
    const counts = matchingService.getCounts();
    io.emit("online-counts", counts);

    // =========================
    // TRY MATCH
    // =========================
    const match = await matchingService.tryMatch();

    if (match) {

      const roomId = `room-${uuidv4()}`;

      activeRooms.set(match.userAId, roomId);
      activeRooms.set(match.userBId, roomId);

      logEvent("match_created", {
        userId: match.userAId,
        roomId,
      }).catch(() => {});

      logEvent("match_created", {
        userId: match.userBId,
        roomId,
      }).catch(() => {});

      const socketA = connectedUsers.get(match.userAId);
      const socketB = connectedUsers.get(match.userBId);

      if (!socketA || !socketB) return;

      const userA = await User.findById(match.userAId);
      const userB = await User.findById(match.userBId);

      if (!userA || !userB) return;

      // =========================
      // GENERATE SESSION ALIASES
      // =========================
      const aliasASees = `Stranger ${Math.floor(100 + Math.random() * 900)}`;
      const aliasBSees = `Stranger ${Math.floor(100 + Math.random() * 900)}`;

      socketA.join(roomId);
      socketB.join(roomId);

      // Initialize conversation metadata
      conversationMetadata.set(roomId, {
        startedAt: Date.now(),
        messageCountA: 0,
        messageCountB: 0,
        mutualLike: false,
        likedByA: false,
        likedByB: false,
        reports: 0,
        userAId: match.userAId,
        userBId: match.userBId,
        conversationStart: Date.now(),
        lastActivity: Date.now(),
        processing: false, // ADDED
      });

      logEvent("conversation_started", {
        roomId,
      }).catch(() => {});

      // 🔥 SEND TIER IN MATCH-FOUND
      socketA.emit("match-found", {
        roomId,
        partner: {
          alias: aliasASees,
          tier: userB.tier, // ✅ TIER VISIBLE
        }
      });

      socketB.emit("match-found", {
        roomId,
        partner: {
          alias: aliasBSees,
          tier: userA.tier, // ✅ TIER VISIBLE
        }
      });
    }
  });

  // =========================
  // SEND MESSAGE ✅ INTEGRATED
  // =========================
  socket.on("send-message", async (payload: { text: string; replyTo?: any }) => {

    // =========================
    // EMPTY MESSAGE PROTECTION
    // =========================
    if (!payload.text || !payload.text.trim()) return;

    // =========================
    // MESSAGE SPAM PROTECTION
    // =========================
    const now = Date.now();

    if (now - lastStrikeResetTime > 10 * 60 * 1000) {
      spamStrikeCount = 0;
      lastStrikeResetTime = now;
    }

    while (messageTimestamps.length && now - messageTimestamps[0] > 10000) {
      messageTimestamps.shift();
    }

    if (messageTimestamps.length >= 20) {

      socket.emit("spam-warning", {
        message: "You're sending messages too fast. Slow down.",
      });

      if (now - lastSpamTime < 5 * 60 * 1000) {
        spamStrikeCount += 1;
      } else {
        spamStrikeCount = 1;
      }

      lastSpamTime = now;

      const user = await User.findById(userId);

      if (user) {

        if (spamStrikeCount === 2) user.trustScore -= 5;
        if (spamStrikeCount === 3) user.trustScore -= 10;
        if (spamStrikeCount >= 4) user.violationScore += 1;

        user.trustScore = Math.max(0, user.trustScore);

        await user.save();
      }

      return;
    }

    messageTimestamps.push(now);

    // ✅ 1. TRUST UPDATE FOR SENDING MESSAGE
    await updateTrust(userId, 1);

    // =========================
    // PROCESS MESSAGE
    // =========================
    const roomId = activeRooms.get(userId);
    if (!roomId) return;

    const metadata = conversationMetadata.get(roomId);

    if (metadata) {

      if (userId === metadata.userAId) {
        metadata.messageCountA += 1;
      } else if (userId === metadata.userBId) {
        metadata.messageCountB += 1;
      }

      metadata.lastActivity = now;
    }

    const messageId = uuidv4();
    const timestamp = Date.now();

    const messageData = {
      messageId,
      senderId: userId,
      text: payload.text,
      timestamp,
      replyTo: payload.replyTo || null,
      reactions: [],
    };

    // =========================
    // MESSAGE PERSISTENCE
    // =========================
    try {

      if (metadata) {
        const connectionId = roomConnectionMap.get(roomId);

        // Save message (always, even if no connectionId yet)
        await saveMessage(
          connectionId || null,
          userId,
          payload.text,
          messageId,
          roomId
        );

        if (connectionId) {
          // Identify partner
          const partnerId =
            userId === metadata.userAId
              ? metadata.userBId
              : metadata.userAId;

          // SPECIAL: AI Response
          if (partnerId === SYSTEM_AI_ID) {
            console.log(`[AI Chat] Triggered for user ${userId} in room ${roomId}`);
            setImmediate(async () => {
              try {
                const history = await Message.find({ connectionId })
                  .sort({ createdAt: -1 })
                  .limit(10)
                  .lean();

                const aiMessages = history.reverse().map((m: any) => ({
                  role: m.senderId.toString() === SYSTEM_AI_ID ? "assistant" : "user" as any,
                  content: m.text,
                }));

                const aiReply = await generateAIResponse(aiMessages);
                const aiMsgId = uuidv4();
                
                await saveMessage(connectionId, SYSTEM_AI_ID, aiReply, aiMsgId);

                io.to(roomId).emit("receive-message", {
                  messageId: aiMsgId,
                  senderId: SYSTEM_AI_ID,
                  text: aiReply,
                  timestamp: Date.now(),
                  replyTo: null,
                  reactions: [],
                });
              } catch (err) {
                console.error("[AI Chat] Error:", err);
              }
            });
          }

          // ✅ 2. TRUST UPDATE FOR PARTNER RECEIVING MESSAGE (OPTIONAL)
          if (partnerId !== SYSTEM_AI_ID) {
            await updateTrust(partnerId, 2);

            // Create notification
            await createNotification(
              partnerId,
              "message",
              connectionId
            );
          }
        }
      }

    } catch (err) {

      console.error("Message persistence error:", err);

    }

    // =========================
    // EMIT MESSAGE (zero latency)
    // =========================
    io.to(roomId).emit("receive-message", messageData);

    // =========================
    // AI INSIGHTS (async, non-blocking)
    // =========================
    setImmediate(async () => {
      try {
        let connectionId = metadata ? roomConnectionMap.get(roomId) : null;
        
        // RESTART-SAFE: If not in memory map, lookup in DB
        if (!connectionId && metadata) {
          const { userAId, userBId } = normalizeUserIds(metadata.userAId, metadata.userBId);
          const existing = await Connection.findOne({ userAId, userBId });
          if (existing) {
            connectionId = existing._id.toString();
            roomConnectionMap.set(roomId, connectionId);
          }
        }

        // Fetch last 5 messages for this room (works for both matches and connections)
        // If it's a permanent connection, we query by connectionId
        // If it's a temporary match, we query by roomId
        const recentMessages = await Message.find(connectionId ? { connectionId } : { roomId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        if (recentMessages.length < 2) return; // Need at least some talk to analyze

        const texts = recentMessages
          .reverse()
          .map((m: any) => m.text || "");

        console.log(`[AI] Generating insights for room ${roomId} (${texts.length} msgs)...`);
        const insights = await generateChatInsights(texts);
        console.log(`[AI] Done: ${insights.vibe}, summary: ${insights.aiSummary}`);

        // Only update if we got meaningful data
        if (insights.aiSummary || insights.vibe || insights.replySuggestions.length > 0) {
          const hoursLeft = metadata
            ? undefined
            : null;

          await Connection.findByIdAndUpdate(connectionId, {
            aiSummary: insights.aiSummary,
            vibe: insights.vibe,
            replySuggestions: insights.replySuggestions,
            recommendExtend: insights.recommendExtend,
            lastMessagePreview: payload.text.slice(0, 120),
            lastMessageAt: new Date(),
          });

          // Emit connection-updated to both participants
          const userASocketId = metadata?.userAId;
          const userBSocketId = metadata?.userBId;

          const updatePayload = {
            connectionId,
            aiSummary: insights.aiSummary,
            vibe: insights.vibe,
            replySuggestions: insights.replySuggestions,
            recommendExtend: insights.recommendExtend,
            lastMessage: payload.text,
            lastMessageAt: new Date().toISOString(),
          };

          if (userASocketId) {
            connectedUsers.get(userASocketId)?.emit("connection-updated", updatePayload);
          }
          if (userBSocketId) {
            connectedUsers.get(userBSocketId)?.emit("connection-updated", updatePayload);
          }
        }
      } catch (aiErr) {
        // Silent failure — AI must never break chat
        console.warn("[AI] Post-message insights failed:", (aiErr as Error).message);
      }
    });

  });

  // 🔥 NEW EVENT: SEND DM REQUEST (TIER-GATED)
  socket.on("send-dm-request", async (targetUserId: string) => {
    // Check sender DM eligibility
    const result = await canSendDM(userId);

    if (!result.allowed) {
      socket.emit("dm-error", { message: result.reason });
      return;
    }

    // Check receiver eligibility (Unhinged can't receive)
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || targetUser.tier === "Unhinged") {
      socket.emit("dm-error", {
        message: "User not available for requests",
      });
      return;
    }

    // Increment sender's DM usage
    await incrementDM(userId);

    // Notify receiver
    const targetSocket = connectedUsers.get(targetUserId);

    if (targetSocket) {
      targetSocket.emit("dm-request", {
        fromUserId: userId,
        tier: targetUser.tier, // ✅ SEND TIER INFO
      });
    }

    socket.emit("dm-request-sent");
  });

  // 🔥 NEW EVENT: ACCEPT DM REQUEST
  socket.on("accept-dm-request", async (fromUserId: string) => {
    try {
      const userAId = userId;
      const userBId = fromUserId;

      // prevent duplicate connections
      const existing = await Connection.findOne({
        participants: { $all: [userAId, userBId] },
      });

      if (existing) {
        socket.emit("dm-error", { message: "Already connected" });
        return;
      }

      const connection = await Connection.create({
        userAId,
        userBId,
        participants: [userAId, userBId],
        locked: true,
        createdAt: new Date(),
      });

      // notify both users
      const fromSocket = connectedUsers.get(fromUserId);

      socket.emit("dm-accepted", {
        connectionId: connection._id,
        userId: fromUserId,
      });

      if (fromSocket) {
        fromSocket.emit("dm-accepted", {
          connectionId: connection._id,
          userId: userAId,
        });
      }

    } catch (err) {
      console.error(err);
      socket.emit("dm-error", { message: "Failed to accept request" });
    }
  });

  // 🔥 NEW EVENT: REJECT DM REQUEST
  socket.on("reject-dm-request", (fromUserId: string) => {
    const fromSocket = connectedUsers.get(fromUserId);

    if (fromSocket) {
      fromSocket.emit("dm-rejected");
    }
  });

  // =========================
  // CANCEL SEARCH
  // =========================
  socket.on("cancel-search", () => {
    matchingService.remove(userId);
    io.emit("online-counts", matchingService.getCounts());
  });

  // =========================
  // MUTUAL LIKE TRACKING (RACE-SAFE WITH NORMALIZED IDS) ✅ INTEGRATED
  // =========================
  socket.on("like-partner", async () => {
    const roomId = activeRooms.get(userId);
    if (!roomId) return;

    const metadata = conversationMetadata.get(roomId);
    if (!metadata) return;

    // Track which user liked
    if (userId === metadata.userAId) {
      metadata.likedByA = true;
    } else if (userId === metadata.userBId) {
      metadata.likedByB = true;
    }

    // Check if mutual like
    if (metadata.likedByA && metadata.likedByB) {
      metadata.mutualLike = true;
      
      // ✅ 3. TRUST REWARDS FOR MUTUAL LIKE
      await updateTrust(metadata.userAId, 10);
      await updateTrust(metadata.userBId, 10);
      
      // IMMEDIATELY CREATE CONNECTION (before chat ends)
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      try {
        // RACE CONDITION FIX: Normalize user IDs
        const { userAId, userBId } = normalizeUserIds(metadata.userAId, metadata.userBId);

        // Unique index will prevent duplicates - no need to check
        await Connection.create({
          userAId,
          userBId,
          participants: [userAId, userBId],
          expiresAt,
          locked: true
        });

        logEvent("connection_created", {
          metadata: {
            userAId: metadata.userAId,
            userBId: metadata.userBId,
            reason: metadata.mutualLike
              ? "mutual_like"
              : "quality_conversation"
          }
        });

      } catch (error: any) {
        // Duplicate key error is expected and safe - ignore it
        if (error.code !== 11000) {
          console.error("Error creating immediate connection:", error);
        }
      }
      
      // Notify both users
      io.to(roomId).emit("mutual-like-confirmed");
    }
  });

  // =========================
  // REPORT HANDLER ✅ INTEGRATED
  // =========================
  socket.on("report-partner", async (payload: { category: string }) => {
    const roomId = activeRooms.get(userId);
    if (!roomId) return;

    const metadata = conversationMetadata.get(roomId);
    if (!metadata) return;

    // Increment report count
    metadata.reports += 1;

    // Determine reported user
    const reportedUserId = userId === metadata.userAId 
      ? metadata.userBId 
      : metadata.userAId;

    // Log analytics
    logEvent("report_submitted", {
      userId: reportedUserId,
      metadata: { category: payload.category },
    }).catch(() => {});

    // ✅ 4. USE SERVICE FOR TRUST PENALTY
    await updateTrust(reportedUserId, -15);

    // Fetch reported user for additional updates
    const reportedUser = await User.findById(reportedUserId);
    if (reportedUser) {
      // Keep other fields that updateTrust might not handle
      reportedUser.reportCount += 1;
      
      // Auto-shadow isolation when violation threshold crossed
      if (reportedUser.violationScore >= 5 && !reportedUser.isShadowIsolated) {
        reportedUser.isShadowIsolated = true;
        reportedUser.shadowSince = new Date();

        logEvent("shadow_triggered", {
          userId: reportedUser._id.toString(),
        }).catch(() => {});
      }
      
      await reportedUser.save();
    }
  });

  // =========================
  // SKIP CHAT
  // =========================
  socket.on("skip-chat", async () => {

    // =========================
    // SKIP COOLDOWN PROTECTION
    // =========================
    const now = Date.now();

    if (now - lastSkipTime < 3000) {
      socket.emit("skip-cooldown", {
        message: "Please wait before skipping again.",
      });
      return;
    }

    lastSkipTime = now;

    const roomId = activeRooms.get(userId);
    if (!roomId) return;

    // =========================
    // UPDATE SKIP COUNT
    // =========================
    const user = await User.findById(userId);
    if (user) {
      user.skipCount += 1;
      await user.save();
    }

    // DETERMINISTIC CLEANUP: Use metadata instead of fetchSockets
    const metadata = conversationMetadata.get(roomId);
    if (metadata) {
      activeRooms.delete(metadata.userAId);
      activeRooms.delete(metadata.userBId);
    }

    // =========================
    // PROCESS CONVERSATION END (TRUST + QUALITY REWARDS + CONNECTION)
    // =========================
    await processConversationEnd(roomId);

    // =========================
    // NOTIFY AND CLEANUP
    // =========================
    io.to(roomId).emit("partner-left");

    // Clean up sockets (best effort)
    try {
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach(s => s.leave(roomId));
    } catch (error) {
      console.error("Error cleaning up sockets:", error);
    }
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", async () => {
    // Remove from connected users map
    connectedUsers.delete(userId);

    matchingService.remove(userId);
    io.emit("online-counts", matchingService.getCounts());

    const roomId = activeRooms.get(userId);
    if (!roomId) return;

    // DETERMINISTIC CLEANUP: Use metadata instead of fetchSockets
    const metadata = conversationMetadata.get(roomId);
    if (metadata) {
      activeRooms.delete(metadata.userAId);
      activeRooms.delete(metadata.userBId);
    }

    // =========================
    // PROCESS CONVERSATION END (TRUST + QUALITY REWARDS + CONNECTION)
    // =========================
    await processConversationEnd(roomId);

    // =========================
    // NOTIFY AND CLEANUP
    // =========================
    io.to(roomId).emit("partner-left");

    // Clean up sockets (best effort)
    try {
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach(s => s.leave(roomId));
    } catch (error) {
      console.error("Error cleaning up sockets:", error);
    }
  });
};
