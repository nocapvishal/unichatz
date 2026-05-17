import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import Connection from "../models/Connection.model";

const router = Router();

// 🔥 GET USER CONNECTIONS
router.get("/my", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Find all connections where the user is a participant
    const connections = await Connection.find({
      participants: userId,
    })
    .sort({ createdAt: -1 }) // Newest first
    .limit(50); // Optional: prevent huge payloads

    return res.json(connections);
  } catch (err) {
    console.error("Error fetching connections:", err);
    return res.status(500).json({ message: "Failed to fetch connections" });
  }
});

export default router;
