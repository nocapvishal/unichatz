import { Request, Response } from "express";
import * as postService from "../services/post.service";

export const createPost = async (req: Request, res: Response) => {

  const user = req.user;

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Post text required" });
  }

  const post = await postService.createPost(user, text);

  res.json(post);
};


export const getFeed = async (req: Request, res: Response) => {

  const user = req.user;

  const feed = await postService.getFeed(user);

  res.json(feed);
};