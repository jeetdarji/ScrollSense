# ScrollSense Browser Extension

Tracks your **actual YouTube watch time** (not video duration) and sends it to the ScrollSense backend so your dashboard shows real minutes instead of estimates.

## How it works

1. The extension runs a content script on every `youtube.com/watch` page
2. It listens to the HTML5 `<video>` element's `play`, `pause`, `ended` events
3. Accumulated watch time is stored locally (no server calls while you browse)
4. Every 5 minutes it flushes the data to `POST /api/youtube/watch-time`
5. The next time the classification job runs, it uses your real watched seconds

## Installation (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this `scrollsense-extension/` folder
4. The extension icon appears in the toolbar

## Linking to your account

1. Log in to your ScrollSense app (any tab)
2. The extension **auto-links** — it reads the token the frontend places in `localStorage['ss_ext_credentials']`
3. Click the extension icon to confirm the status shows **Connected**

No manual token copy-paste needed. If you log out of ScrollSense, the extension automatically unlinks.

## Privacy

- The extension **never reads video titles**
- Only `videoId` (e.g. `dQw4w9WgXcQ`) and `watchedSeconds` are sent to the backend
- Data is stored in `chrome.storage.local` until flushed — cleared after successful send
- The content script on non-YouTube pages does nothing except check for a `<meta name="scrollsense-app">` tag (one DOM query, negligible overhead)

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension configuration |
| `content-youtube.js` | Tracks watch time on YouTube |
| `content-app.js` | Reads auth credentials from the ScrollSense frontend tab |
| `background.js` | Accumulates reports, flushes to backend API |
| `popup.html/js` | Status popup shown when clicking the extension icon |
