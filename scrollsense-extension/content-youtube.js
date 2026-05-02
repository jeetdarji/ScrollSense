/**
 * content-youtube.js
 * Runs on every youtube.com page.
 *
 * Tracks how many seconds the user actually watches each video by listening
 * to the HTML5 <video> element's play/pause/ended events.
 * Handles YouTube's single-page-app navigation (URL changes without reload).
 *
 * Reports are sent to background.js via chrome.runtime.sendMessage and are
 * flushed to the ScrollSense backend every few minutes.
 */
(function () {
  'use strict';

  let currentVideoId = null;
  let watchStartTime = null;   // timestamp (ms) when current play session began
  let accumulatedMs = 0;       // total ms watched in this page session for the current video

  // ─── Ad detection ─────────────────────────────────────────────────────────

  /** Returns true if YouTube is currently showing a pre-roll / mid-roll ad. */
  function isAdPlaying() {
    const player = document.querySelector('.html5-video-player');
    return player ? player.classList.contains('ad-showing') : false;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getVideoIdFromUrl() {
    try {
      return new URL(window.location.href).searchParams.get('v') || null;
    } catch (_) {
      return null;
    }
  }

  /** Pause the running clock and add elapsed time to the accumulator. */
  function pauseClock() {
    if (watchStartTime !== null) {
      accumulatedMs += Date.now() - watchStartTime;
      watchStartTime = null;
    }
  }

  /**
   * Send accumulated watch time to background.js.
   * Ignores sessions shorter than 5 seconds (accidental clicks, ads, etc.)
   */
  function flush(reason) {
    pauseClock();
    if (!currentVideoId || accumulatedMs < 5000) return;

    const watchedSeconds = Math.round(accumulatedMs / 1000);
    const date = new Date().toISOString().split('T')[0];

    chrome.runtime.sendMessage({
      type: 'REPORT_WATCH_TIME',
      videoId: currentVideoId,
      watchedSeconds,
      date,
    });

    // Reset so the same session doesn't double-count on the next flush
    accumulatedMs = 0;
  }

  // ─── Video element listeners ───────────────────────────────────────────────

  let attachedVideoEl = null;

  function attachVideoListeners(videoEl) {
    if (attachedVideoEl === videoEl) return; // already attached
    detachVideoListeners();

    videoEl.addEventListener('play',    onPlay);
    videoEl.addEventListener('pause',   onPause);
    videoEl.addEventListener('ended',   onEnded);
    videoEl.addEventListener('seeking', onSeeking);
    videoEl.addEventListener('seeked',  onSeeked);

    attachedVideoEl = videoEl;

    // BUG-FIX: If video is already playing (autoplay), start the clock now
    // because the 'play' event fired before we attached listeners.
    if (!videoEl.paused && watchStartTime === null) {
      watchStartTime = Date.now();
    }
  }

  function detachVideoListeners() {
    if (!attachedVideoEl) return;
    attachedVideoEl.removeEventListener('play',    onPlay);
    attachedVideoEl.removeEventListener('pause',   onPause);
    attachedVideoEl.removeEventListener('ended',   onEnded);
    attachedVideoEl.removeEventListener('seeking', onSeeking);
    attachedVideoEl.removeEventListener('seeked',  onSeeked);
    attachedVideoEl = null;
  }

  function onPlay()    {
    // Don't start the clock during ads
    if (!isAdPlaying()) watchStartTime = Date.now();
  }
  function onPause()   { pauseClock(); flush('pause'); }
  function onEnded()   { flush('ended'); }
  function onSeeking() { pauseClock(); }  // pause clock while user scrubs
  function onSeeked()  {
    // Restart clock after seek if video is still playing (and not an ad)
    if (attachedVideoEl && !attachedVideoEl.paused && watchStartTime === null && !isAdPlaying()) {
      watchStartTime = Date.now();
    }
  }

  // ─── Periodic flush (every 60s while playing) ─────────────────────────────
  // Ensures data isn't lost if the user closes the tab without pausing first.
  // We do NOT call flush() here because flush() calls pauseClock() which sets
  // watchStartTime = null — that would stop the clock for the rest of the session.
  // Instead, we roll the accumulator forward and send the message directly.

  setInterval(() => {
    if (watchStartTime === null || !currentVideoId) return;

    // Pause clock during ads so ad time isn't accumulated
    if (isAdPlaying()) {
      pauseClock();
      return;
    }

    // Roll the clock: add elapsed time since last tick, restart from now
    accumulatedMs += Date.now() - watchStartTime;
    watchStartTime = Date.now(); // keep clock running — do NOT call pauseClock()

    if (accumulatedMs < 5000) return; // ignore sub-5s ticks (e.g. first interval after attach)

    const watchedSeconds = Math.round(accumulatedMs / 1000);
    const date = new Date().toISOString().split('T')[0];

    chrome.runtime.sendMessage({
      type: 'REPORT_WATCH_TIME',
      videoId: currentVideoId,
      watchedSeconds,
      date,
    });

    accumulatedMs = 0; // reset accumulator — watchStartTime stays set, clock continues
  }, 60_000);

  // ─── Video element finder ──────────────────────────────────────────────────

  let findVideoAttempts = 0;

  function findAndAttach() {
    const videoEl = document.querySelector('video');
    if (videoEl) {
      attachVideoListeners(videoEl);
      findVideoAttempts = 0;
      return;
    }
    // Retry up to 20 times (video player loads asynchronously; slow connections need more time)
    if (findVideoAttempts < 20) {
      findVideoAttempts++;
      setTimeout(findAndAttach, 1000);
    }
  }

  // ─── SPA navigation detection ─────────────────────────────────────────────
  // YouTube is a single-page app — URL changes without a full page reload.
  // We watch <title> mutations as a reliable signal that the navigation finished.

  let lastSeenVideoId = getVideoIdFromUrl();

  function onNavigate() {
    const newId = getVideoIdFromUrl();
    if (newId === lastSeenVideoId) return; // same video or non-watch page

    // Flush whatever was accumulated for the previous video
    flush('navigation');

    // Reset state for the new video
    currentVideoId = newId;
    lastSeenVideoId = newId;
    accumulatedMs = 0;
    watchStartTime = null;
    detachVideoListeners();

    // The new video player takes a moment to appear in the DOM
    findVideoAttempts = 0;
    setTimeout(findAndAttach, 1200);
  }

  // Use YouTube's own SPA navigation event (much lighter than a full-DOM MutationObserver)
  window.addEventListener('yt-navigate-finish', onNavigate);

  // Fallback: intercept History API pushState/replaceState for edge cases
  const _origPushState    = history.pushState;
  const _origReplaceState = history.replaceState;
  history.pushState = function () {
    _origPushState.apply(this, arguments);
    setTimeout(onNavigate, 120);
  };
  history.replaceState = function () {
    _origReplaceState.apply(this, arguments);
    setTimeout(onNavigate, 120);
  };
  window.addEventListener('popstate', () => setTimeout(onNavigate, 120));

  // ─── Page unload ──────────────────────────────────────────────────────────

  // beforeunload: chrome.runtime.sendMessage is unreliable during tab close
  // because the MV3 service worker may not wake in time.  Write directly to
  // chrome.storage.local which is synchronous-enough to survive tab teardown.
  window.addEventListener('beforeunload', () => {
    pauseClock();
    if (!currentVideoId || accumulatedMs < 5000) return;

    const watchedSeconds = Math.round(accumulatedMs / 1000);
    const date = new Date().toISOString().split('T')[0];
    const key = `${date}|${currentVideoId}`;

    // Fire-and-forget storage write — much more reliable than sendMessage on unload
    chrome.storage.local.get(['pending_watches'], (result) => {
      const pending = result.pending_watches || {};
      pending[key] = Math.min((pending[key] || 0) + watchedSeconds, 7200);
      chrome.storage.local.set({ pending_watches: pending });
    });
    accumulatedMs = 0;
  });

  // visibilitychange covers tab switching without unload (mobile, hidden tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Flush accumulated time but keep tracking if video continues in background
      pauseClock();
      if (currentVideoId && accumulatedMs >= 5000) {
        const watchedSeconds = Math.round(accumulatedMs / 1000);
        const date = new Date().toISOString().split('T')[0];
        chrome.runtime.sendMessage({
          type: 'REPORT_WATCH_TIME',
          videoId: currentVideoId,
          watchedSeconds,
          date,
        });
        accumulatedMs = 0;
      }
      // Restart clock if video is still playing (YouTube plays in background tabs)
      if (attachedVideoEl && !attachedVideoEl.paused) {
        watchStartTime = Date.now();
      }
    } else {
      // Tab became visible again — restart clock if video kept playing
      if (attachedVideoEl && !attachedVideoEl.paused && watchStartTime === null && !isAdPlaying()) {
        watchStartTime = Date.now();
      }
    }
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  currentVideoId = getVideoIdFromUrl();
  lastSeenVideoId = currentVideoId;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndAttach);
  } else {
    findAndAttach();
  }
})();
