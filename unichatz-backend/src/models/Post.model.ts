import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    authorAlias: {
      type: String,
      required: true
    },

    text: {
      type: String,
      required: true,
      maxlength: 500
    },

    upvotes: {
      type: Number,
      default: 0
    },

    downvotes: {
      type: Number,
      default: 0
    },

    commentsCount: {
      type: Number,
      default: 0
    },

    views: {
      type: Number,
      default: 0
    },

    score: {
      type: Number,
      default: 0
    },

    hotScore: {
      type: Number,
      default: 0,
      index: true
    }

  },
  {
    timestamps: true
  }
);

PostSchema.index({ hotScore: -1, createdAt: -1 });

export default mongoose.model("Post", PostSchema);