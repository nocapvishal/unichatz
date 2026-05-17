import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getMessages } from "../services/message.service";

const router = Router();

router.get("/:connectionId", authMiddleware, async (req: any, res) => {

  try {

    const { connectionId } = req.params;

    const messages = await getMessages(connectionId);

    return res.json(messages);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});

export default router;