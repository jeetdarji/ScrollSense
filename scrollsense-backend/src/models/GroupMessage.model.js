const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * GroupMessage — Real-time + async group chat.
 * PRIVACY: userId is intentionally NOT stored. The sender is identified
 * only by their anonymousName within the group. There is no way to query
 * "all messages by user X" — by design.
 */
const groupMessageSchema = new Schema({
  groupId:       { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  anonymousName: { type: String, required: true, trim: true },
  content:       { type: String, required: true, maxlength: 500 },
  messageType:   { type: String, enum: ['user', 'system', 'milestone'], default: 'user' },
  sentAt:        { type: Date, default: Date.now },
  isDeleted:     { type: Boolean, default: false },
  // Sender's submission streak at time of message (for badge display)
  streak:        { type: Number, default: 0 },
  // Anonymous reactions — only aggregate counts, no names attached
  reactions: {
    fire:   { type: Number, default: 0 },
    clap:   { type: Number, default: 0 },
    heart:  { type: Number, default: 0 },
    strong: { type: Number, default: 0 },
  },
}, { timestamps: false }); // no updatedAt/createdAt — sentAt is the only timestamp

// Paginated message fetch within a group (newest first)
groupMessageSchema.index({ groupId: 1, sentAt: -1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
