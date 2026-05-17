import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  /* =========================
     AUTH
  ========================== */
  email: string;
  passwordHash: string;
  isVerified: boolean;
  onboardingComplete: boolean;
  notificationConsent: boolean;
  university: string;
alias: string;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;

  // 🔁 Refresh Token Rotation (Step 5)
  refreshToken: string | null;

  // 🔒 Brute force protection
  loginAttempts: number;
  lockUntil: Date | null;

  gender: "male" | "female" | "other";
  genderLocked: boolean;

  genderChangeRequest: {
    requested: boolean;
    reason: string | null;
    requestedAt: Date | null;
  };

  /* =========================
     TRUST ECONOMY
  ========================== */
  trustScore: number;
  tier:
  | "Unhinged"
  | "Actually Chill"
  | "Lowkey Icon"
  | "Main Character";
  dailyTrustGained: number;
  lastTrustReset: Date;

  /* =========================
     BEHAVIOR METRICS
  ========================== */
  violationScore: number;
  reportCount: number;
  skipCount: number;
  conversationCount: number;
  lastViolationDecay: Date | null;
  behaviorScore: number;
respectScore: number;
stabilityScore: number;
engagementScore: number;




dailyDmCount?: number;
lastDmReset?: Date;

  /* =========================
   RETENTION SYSTEM
========================= */

qualityStreak: number;
lastQualityDate: Date | null;
totalQualityConversations: number;

  /* =========================
     RELATIONSHIPS
  ========================== */
  blockList: mongoose.Types.ObjectId[];
  mutualLikes: mongoose.Types.ObjectId[];

  /* =========================
     SHADOW SYSTEM
  ========================== */
  isShadowIsolated: boolean;
  shadowSince: Date | null;
  softPenaltyLevel: number;

  /* =========================
   WEEKLY MOMENTUM SYSTEM
========================= */

weeklyMomentum: number;
weeklyConversations: number;
lastWeeklyReset: Date;

  /* =========================
     BAN SYSTEM
  ========================== */
  isBanned: boolean;
  banReason: string | null;
  bannedAt: Date | null;

  /* =========================
     ACTIVITY
  ========================== */
  lastActiveAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    /* =========================
       AUTH
    ========================== */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    onboardingComplete: {
      type: Boolean,
      default: false,
    },

    notificationConsent: {
      type: Boolean,
      default: false,
    },

    university: {
      type: String,
      required: true,
      index: true,
    },

    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },

    // 🔁 Refresh Token (hashed)
    refreshToken: {
      type: String,
      default: null,
      select: false, // 🔥 extra security (not returned by default)
    },

    // 🔒 Brute force protection
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },

    genderLocked: {
      type: Boolean,
      default: true,
    },

    genderChangeRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, default: null },
      requestedAt: { type: Date, default: null },
    },

    /* =========================
       TRUST ECONOMY
    ========================== */

    trustScore: {
      type: Number,
      default: 1000,
      min: 0,
      max: 2000,
      index: true,
    },

    tier: {
  type: String,
  enum: [
    "Unhinged",
    "Actually Chill",
    "Lowkey Icon",
    "Main Character",
  ],
  default: "Actually Chill",
  index: true,
},

    dailyTrustGained: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastTrustReset: {
      type: Date,
      default: Date.now,
    },

    /* =========================
       BEHAVIOR
    ========================== */

    violationScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    reportCount: {
      type: Number,
      default: 0,
    },

    skipCount: {
      type: Number,
      default: 0,
    },

    conversationCount: {
      type: Number,
      default: 0,
    },

    lastViolationDecay: {
      type: Date,
      default: null,
    },

    /* =========================
   RETENTION SYSTEM
========================= */

qualityStreak: {
  type: Number,
  default: 0,
},

lastQualityDate: {
  type: Date,
  default: null,
},

totalQualityConversations: {
  type: Number,
  default: 0,
},

    /* =========================
       RELATIONSHIPS
    ========================== */

    blockList: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    mutualLikes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* =========================
       SHADOW SYSTEM
    ========================== */

    isShadowIsolated: {
      type: Boolean,
      default: false,
      index: true,
    },

    shadowSince: {
      type: Date,
      default: null,
    },
   
    softPenaltyLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    /* =========================
       BAN SYSTEM
    ========================== */

    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },

    banReason: {
      type: String,
      default: null,
    },

    bannedAt: {
      type: Date,
      default: null,
    },


/* =========================
   WEEKLY MOMENTUM SYSTEM
========================= */

    weeklyMomentum: {
  type: Number,
  default: 0,
},

weeklyConversations: {
  type: Number,
  default: 0,
},

lastWeeklyReset: {
  type: Date,
  default: Date.now,
},
/* =========================
   BEHAVIOR
========================= */
behaviorScore: {
  type: Number,
  default: 50,
  min: 0,
  max: 100,
  index: true,
},

respectScore: {
  type: Number,
  default: 50,
},

stabilityScore: {
  type: Number,
  default: 50,
},


alias: {
  type: String,
  unique: true,
  default: () => "anon_" + Math.random().toString(36).substring(2, 8)
},

engagementScore: {
  type: Number,
  default: 50,
},

dailyDmCount: {
  type: Number,
  default: 0,
},

lastDmReset: {
  type: Date,
  default: Date.now,
},
    /* =========================
       ACTIVITY
    ========================== */

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

/* =========================
   MATCHMAKING INDEX
========================= */

UserSchema.index({
  university: 1,
  gender: 1,
  isShadowIsolated: 1,
  trustScore: 1,
});

/* =========================
   WEEKLY MOMENTUM SYSTEM
========================= */



/* =========================
   MODERATION INDEX
========================= */

UserSchema.index({
  isBanned: 1,
  violationScore: 1,
});

/* =========================
   REFRESH TOKEN INDEX
========================= */

UserSchema.index(
  { refreshToken: 1 },
  { sparse: true }
);

/* =========================
   MATCHMAKING OPTIMIZED INDEX
========================= */

UserSchema.index({
  university: 1,
  isBanned: 1,
  isShadowIsolated: 1,
  gender: 1,
  trustScore: -1,
  lastActiveAt: -1,
});

/* =========================
   STREAK OPTIMIZATION INDEX
========================= */

UserSchema.index({
  qualityStreak: -1,
  lastQualityDate: -1,
});


/* =========================
   AUTO TIER SYSTEM
========================= */

UserSchema.pre("save", function (this: IUser) {

  if (this.trustScore == null) this.trustScore = 1000;
  if (this.behaviorScore == null) this.behaviorScore = 50;

  if (this.trustScore < 0) this.trustScore = 0;

  const normalizedBehavior = this.behaviorScore * 10;

  const effectiveScore =
    this.trustScore * 0.7 +
    normalizedBehavior * 0.3;

  if (effectiveScore >= 1400)
    this.tier = "Main Character";
  else if (effectiveScore >= 1150)
    this.tier = "Lowkey Icon";
  else if (effectiveScore >= 900)
    this.tier = "Actually Chill";
  else
    this.tier = "Unhinged";
});

/* =========================
   SAFE EXPORT (DEV FIX)
========================= */

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);