'use strict';

const statusDot   = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');
const pendingEl   = document.getElementById('pendingCount');
const flushStatus = document.getElementById('flushStatus');
const flushBtn    = document.getElementById('flushBtn');
const hintText    = document.getElementById('hintText');

// ─── Load initial state ──────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (!res) return;

  if (res.connected) {
    statusDot.className   = 'status-dot connected';
    statusLabel.textContent = 'Connected';
    hintText.innerHTML = 'Tracking active on youtube.com';
    flushBtn.disabled = res.pendingCount === 0;
  } else {
    statusDot.className   = 'status-dot disconnected';
    statusLabel.textContent = 'Not linked';
    hintText.innerHTML =
      'Open <a href="#" id="appLink">ScrollSense</a> to auto-link';
    flushBtn.disabled = true;

    // Clicking the link opens the app in a new tab
    const link = document.getElementById('appLink');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.storage.local.get(['ss_api_url'], (r) => {
          const url = r.ss_api_url
            ? r.ss_api_url.replace('/api', '')
            : 'https://scrollsense.app';
          chrome.tabs.create({ url });
        });
      });
    }
  }

  pendingEl.textContent   = res.pendingCount || '0';
  flushStatus.textContent = res.pendingCount > 0 ? 'READY' : 'NONE';
});

// ─── Manual flush button ─────────────────────────────────────────────────────

flushBtn.addEventListener('click', () => {
  flushBtn.disabled = true;
  flushBtn.textContent = 'SENDING…';

  // Delegate to background.js — single source of truth for flush logic
  chrome.runtime.sendMessage({ type: 'FLUSH_NOW' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      flushBtn.textContent = 'ERROR';
      setTimeout(() => { flushBtn.textContent = 'RETRY'; flushBtn.disabled = false; }, 2000);
      return;
    }

    if (res.ok) {
      pendingEl.textContent   = '0';
      flushStatus.textContent = 'SENT ✓';
      flushBtn.textContent    = 'FLUSH NOW';
      flushBtn.disabled       = true;
    } else {
      flushBtn.textContent = res.error || 'FAILED';
      setTimeout(() => { flushBtn.textContent = 'RETRY'; flushBtn.disabled = false; }, 2000);
    }
  });
});
