import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  connectionId?: mongoose.Types.ObjectId;
  roomId?: string;
  senderId: mongoose.Types.ObjectId;
  text: string;
  messageId: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: "Connection",
      required: false,
      index: true,
    },
    roomId: {
      type: String,
      required: false,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ connectionId: 1, createdAt: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
