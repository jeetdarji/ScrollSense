const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');
const { encrypt } = require('../utils/encrypt');

module.exports = function(passportInstance) {
  passportInstance.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id }, 
          { email: profile.emails[0].value.toLowerCase() }
        ] 
      });

      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

      if (!user) {
        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value.toLowerCase(),
          displayName: profile.displayName,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          googleAccessToken: encryptedAccessToken,
          googleRefreshToken: encryptedRefreshToken,
          youtubeConnected: false,
          youtubeConnectedAt: null,
          lastLoginAt: new Date()
        });
      } else {
        // Updating existing user
        user.googleId = profile.id;
        user.displayName = user.displayName || profile.displayName;
        if (profile.photos && profile.photos[0] && !user.avatar) {
          user.avatar = profile.photos[0].value;
        }
        
        user.googleAccessToken = encryptedAccessToken;
        if (encryptedRefreshToken) {
          user.googleRefreshToken = encryptedRefreshToken;
        }
        
        // youtubeConnected is only set via POST /api/youtube/connect
        user.lastLoginAt = new Date();
        
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
};