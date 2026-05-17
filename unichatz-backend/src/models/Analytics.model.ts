import mongoose, { Schema, Document } from "mongoose";

export interface IAnalytics extends Document {
  type: string;
  userId?: string;
  roomId?: string;
  metadata?: any;
  createdAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  type: { type: String, required: true },
  userId: { type: String },
  roomId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAnalytics>(
  "Analytics",
  AnalyticsSchema
);