import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["message", "comment", "connection"],
      required: true
    },

    referenceId: {
      type: String
    },

    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Notification", NotificationSchema);