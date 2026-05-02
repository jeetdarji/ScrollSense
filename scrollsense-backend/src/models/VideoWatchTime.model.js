const mongoose = require('mongoose');

/**
 * Stores actual user-watched seconds per video per day.
 * Populated by the ScrollSense browser extension running on youtube.com.
 *
 * YouTube Data API v3 does not expose per-user watch time — only the full
 * video duration is available via the API.  This model lets us record exactly
 * how many seconds the user actually watched for each video, which makes the
 * "total this week" minutes on the dashboard reflect real viewing time
 * (e.g. 20 min watched out of a 40-min video).
 *
 * The extension reports {videoId, watchedSeconds, date} and we accumulate
 * across multiple viewing sessions using $inc — rewatching the same video on
 * the same day adds to the total (realistic: user pauses and resumes).
 */
const videoWatchTimeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
      maxlength: 20, // YouTube video IDs are always 11 characters
    },
    // "YYYY-MM-DD" — the calendar day this watch session occurred on
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    // Total seconds the user actually watched this video on this date.
    // Accumulated with $inc — supports multiple watch sessions per day.
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
      // Hard cap at 7200 (2 hours) per video per day to prevent runaway accumulation
      max: 7200,
    },
  },
  { timestamps: true }
);

// One record per user + video + day — upserts with $inc are safe
videoWatchTimeSchema.index({ userId: 1, videoId: 1, date: 1 }, { unique: true });

// For querying all watch time in a date range (used by classification job)
videoWatchTimeSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('VideoWatchTime', videoWatchTimeSchema);
