const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
  userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:          { type: String, enum: ['youtube', 'instagram', 'both'], required: true },
  startTime:         { type: Date, required: true },
  durationMinutes:   { type: Number, required: true, min: 1 },
  intentionCategory: { type: String, required: true },
  moodRating:        { type: Number, min: 1, max: 5, required: true },
  moodBefore:        { type: Number, min: 1, max: 5, default: null },
  notes:             { type: String, default: null }, 
}, { timestamps: true });

sessionSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Session', sessionSchema);