import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    codeHash: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/* =========================
   INDEXES
========================= */

// One active OTP per email
OTPSchema.index({ email: 1 }, { unique: true });

// TTL auto-delete when expired
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP ||
  mongoose.model<IOTP>("OTP", OTPSchema);