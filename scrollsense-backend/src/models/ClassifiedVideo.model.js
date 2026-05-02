const mongoose = require('mongoose');

/**
 * Stores the result of classifying a videoId so it is never re-sent to Gemini.
 * Keyed by (userId, videoId) — one record per user per video.
 * Privacy: video titles are NEVER stored here. Only category labels.
 */
const classifiedVideoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: { type: String, required: true },
    channelId: { type: String, default: null },
    channelName: { type: String, default: null },
    category: {
      type: String,
      enum: ['goal', 'interest', 'junk'],
      required: true,
    },
    matchedInterest: { type: String, default: null },
    // 'gemini' = classified by Gemini AI; 'keyword_fallback' = keyword classifier
    source: { type: String, default: 'gemini' },
  },
  { timestamps: true }
);

// Unique per user+video so upserts are safe
classifiedVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('ClassifiedVideo', classifiedVideoSchema);
