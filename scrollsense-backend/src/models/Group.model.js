const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  triggerType:  { type: String, required: true, index: true,
                  enum: ['late_night', 'morning', 'stress', 'boredom', 'procrastination', 'general'] },
  description:  { type: String, required: true },
  icon:         { type: String, default: 'target' },
  maxMembers:   { type: Number, default: 8, min: 2, max: 20 },
  isOpen:       { type: Boolean, default: true, index: true },
  // Instance number within the same triggerType (1, 2, 3…)
  instanceNum:  { type: Number, default: 1 },
}, { timestamps: true });

// Quick lookup by trigger type + availability
groupSchema.index({ triggerType: 1, isOpen: 1 });
// Uniqueness across seeded groups
groupSchema.index({ triggerType: 1, instanceNum: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);