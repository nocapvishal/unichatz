import Comment from "../models/Comment.model";
import Post from "../models/Post.model";
import { calculateHotScore } from "../utils/feedScore.util";

export async function createComment(
  user: any,
  postId: string,
  text: string,
  parentCommentId?: string
) {

  const comment = await Comment.create({
    postId,
    parentCommentId: parentCommentId || null,
    author: user._id,
    alias: user.alias,
    text
  });

  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { commentsCount: 1 } },
    { new: true }
  );

  if (post) {

    post.hotScore = calculateHotScore(
      post.upvotes,
      post.commentsCount,
      post.views,
      post.createdAt
    );

    await post.save();

  }

  return comment;

}

export async function getComments(postId: string) {

  const post = await Post.findById(postId).lean();

  const comments = await Comment.find({ postId })
    .sort({ createdAt: 1 })
    .lean();

  if (!post) return comments;

  const aliasMap = new Map<string, string>();
  let counter = 0;

  const formatted = comments.map((c: any) => {

    if (c.author?.toString() === post.authorId?.toString()) {
      return {
        ...c,
        authorLabel: "OP"
      };
    }

    if (!aliasMap.has(c.author?.toString())) {
      counter++;
      const letter = String.fromCharCode(64 + counter); // A,B,C
      aliasMap.set(c.author?.toString(), `Anon ${letter}`);
    }

    return {
      ...c,
      authorLabel: aliasMap.get(c.author?.toString())
    };

  });

  const tree = buildCommentTree(formatted);

  return Array.isArray(tree) ? tree : [];

}

/*
Reddit-style threaded comment builder
*/

function buildCommentTree(comments: any[]) {

  const map: any = {};
  const roots: any[] = [];

  comments.forEach((c) => {
    map[c._id] = { ...c, replies: [] };
  });

  comments.forEach((c) => {

    if (c.parentCommentId) {

      const parent = map[c.parentCommentId];

      if (parent) {
        parent.replies.push(map[c._id]);
      }

    } else {

      roots.push(map[c._id]);

    }

  });

  return roots;

}