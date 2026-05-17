import express from "express";
import Connection from "../models/Connection.model";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();


// GET ACTIVE CONNECTION COUNT
router.get("/count", authMiddleware, async (req: any, res) => {

  try {

    const userId = req.user._id.toString();

    const connections = await Connection.find({
      participants: userId
    });

    if (!connections.length) {
      return res.json({
        count: 0,
        hoursLeft: 0
      });
    }

    // find earliest expiry
    const nearestExpiry = connections
      .map(c => c.expiresAt.getTime())
      .sort((a, b) => a - b)[0];

    const hoursLeft = Math.max(
      0,
      Math.floor((nearestExpiry - Date.now()) / (1000 * 60 * 60))
    );

    res.json({
      count: connections.length,
      hoursLeft
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }

});



/*
CREATE CONNECTION
Used when 2 users match
*/
router.post("/request", authMiddleware, async (req: any, res) => {

  try {

    const { targetUserId } = req.body;

    const userAId = req.user._id.toString();
    const userBId = targetUserId.toString();

    // normalize order for unique index
    const [a, b] = [userAId, userBId].sort();

    const connection = await Connection.create({

      userAId: a,
      userBId: b,

      participants: [a, b],

      expiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ),

      locked: true

    });

    res.json(connection);

  } catch (err: any) {

    // prevent duplicate connection error crash
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Connection already exists"
      });
    }

    console.error(err);
    res.status(500).json({
      message: "Server error"
    });

  }

});


export default router;