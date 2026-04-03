const mongoose = require('mongoose');

const behaviorDaySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  dayOfWeek: { type: Number },
  dayName: { type: String },
  peakHour: { type: Number },
  dailyLimitMinutes: { type: Number, default: 90 },
  totalScrollMinutes: { type: Number, default: 0 },
  sessionsCount: { type: Number, default: 0 },
  exceededLimit: { type: Boolean, default: false },

  // YouTube-specific auto-populated fields
  youtubeMinutes: { type: Number, default: 0 },
  youtubeInterestMinutes: {
    type: Map,
    of: Number,
    default: {},
  },
  
  // Instagram-specific (populated when user uploads export)
  instagramMinutes: { type: Number, default: 0 },
  instagramInterestMinutes: {
    type: Map,
    of: Number,
    default: {},
  },
  
  // Data source tracking
  youtubeDataFetched: { type: Boolean, default: false },
  instagramDataProcessed: { type: Boolean, default: false },
}, { timestamps: true });

behaviorDaySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('BehaviorDay', behaviorDaySchema);