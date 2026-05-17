import Post from "../models/post.model";
import { calculateFeedScore } from "../utils/feedScore.util";

export const createPost = async (user: any, text: string) => {

  const post = await Post.create({
    text,
    author: user._id,
    authorAlias: user.alias,
    university: user.university,
    trustScoreSnapshot: user.trustScore
  });

  return post;
};


export const getFeed = async (user: any) => {

  const posts = await Post.find({
    university: user.university
  }).limit(100);

  const ranked = posts
    .map(p => ({
      post: p,
      score: calculateFeedScore(p, user)
    }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.post);

  return ranked.slice(0, 30);
};