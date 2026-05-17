import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  parentCommentId?: mongoose.Types.ObjectId | null;

  author: mongoose.Types.ObjectId;
  alias: string;

  text: string;

  likes: number;

  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      index: true,
      required: true,
    },

    // Reddit-style threaded replies
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    alias: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      maxlength: 300,
      required: true,
    },

    likes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/*
Important indexes for performance
*/

CommentSchema.index({ postId: 1, createdAt: 1 });
CommentSchema.index({ parentCommentId: 1 });

export default mongoose.model<IComment>("Comment", CommentSchema);