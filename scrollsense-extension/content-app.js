/**
 * content-app.js
 * Runs on ALL pages (required because the ScrollSense frontend URL is
 * deployment-specific and can't be hardcoded in the manifest).
 *
 * Immediately exits on every page that isn't the ScrollSense app
 * (checked via a <meta name="scrollsense-app"> tag that index.html adds).
 * On the ScrollSense frontend it reads the auth token from localStorage
 * and sends it to background.js so the extension can authenticate its
 * watch-time API calls.
 */
(function () {
  'use strict';

  // ── Fast exit for non-ScrollSense pages ─────────────────────────────────
  // This check is a single DOM query — negligible overhead on every other site.
  if (!document.querySelector('meta[name="scrollsense-app"]')) return;

  // ─── Sync credentials to background ─────────────────────────────────────

  function sync() {
    try {
      const raw = localStorage.getItem('ss_ext_credentials');
      if (!raw) return;
      const creds = JSON.parse(raw);
      if (!creds || typeof creds.token !== 'string' || typeof creds.apiUrl !== 'string') return;
      chrome.runtime.sendMessage({ type: 'SET_CREDENTIALS', token: creds.token, apiUrl: creds.apiUrl });
    } catch (_) {
      // localStorage unavailable or JSON parse error — silent failure
    }
  }

  function clear() {
    chrome.runtime.sendMessage({ type: 'CLEAR_CREDENTIALS' });
  }

  // Sync on initial page load
  sync();

  // Re-sync when the frontend refreshes the access token (token stored in same tab).
  // App.jsx dispatches 'ss_credentials_updated' after writing to localStorage.
  window.addEventListener('ss_credentials_updated', sync);
  window.addEventListener('ss_credentials_cleared',  clear);

  // Re-sync when the user returns focus to this tab (covers long background stays)
  window.addEventListener('focus', sync);

  // Re-sync when another tab of the ScrollSense app updates the token
  window.addEventListener('storage', (event) => {
    if (event.key === 'ss_ext_credentials') {
      if (event.newValue) sync();
      else clear();
    }
  });
})();
