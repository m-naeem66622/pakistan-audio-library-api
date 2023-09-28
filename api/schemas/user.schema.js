const mongoose = require("mongoose");

const blockedStatus = new mongoose.Schema(
  {
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    blockedCount: { type: Number, default: 0 },
    blockedFor: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const favouriteAudioBook = new mongoose.Schema(
  {
    audioBookId: {
      type: String,
      ref: "AudioBook",
      required: true,
    },
  },
  { timestamps: { createdAt: true, createdAt: "addedAt", updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, uppercase: true, trim: true },
    lastName: { type: String, required: true, uppercase: true, trim: true },
    username: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    password: { type: String, required: true, minLength: 8 },
    role: {
      type: String,
      required: true,
      uppercase: true,
      enum: ["LISTENER", "NARRATOR", "ADMIN"],
    },
    /* Storing favourite books ids as a map */
    favouriteAudioBooks: { type: Map, of: favouriteAudioBook, default: {} },
    isSuspended: { type: Boolean, default: false },
    blockedHistory: [blockedStatus],
    loginSession: { type: String, default: null },
    blockedStatus,
    isDeleted: { type: Boolean, default: false },
    /* Storing audio book IDs and listen times as a map 
    Number will be the time in seconds */
    listeningData: { type: Map, of: Number, default: {} }, // attention needed
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
