const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSubmissionSchema = new Schema({
  groupId:          { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  anonymousName:    { type: String, required: true, trim: true },
  isoWeek:          { type: String, required: true },  // e.g. "2026-W16"
  deltaMinutes:     { type: Number, required: true },  // negative = improved (less scrolling), positive = worse
  percentChange:    { type: Number, default: null },
  baselineMinutes:  { type: Number, default: null },   // previous week total (for context)
  sessionsThisWeek: { type: Number, default: 0 },
  submittedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

// Weekly leaderboard for a group
groupSubmissionSchema.index({ groupId: 1, isoWeek: 1 });
// Check if user already submitted this week
groupSubmissionSchema.index({ userId: 1, isoWeek: 1 }, { unique: true });

module.exports = mongoose.model('GroupSubmission', groupSubmissionSchema);
