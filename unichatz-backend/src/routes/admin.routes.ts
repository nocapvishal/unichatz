import { Router } from "express";
import User from "../models/User.model";
import Analytics from "../models/Analytics.model";
import { adminAuth } from "../middleware/admin.middleware";

const router = Router();

/* ================================
   GET ADMIN STATS
================================ */

router.get("/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const activeUsers = await User.countDocuments({
      lastActiveAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const shadowedUsers = await User.countDocuments({
      isShadowIsolated: true,
    });

    const matchesLast24h = await Analytics.countDocuments({
      type: "match_created",
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const conversations = await Analytics.find({
      type: "conversation_ended",
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const avgConversationDuration =
      conversations.length > 0
        ? conversations.reduce(
            (sum, c) => sum + (c.metadata?.duration || 0),
            0
          ) / conversations.length
        : 0;

    res.json({
      totalUsers,
      activeUsers,
      shadowedUsers,
      matchesLast24h,
      avgConversationDurationMs: Math.round(avgConversationDuration),
    });
  } catch (err) {
    res.status(500).json({ message: "Stats fetch failed" });
  }
});

/* ================================
   GET RECENT REPORTS
================================ */

router.get("/reports", adminAuth, async (req, res) => {
  try {
    const reports = await Analytics.find({
      type: "report_submitted",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Report fetch failed" });
  }
});

/* ================================
   SHADOW USER
================================ */

router.post("/shadow/:userId", adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isShadowIsolated = true;
    user.shadowSince = new Date();

    await user.save();

    res.json({ message: "User shadowed" });
  } catch (err) {
    res.status(500).json({ message: "Shadow failed" });
  }
});

/* ================================
   UNSHADOW USER
================================ */

router.post("/unshadow/:userId", adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isShadowIsolated = false;
    user.shadowSince = null;

    await user.save();

    res.json({ message: "User unshadowed" });
  } catch (err) {
    res.status(500).json({ message: "Unshadow failed" });
  }
});


/* ================================
   BAN USER (PERMANENT)
================================ */

router.post("/ban/:userId", adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBanned = true;
    user.isShadowIsolated = true;
    user.shadowSince = new Date();

    await user.save();

    res.json({ message: "User permanently banned" });
  } catch (err) {
    res.status(500).json({ message: "Ban failed" });
  }
});


router.get("/trends", adminAuth, async (_req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const matchTrend = await Analytics.aggregate([
      {
        $match: {
          type: "MATCH_CREATED",
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const reportTrend = await Analytics.aggregate([
      {
        $match: {
          type: "USER_REPORTED",
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      matchTrend,
      reportTrend
    });

  } catch (err) {
    res.status(500).json({ message: "Trend fetch failed" });
  }
});


router.get("/dashboard", async (_req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      shadowUsers,
      avgTrustAgg,
      avgBehaviorAgg,
      matches7d,
      conversations7d,
      reports7d,
      shadowTriggers7d,
      avgDurationAgg
    ] = await Promise.all([

      // User metrics
      User.countDocuments(),
      User.countDocuments({ lastActiveAt: { $gte: oneDayAgo } }),
      User.countDocuments({ isShadowIsolated: true }),

      User.aggregate([
        { $group: { _id: null, avg: { $avg: "$trustScore" } } }
      ]),

      User.aggregate([
        { $group: { _id: null, avg: { $avg: "$behaviorScore" } } }
      ]),

      // Match metrics
      Analytics.countDocuments({
        type: "match_created",
        createdAt: { $gte: sevenDaysAgo }
      }),

      Analytics.countDocuments({
        type: "conversation_started",
        createdAt: { $gte: sevenDaysAgo }
      }),

      Analytics.countDocuments({
        type: "report_submitted",
        createdAt: { $gte: sevenDaysAgo }
      }),

      Analytics.countDocuments({
        type: "shadow_triggered",
        createdAt: { $gte: sevenDaysAgo }
      }),

      Analytics.aggregate([
        {
          $match: {
            type: "conversation_ended",
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$metadata.duration" }
          }
        }
      ])
    ]);

    const avgTrust = avgTrustAgg[0]?.avg || 0;
    const avgBehavior = avgBehaviorAgg[0]?.avg || 0;
    const avgConversationDuration = avgDurationAgg[0]?.avgDuration || 0;

    const matchSuccessRate =
      matches7d > 0
        ? (conversations7d / matches7d) * 100
        : 0;

    res.json({
      users: {
        total: totalUsers,
        active24h: activeUsers,
        shadowed: shadowUsers,
        avgTrust,
        avgBehavior
      },
      matches: {
        matches7d,
        conversations7d,
        matchSuccessRate
      },
      moderation: {
        reports7d,
        shadowTriggers7d
      },
      quality: {
        avgConversationDurationMs: avgConversationDuration
      }
    });

  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
});


export default router;