const axios = require('axios');
const { encrypt, decrypt } = require('../utils/encrypt');
const User = require('../models/User.model');

/**
 * Refreshes Google access token using the stored refresh token.
 * Google access tokens expire in 1 hour.
 * If refresh fails (revoked), marks YouTube as disconnected.
 */
async function refreshGoogleAccessToken(user) {
  const refreshToken = decrypt(user.googleRefreshToken);
  if (!refreshToken) {
    await User.findByIdAndUpdate(user._id, {
      youtubeConnected: false,
      googleAccessToken: null,
      googleRefreshToken: null,
    });
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token } = response.data;

    // Encrypt and persist the new access token
    await User.findByIdAndUpdate(user._id, {
      googleAccessToken: encrypt(access_token),
    });

    return access_token;
  } catch (err) {
    // 400/401 = refresh token revoked or invalid
    if (err.response && [400, 401].includes(err.response.status)) {
      await User.findByIdAndUpdate(user._id, {
        youtubeConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
      });
      throw new Error('YOUTUBE_DISCONNECTED');
    }
    throw err;
  }
}

/**
 * Returns a valid (non-expired) access token, refreshing if needed.
 * Called before every YouTube API request.
 */
async function getValidAccessToken(user) {
  if (!user.googleAccessToken) {
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  const token = decrypt(user.googleAccessToken);
  if (!token) {
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  // Verify token with a lightweight API call
  try {
    await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'id', mine: true },
      headers: { Authorization: `Bearer ${token}` },
    });
    return token;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Token expired — refresh it
      const newToken = await refreshGoogleAccessToken(user);
      return newToken;
    }
    throw err;
  }
}

/**
 * Fetches the user's YouTube watch history video IDs.
 * Uses the 'HL' playlist (Watch History) which requires youtube.readonly scope.
 * Falls back to liked videos if 'HL' returns 403.
 * 
 * Note: To decrease Google / Gemini quota limits, we've reduced 
 * maxResults to 150 by default when querying the Youtube APIs.
 */
async function fetchWatchHistory(user, maxResults = 150) {
  const token = await getValidAccessToken(user);

  let playlistId = 'HL'; // Watch History playlist

  // Attempt to fetch from Watch History; fall back to liked videos on 403
  const videos = [];
  let pageToken = null;
  let usedFallback = false;

  try {
    do {
      const params = {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: 50, // API max per page
      };
      if (pageToken) params.pageToken = pageToken;

      const res = await axios.get(
        'https://www.googleapis.com/youtube/v3/playlistItems',
        { params, headers: { Authorization: `Bearer ${token}` } }
      );

      videos.push(...res.data.items);
      pageToken = res.data.nextPageToken;
    } while (pageToken && videos.length < maxResults);
  } catch (err) {
    if (err.response && err.response.status === 403 && !usedFallback) {
      // Watch History inaccessible — fall back to liked videos
      usedFallback = true;
      console.log(`Watch History playlist (HL) denied. Falling back to explicit Liked Videos.`)
      
      try {
        const channelRes = await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            params: { part: 'contentDetails', mine: true },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const likedPlaylist =
          channelRes.data.items[0]?.contentDetails?.relatedPlaylists?.likes;
        if (!likedPlaylist) {
          throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }

        playlistId = likedPlaylist;
        pageToken = null;

        do {
          const params = {
            part: 'snippet,contentDetails',
            playlistId,
            maxResults: 50,
          };
          if (pageToken) params.pageToken = pageToken;

          const res = await axios.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            { params, headers: { Authorization: `Bearer ${token}` } }
          );

          videos.push(...res.data.items);
          pageToken = res.data.nextPageToken;
        } while (pageToken && videos.length < maxResults);
      } catch (fallbackErr) {
        if (
          fallbackErr.response &&
          (fallbackErr.response.status === 403 ||
            fallbackErr.response.status === 429)
        ) {
          throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }
        throw fallbackErr;
      }
    } else if (
      err.response &&
      (err.response.status === 403 || err.response.status === 429)
    ) {
      throw new Error('YOUTUBE_QUOTA_EXCEEDED');
    } else {
      throw err;
    }
  }

  // Extract video IDs and timestamps
  return videos.map((item) => ({
    videoId: item.contentDetails.videoId,
    watchedAt: item.snippet.publishedAt,
  }));
}

/**
 * Batch fetches video titles, channel names, and categories.
 * YouTube allows 50 video IDs per request.
 */
async function fetchVideoMetadata(videoIds, accessToken) {
  // Chunk videoIds into groups of 50
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const results = [];
  for (const chunk of chunks) {
    const res = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'snippet',
          id: chunk.join(','),
          key: process.env.YOUTUBE_API_KEY,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    results.push(...res.data.items);

    // Rate limit: 50ms between chunks to avoid quota burst
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return results.map((item) => ({
    videoId: item.id,
    title: item.snippet.title, // used for classification ONLY — never stored
    channelName: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    categoryId: item.snippet.categoryId,
    publishedAt: item.snippet.publishedAt,
  }));
}

module.exports = {
  refreshGoogleAccessToken,
  getValidAccessToken,
  fetchWatchHistory,
  fetchVideoMetadata,
};
