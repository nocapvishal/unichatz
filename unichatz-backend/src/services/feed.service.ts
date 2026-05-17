import Post from "../models/Post.model";
import { calculateHotScore } from "../utils/feedScore.util";

export async function createPost(user: any, text: string) {

  const post = await Post.create({
    authorId: user._id,
    authorAlias: user.alias,
    text,
    views: 0,
    commentsCount: 0,
    upvotes: 0,
    hotScore: calculateHotScore(0, 0, 0, new Date())
  });

  // Return in frontend-friendly format
  return {
    _id: post._id,
    alias: post.authorAlias,
    body: post.text,
    type: "text",
    tags: [],
    likes: 0,
    likedByMe: false,
    comments: 0,
    bookmarked: false,
    createdAt: post.createdAt,
    isHot: false,
    isPinned: false,
  };
}

export async function getFeed(user: any, type?: string) {

  let sort: any = { hotScore: -1 };

  if (type === "new") sort = { createdAt: -1 };
  if (type === "top") sort = { upvotes: -1 };

  const posts = await Post.find()
    .sort(sort)
    .limit(50)
    .lean();

  const postIds = posts.map((p) => p._id);

  // increase view count
  await Post.updateMany(
    { _id: { $in: postIds } },
    { $inc: { views: 1 } }
  );

  // Map to frontend-expected shape
  return posts.map((p: any) => ({
    _id: p._id,
    alias: p.authorAlias || "Anonymous",
    body: p.text || "",
    type: p.type || "text",
    tags: p.tags || [],
    dept: p.dept || null,
    likes: p.upvotes || 0,
    likedByMe: false, // TODO: check user vote
    comments: p.commentsCount || 0,
    bookmarked: false, // TODO: check user bookmarks
    images: p.images || [],
    poll: p.poll || null,
    createdAt: p.createdAt,
    isHot: (p.hotScore || 0) > 50,
    isPinned: p.isPinned || false,
  }));
}