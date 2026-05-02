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

  // Attempt to fetch from Watch History; fall back to liked videos on 403 OR empty 200
  // NOTE: YouTube's HL playlist returns HTTP 200 with 0 items when Watch History is
  // restricted by API policy (even when history is "On" in account settings).
  // This is a known YouTube Data API v3 limitation — the fallback covers this case.
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
    if (err.response && (err.response.status === 403 || err.response.status === 400) && !usedFallback) {
      // Watch History inaccessible — fall back to liked videos
      usedFallback = true;
      console.log(`Watch History playlist (HL) error ${err.response.status}. Falling back to Liked Videos.`)
      
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

  // ── KEY FIX: HL returned HTTP 200 but 0 items ───────────────────────────
  // YouTube's Watch History playlist silently returns empty even when history is ON,
  // because the youtube.readonly scope cannot access private history playlists via API.
  // Fall back to Liked Videos which IS accessible with youtube.readonly scope.
  if (videos.length === 0 && !usedFallback) {
    console.log(`[fetchWatchHistory] HL returned 0 items (HTTP 200). Falling back to Liked Videos.`);
    usedFallback = true;
    try {
      const channelRes = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: { part: 'contentDetails', mine: true },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const likedPlaylist =
        channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.likes;

      if (!likedPlaylist) {
        console.log(`[fetchWatchHistory] No liked playlist found — user may have no YouTube channel.`);
      } else {
        let likedPageToken = null;
        do {
          const params = {
            part: 'snippet,contentDetails',
            playlistId: likedPlaylist,
            maxResults: 50,
          };
          if (likedPageToken) params.pageToken = likedPageToken;

          const res = await axios.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            { params, headers: { Authorization: `Bearer ${token}` } }
          );

          videos.push(...res.data.items);
          likedPageToken = res.data.nextPageToken;
        } while (likedPageToken && videos.length < maxResults);

        console.log(`[fetchWatchHistory] Liked Videos fallback: fetched ${videos.length} items.`);
      }
    } catch (fallbackErr) {
      if (
        fallbackErr.response &&
        (fallbackErr.response.status === 403 ||
          fallbackErr.response.status === 429)
      ) {
        throw new Error('YOUTUBE_QUOTA_EXCEEDED');
      }
      console.error(`[fetchWatchHistory] Liked Videos fallback error: ${fallbackErr.message}`);
    }
  }

  // Extract video IDs and timestamps.
  // Filter out null/empty videoIds — YouTube returns null for deleted or private videos.
  // Sending null IDs to fetchVideoMetadata would produce malformed API requests.
  //
  // For the HL playlist, snippet.publishedAt is when the video was added to watch
  // history — effectively the time the user watched it.
  // For the Liked Videos fallback, snippet.publishedAt is when the user liked the
  // video. This is the best available proxy — we do NOT synthesise fake timestamps
  // because that would attribute old videos to the current week and inflate metrics.
  const filteredVideos = videos.filter((item) => item.contentDetails?.videoId);

  return filteredVideos.map((item) => ({
    videoId: item.contentDetails.videoId,
    watchedAt: item.snippet.publishedAt,
  }));
}

/**
 * Parses an ISO 8601 duration string (e.g. "PT5M30S") to total seconds.
 * Returns 300 (5 minutes) as a safe fallback for missing/invalid values.
 */
function parseDuration(iso) {
  if (!iso) return 300;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 300;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

/**
 * Batch fetches video titles, channel names, categories, and durations.
 * YouTube allows 50 video IDs per request.
 * We request contentDetails to get the video duration (ISO 8601 format).
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
          part: 'snippet,contentDetails',
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
    // Actual video duration in seconds — used for watch-time estimation.
    // YouTube Data API v3 does not expose true per-user watch time;
    // video duration is the best available upper-bound approximation.
    durationSeconds: parseDuration(item.contentDetails?.duration),
  }));
}

module.exports = {
  refreshGoogleAccessToken,
  getValidAccessToken,
  fetchWatchHistory,
  fetchVideoMetadata,
};
