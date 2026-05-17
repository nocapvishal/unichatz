import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["post", "comment", "vote", "join"],
    required: true
  },

  alias: String,

  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  }

}, { timestamps: true });

export default mongoose.model("Activity", ActivitySchema);