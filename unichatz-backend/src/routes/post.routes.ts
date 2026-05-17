import express from "express";
import * as postController from "../controllers/post.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/", authMiddleware, postController.createPost);

router.get("/feed", authMiddleware, postController.getFeed);

export default router;