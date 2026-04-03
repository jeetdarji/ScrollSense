const mongoose = require('mongoose');
const { Schema } = mongoose;

const cravingSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  timestamp:       { type: Date, default: Date.now },
  cravingCategory: { type: String, required: true },
  outcome:         { type: String, required: true },
}, { timestamps: true });

cravingSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Craving', cravingSchema);