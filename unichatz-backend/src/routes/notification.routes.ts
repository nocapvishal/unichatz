import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getNotifications } from "../services/notification.service";

const router = Router();

router.get("/", authMiddleware, async (req: any, res) => {

  try {

    const notifications = await getNotifications(req.user._id);

    res.json(notifications);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});

export default router;