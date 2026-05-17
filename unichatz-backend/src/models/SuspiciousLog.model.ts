import mongoose, { Schema, Document } from "mongoose";

export interface ISuspiciousLog extends Document {
  userId?: mongoose.Types.ObjectId;
  ip: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: any;
  createdAt: Date;
}

const SuspiciousLogSchema = new Schema<ISuspiciousLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SuspiciousLogSchema.index({ createdAt: -1 });

export default mongoose.models.SuspiciousLog ||
  mongoose.model<ISuspiciousLog>("SuspiciousLog", SuspiciousLogSchema);