import { Router } from "express";
import { likePost } from "../services/vote.service";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/:postId/like", authMiddleware, async (req: any, res) => {

  try {

    await likePost(req.user, req.params.postId);

    return res.json({ success: true });

  } catch (err) {

    console.error(err);
    return res.status(500).json({ message: "Server error" });

  }

});

export default router;