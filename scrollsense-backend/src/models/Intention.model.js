const mongoose = require('mongoose');
const { Schema } = mongoose;

const intentionSchema = new Schema({
  userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:              { type: String, required: true },
  intentionCategory: { type: String, required: true },
  timestamp:         { type: Date, default: Date.now },
}, { timestamps: true });

intentionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Intention', intentionSchema);