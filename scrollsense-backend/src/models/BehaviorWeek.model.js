const mongoose = require('mongoose');
const { Schema } = mongoose;

const behaviorWeekSchema = new Schema({
  userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekStart:            { type: Date, required: true },
  totalScrollMinutes:   { type: Number, default: 0 },
  careerRelevantPercent:{ type: Number, default: 0, min: 0, max: 100 },
  interestPercent:      { type: Number, default: 0, min: 0, max: 100 },
  junkPercent:          { type: Number, default: 0, min: 0, max: 100 },
  peakScrollHour:       { type: Number, default: null, min: 0, max: 23 },
  dominantCategory:     { type: String, default: null },
  triggerPatterns:      { type: [String], default: [] },
  averageMoodRating:    { type: Number, default: null },
  sessionsCount:        { type: Number, default: 0 },
  digestSent:           { type: Boolean, default: false },
  digestSentAt:         { type: Date, default: null },
  interestBreakdown:    { type: Map, of: Number, default: {} },
  dailyInterestMinutes: { type: Map, of: Number, default: {} },
}, { timestamps: true });

behaviorWeekSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('BehaviorWeek', behaviorWeekSchema);