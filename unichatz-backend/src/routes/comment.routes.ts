import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { createComment, getComments } from "../services/comment.service";
import Post from "../models/Post.model";

const router = Router();

/*
CREATE COMMENT OR REPLY
*/
router.post("/", authMiddleware, async (req: any, res) => {

  try {

    const { postId, text, parentCommentId } = req.body;

    if (!postId || !text || text.trim().length < 1) {
      return res.status(400).json({ message: "Invalid comment" });
    }

    const comment = await createComment(
      req.user,
      postId,
      text.trim(),
      parentCommentId
    );

    return res.status(201).json(comment);

  } catch (err) {

    console.error(err);
    return res.status(500).json({ message: "Server error" });

  }

});

/*
GET COMMENTS FOR A POST
*/
router.get("/:postId", async (req, res) => {

  try {
         const posts = await Post.find().limit(5);
    console.log("🧠 POSTS:", posts);
    const comments = await getComments(req.params.postId);

    return res.json(comments);

  } catch (err: any) {

  console.error("🔥 COMMENT ERROR:", err);

  return res.status(500).json({
    message: "Server error",
    error: err?.message || "Unknown error"
  });

}


});

export default router;