import { Router } from "express";
import User from "../models/User.model";

const router = Router();

router.get("/", async (req, res) => {

  try {

    const users = await User.find()
      .sort({ engagementScore: -1 })
      .limit(20)
      .select("alias engagementScore");

    res.json(users);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});

export default router;