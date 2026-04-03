const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema({
  triggerType:  { type: String, required: true },
  memberIds:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  maxMembers:   { type: Number, default: 8 },
  isOpen:       { type: Boolean, default: true },
  weeklyDeltas: [{
    _id: false,
    userId:     Schema.Types.ObjectId,
    week:       Date,
    deltaMinutes: Number,
    percentChange: Number,
  }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);