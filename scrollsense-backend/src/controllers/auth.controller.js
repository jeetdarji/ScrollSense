const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, issueTokens } = require('../utils/jwt.utils');
const asyncHandler = require('../utils/asyncHandler');

// Google OAuth callback logic is handled via Passport route + this helper
exports.googleCallback = asyncHandler(async (req, res) => {
  // Passport provides the authenticated user in req.user
  const user = req.user;
  const accessToken = await issueTokens(user, res, false);
  
  if (!user.onboardingComplete) {
    res.redirect(`${process.env.FRONTEND_URL}/onboarding?token=${accessToken}`);
  } else {
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${accessToken}`);
  }
});

exports.register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase().trim())) {
    return res.status(400).json({ error: 'Validation failed', details: ['Invalid or missing email'] });
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Validation failed', details: ['Password must be 8-128 characters'] });
  }

  const cleanEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    if (existingUser.googleId && !existingUser.passwordHash) {
      return res.status(409).json({ 
        error: 'Account exists with Google', 
        code: 'GOOGLE_ACCOUNT_EXISTS',
        message: 'An account with this email exists. Sign in with Google instead.'
      });
    }
    return res.status(409).json({ 
      error: 'Email already registered',
      code: 'EMAIL_EXISTS' 
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email: cleanEmail,
    passwordHash,
    displayName: typeof displayName === 'string' ? displayName.trim().substring(0, 50) : null,
    onboardingComplete: false,
    lastLoginAt: new Date(),
  });

  res.status(201);
  await issueTokens(user, res);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    await bcrypt.compare(String(password), '$2b$12$dummyhashfortimingattackprevention');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.googleId && !user.passwordHash) {
    return res.status(401).json({
      error: 'This account uses Google sign-in',
      code: 'USE_GOOGLE_AUTH',
      message: 'Sign in with Google to access this account.'
    });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: 'Account deactivated' });
  }

  const isMatch = await bcrypt.compare(String(password), user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  await issueTokens(user, res);
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await User.findByIdAndUpdate(decoded.sub, { refreshTokenHash: null });
    } catch (err) {
      // Token invalid or expired — still proceed with logout
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      error: 'No refresh token', 
      code: 'NO_REFRESH_TOKEN' 
    });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    res.clearCookie('refreshToken', { 
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/api/auth/refresh' 
    });
    return res.status(401).json({ 
      error: 'Invalid or expired refresh token',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.refreshTokenHash) {
    return res.status(401).json({ 
      error: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED'
    });
  }
  
  const isHashMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isHashMatch) {
    await User.findByIdAndUpdate(decoded.sub, { refreshTokenHash: null });
    res.clearCookie('refreshToken', {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/api/auth/refresh'
    });
    return res.status(401).json({ 
      error: 'Session invalid. Please log in again.',
      code: 'TOKEN_REUSE_DETECTED'
    });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: 'Account deactivated' });
  }

  await issueTokens(user, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  return res.json({ user: req.user.toSafeObject() });
});

/**
 * FRONTEND AXIOS CONFIGURATION REFERENCE - src/lib/axios.js
 * 
 * import axios from 'axios'
 * import { useAuthStore } from '../store/authStore'
 * 
 * const api = axios.create({
 *   baseURL: import.meta.env.VITE_API_URL,
 *   withCredentials: true,   // CRITICAL — sends httpOnly cookie on every request
 *   headers: { 'Content-Type': 'application/json' },
 * })
 * 
 * // Request interceptor — attach access token to every request
 * api.interceptors.request.use((config) => {
 *   const token = useAuthStore.getState().accessToken
 *   if (token) {
 *     config.headers.Authorization = `Bearer ${token}`
 *   }
 *   return config
 * })
 * 
 * // Response interceptor — handle token expiry silently
 * let isRefreshing = false
 * let failedQueue = []
 * 
 * const processQueue = (error, token = null) => {
 *   failedQueue.forEach(prom => {
 *     if (error) prom.reject(error)
 *     else prom.resolve(token)
 *   })
 *   failedQueue = []
 * }
 * 
 * api.interceptors.response.use(
 *   (response) => response,
 *   async (error) => {
 *     const originalRequest = error.config
 * 
 *     if (
 *       error.response?.status === 401 &&
 *       error.response?.data?.code === 'TOKEN_EXPIRED' &&
 *       !originalRequest._retry
 *     ) {
 *       if (isRefreshing) {
 *         return new Promise((resolve, reject) => {
 *           failedQueue.push({ resolve, reject })
 *         }).then(token => {
 *           originalRequest.headers.Authorization = `Bearer ${token}`
 *           return api(originalRequest)
 *         }).catch(err => Promise.reject(err))
 *       }
 * 
 *       originalRequest._retry = true
 *       isRefreshing = true
 * 
 *       try {
 *         const response = await api.post('/auth/refresh')
 *         const { accessToken } = response.data
 *         useAuthStore.getState().setAccessToken(accessToken)
 *         processQueue(null, accessToken)
 *         originalRequest.headers.Authorization = `Bearer ${accessToken}`
 *         return api(originalRequest)
 *       } catch (refreshError) {
 *         processQueue(refreshError, null)
 *         useAuthStore.getState().clearAuth()
 *         window.location.href = '/login'
 *         return Promise.reject(refreshError)
 *       } finally {
 *         isRefreshing = false
 *       }
 *     }
 * 
 *     return Promise.reject(error)
 *   }
 * )
 * 
 * export default api
 */
