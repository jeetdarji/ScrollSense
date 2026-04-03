const express = require('express');
const passport = require('passport');
const { googleCallback, register, login, refresh, logout, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/youtube.readonly'], 
  accessType: 'offline', 
  prompt: 'select_account consent' 
}));

router.get('/google/callback', passport.authenticate('google', { 
  session: false,
  failureRedirect: process.env.FRONTEND_URL + '/auth/error' 
}), googleCallback);

// Email & password auth + session routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, getMe);

module.exports = router;