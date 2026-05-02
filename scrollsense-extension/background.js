/**
 * background.js  (Manifest V3 service worker)
 *
 * Responsibilities:
 *  1. Store auth credentials sent from content-app.js (ScrollSense frontend)
 *  2. Accumulate watch-time reports from content-youtube.js
 *  3. Periodically flush accumulated data to the ScrollSense backend API
 *
 * Data stored in chrome.storage.local:
 *   ss_token         — the user's ScrollSense access token
 *   ss_api_url       — the ScrollSense API base URL
 *   pending_watches  — map of  "YYYY-MM-DD|videoId" → totalWatchedSeconds
 */

'use strict';

const FLUSH_ALARM   = 'ss_flush';
const FLUSH_MINUTES = 5;

// ─── Alarm setup ────────────────────────────────────────────────────────────
// The service worker may be killed between alarms; chrome.alarms keeps ticking.

chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) flushToBackend();
});

// ─── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'SET_CREDENTIALS':
      chrome.storage.local.set({ ss_token: msg.token, ss_api_url: msg.apiUrl });
      break;

    case 'CLEAR_CREDENTIALS':
      chrome.storage.local.remove(['ss_token', 'ss_api_url']);
      // Discard any pending data that belongs to this session so it isn't
      // sent after the user logs out with a stale (potentially revoked) token.
      chrome.storage.local.remove('pending_watches');
      break;

    case 'REPORT_WATCH_TIME':
      addWatchTime(msg.videoId, msg.watchedSeconds, msg.date);
      break;

    case 'GET_STATUS':
      chrome.storage.local.get(
        ['ss_token', 'ss_api_url', 'pending_watches'],
        (result) => {
          sendResponse({
            connected:    !!result.ss_token,
            apiUrl:       result.ss_api_url || null,
            pendingCount: Object.keys(result.pending_watches || {}).length,
          });
        }
      );
      return true; // keep channel open for async sendResponse

    case 'FLUSH_NOW':
      flushToBackend()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
  }
});

// ─── Watch-time accumulation ────────────────────────────────────────────────

/**
 * Add watchedSeconds to the in-progress accumulator for this video+date.
 * Key format: "YYYY-MM-DD|videoId"  (pipe avoids collision with date hyphens)
 */
function addWatchTime(videoId, watchedSeconds, date) {
  chrome.storage.local.get(['pending_watches'], (result) => {
    const pending = result.pending_watches || {};
    const key = `${date}|${videoId}`;
    pending[key] = Math.min((pending[key] || 0) + watchedSeconds, 7200); // cap 2h
    chrome.storage.local.set({ pending_watches: pending });
  });
}

// ─── Backend flush ──────────────────────────────────────────────────────────

async function flushToBackend() {
  const result = await chrome.storage.local.get([
    'ss_token', 'ss_api_url', 'pending_watches',
  ]);
  const { ss_token, ss_api_url, pending_watches } = result;

  if (!ss_token || !ss_api_url) return; // not linked to a ScrollSense account
  if (!pending_watches || Object.keys(pending_watches).length === 0) return;

  const reports = Object.entries(pending_watches).map(([key, seconds]) => {
    const pipeIdx = key.indexOf('|');
    return {
      date:           key.slice(0, pipeIdx),
      videoId:        key.slice(pipeIdx + 1),
      watchedSeconds: seconds,
    };
  });

  try {
    // VITE_API_URL is often 'http://localhost:5000/api'. Avoid resolving to /api/api/...
    const baseUrl = ss_api_url.endsWith('/api') ? ss_api_url.slice(0, -4) : ss_api_url;
    
    const response = await fetch(`${baseUrl}/api/youtube/watch-time`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ss_token}`,
      },
      body: JSON.stringify({ reports }),
    });

    if (response.ok) {
      // Clear flushed data — it's now safely stored in the backend
      await chrome.storage.local.remove('pending_watches');
      console.log(`[ScrollSense] Flushed ${reports.length} watch-time reports.`);
    } else if (response.status === 401) {
      // Token expired or revoked — clear it so the popup shows "not connected"
      await chrome.storage.local.remove(['ss_token', 'ss_api_url']);
      console.warn('[ScrollSense] Token rejected (401). Re-link via ScrollSense settings.');
    } else {
      // Server error — keep pending data; retry on next alarm
      console.warn(`[ScrollSense] Flush HTTP ${response.status} — will retry.`);
    }
  } catch (err) {
    // Network offline or API unreachable — keep pending data; retry on next alarm
    console.warn('[ScrollSense] Flush failed (network):', err.message);
  }
}
