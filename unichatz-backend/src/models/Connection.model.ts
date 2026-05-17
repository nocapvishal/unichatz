import mongoose, { Schema, Document } from "mongoose";

export interface IConnection extends Document {
  userAId: mongoose.Types.ObjectId;
  userBId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  expiresAt: Date;
  locked: boolean;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  // AI fields
  aiSummary?: string | null;
  vibe?: "warm" | "neutral" | "cold" | null;
  replySuggestions?: string[];
  recommendExtend?: boolean;
  createdAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    userAId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    userBId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true
    },

    expiresAt: {
      type: Date,
      required: true
    },

    locked: {
      type: Boolean,
      default: true
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    lastMessagePreview: {
      type: String,
      maxlength: 120
    },

    // =========================
    // AI INSIGHT FIELDS
    // =========================

    aiSummary: {
      type: String,
      default: null,
    },

    vibe: {
      type: String,
      enum: ["warm", "neutral", "cold", null],
      default: null,
    },

    replySuggestions: {
      type: [String],
      default: [],
    },

    recommendExtend: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true
  }
);

// TTL auto delete
ConnectionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent duplicate connections
ConnectionSchema.index({ userAId: 1, userBId: 1 }, { unique: true });

// Fast inbox lookup
ConnectionSchema.index({ participants: 1 });

export default mongoose.model<IConnection>("Connection", ConnectionSchema);