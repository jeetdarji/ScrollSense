const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  // Identity
  googleId:     { type: String, sparse: true, index: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },  // null for OAuth-only users
  displayName:  { type: String, trim: true },
  avatar:       { type: String, default: null },  // Google profile photo URL

  // OAuth tokens (encrypted at rest — store encrypted, decrypt on use)
  googleAccessToken:  { type: String, default: null },
  googleRefreshToken: { type: String, default: null },

  // Onboarding state
  onboardingComplete: { type: Boolean, default: false },

  // Onboarding data (set once via POST /api/onboarding)
  platforms:          { type: [String], default: [] },  // ['youtube','instagram']
  awarenessLevel:     { type: String, default: '' },
  careerPath:         { type: String, default: '' },
  careerPathPreset:   { type: String, default: '' },
  goals:              { type: [String], default: [] },
  customGoal:         { type: String, default: '' },
  interests: [{
    _id: false,
    id:           String,
    label:        String,
    dailyMinutes: { type: Number, default: 30 },
  }],
  scrollTriggers:     { type: [String], default: [] },
  dailyLimitMinutes:  { type: Number, default: 90 },

  // YouTube connection
  youtubeConnected:         { type: Boolean, default: false },
  youtubeConnectedAt:       { type: Date, default: null },
  youtubeLastSyncAt:        { type: Date, default: null },
  youtubeDataUnavailable:   { type: Boolean, default: false },

  // Top YouTube channels (public info — safe to store)
  topChannels: {
    type: [{
      _id: false,
      channelName: { type: String },
      channelId: { type: String },
      category: { type: String, enum: ['goal', 'interest', 'junk'] },
      count: { type: Number, default: 0 },
    }],
    default: [],
  },

  // Instagram connection
  instagramUploaded:        { type: Boolean, default: false },
  instagramLastUploadAt:    { type: Date, default: null },

  // Instagram topics (from your_topics.json export)
  instagramTopics: { type: [String], default: [] },
  
  // Habit nudge tracking
  lastNudgeShownAt: { type: Date, default: null },
  nudgeFeedback: {
    type: [{
      _id: false,
      nudgeId: String,
      action: { type: String, enum: ['acted_on', 'dismissed', 'ignored'] },
      timestamp: { type: Date, default: Date.now },
    }],
    default: [],
  },

  // Refresh token (stored hashed — compare with bcrypt)
  refreshTokenHash: { type: String, default: null },

  // Notification Preferences
  notificationPreferences: {
    type: {
      weeklyDigest: { type: Boolean, default: true },
      emailDigest: { type: Boolean, default: false },
      emailAddress: { type: String, default: '' },
      dailyLimitAlerts: { type: Boolean, default: true },
      instagramReminder: { type: Boolean, default: true },
      instagramFrequency: { type: String, enum: ['monthly', '3months', '6months'], default: 'monthly' },
      goalNudges: { type: Boolean, default: true }
    },
    default: () => ({}) // defaults applied by embedded subdocument defaults
  },

  // Account state
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date, default: null },
  deletionRequestedAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.googleAccessToken;
  delete user.googleRefreshToken;
  delete user.passwordHash;
  delete user.refreshTokenHash;
  return user;
};

module.exports = mongoose.model('User', userSchema);