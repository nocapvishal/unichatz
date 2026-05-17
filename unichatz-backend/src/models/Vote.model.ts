import mongoose from "mongoose";

const VoteSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    value: {
      type: Number,
      enum: [1, -1],
      required: true
    }

  },
  { timestamps: true }
);

VoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Vote", VoteSchema);