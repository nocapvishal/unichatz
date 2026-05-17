import Vote from "../models/Vote.model";
import Post from "../models/Post.model";
import { calculateHotScore } from "../utils/feedScore.util";

export async function likePost(user: any, postId: string) {

  const existingVote = await Vote.findOne({
    userId: user._id,
    postId
  });

  if (!existingVote) {

    // 👍 Like the post
    await Vote.create({
      userId: user._id,
      postId,
      value: 1
    });

    await Post.findByIdAndUpdate(postId, {
      $inc: { upvotes: 1 }
    });

  } else {

    // 🔁 Unlike the post
    await Vote.deleteOne({ _id: existingVote._id });

    await Post.findByIdAndUpdate(postId, {
      $inc: { upvotes: -1 }
    });

  }

  // 🔥 Recalculate Hot Score
  const post = await Post.findById(postId);

  if (post) {

    post.hotScore = calculateHotScore(
      post.upvotes,
      post.commentsCount,
      post.views,
      post.createdAt
    );

    await post.save();

  }

}