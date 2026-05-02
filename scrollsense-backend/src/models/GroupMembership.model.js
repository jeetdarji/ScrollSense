const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupMembershipSchema = new Schema({
  groupId:          { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  anonymousName:    { type: String, required: true, trim: true },
  joinedAt:         { type: Date, default: Date.now },
  isActive:         { type: Boolean, default: true },
  leftAt:           { type: Date, default: null },
  // Streak tracking — updated by weekly scheduler + submit-week endpoint
  submissionStreak: { type: Number, default: 0 },
  longestStreak:    { type: Number, default: 0 },
}, { timestamps: true });

// Roster for a specific group (active members)
groupMembershipSchema.index({ groupId: 1, isActive: 1 });
// "Find my group" — fast lookup of user's active membership
groupMembershipSchema.index({ userId: 1, isActive: 1 });
// History of retired names in a group (used during name generation)
groupMembershipSchema.index({ groupId: 1, anonymousName: 1 });
// CRITICAL: Only one active membership per user at a time (prevents race conditions)
groupMembershipSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

module.exports = mongoose.model('GroupMembership', groupMembershipSchema);
