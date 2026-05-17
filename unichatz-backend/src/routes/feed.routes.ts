import { Router } from "express";
import { createPost, getFeed } from "../services/feed.service";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/*
GET CAMPUS FEED
*/
router.get("/", authMiddleware, async (req: any, res) => {

  try {

    const { type } = req.query; // future: hot | new | top

    const posts = await getFeed(req.user, type);

    return res.json(posts);

  } catch (err) {

    console.error("Feed error:", err);
    return res.status(500).json({ message: "Server error" });

  }

});

/*
CREATE POST
*/
router.post("/", authMiddleware, async (req: any, res) => {

  try {

    const { text } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ message: "Post text required" });
    }

    const post = await createPost(req.user, text.trim());

    return res.status(201).json(post);

  } catch (err) {

    console.error("Create post error:", err);
    return res.status(500).json({ message: "Server error" });

  }

});

export default router;