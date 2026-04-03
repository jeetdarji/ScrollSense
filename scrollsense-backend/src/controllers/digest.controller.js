const asyncHandler = require('../utils/asyncHandler');
const {
  buildCheckinPayload,
  shouldGenerateCheckin,
} = require('../services/digest.service');

/**
 * GET /api/digest/checkin
 * Returns check-in data for F10 WeeklyCheckin component.
 * Powers the checkin object in useYouTubeData mock.
 * Can take 3-5 seconds (Gemini call) — frontend should cache result.
 */
const getCheckin = async (req, res) => {
  try {
    const payload = await buildCheckinPayload(req.user._id);
    return res.status(200).json(payload);
  } catch (err) {
    console.error('Check-in generation failed:', err.message);
    return res.status(200).json({
      available: false,
      sessionsLogged: 0,
      error: 'Generation failed',
    });
  }
};

/**
 * GET /api/digest/status
 * Lightweight endpoint — checks if check-in is available.
 * Called on dashboard load to show/hide the progress bar.
 */
const getCheckinStatus = async (req, res) => {
  const result = await shouldGenerateCheckin(req.user._id);

  return res.status(200).json({
    available: result.should,
    sessionsLogged: result.sessionsLogged,
    sessionsNeeded: Math.max(0, 3 - result.sessionsLogged),
    progressPercent: Math.min(
      Math.round((result.sessionsLogged / 3) * 100),
      100
    ),
  });
};

module.exports = {
  getCheckin: asyncHandler(getCheckin),
  getCheckinStatus: asyncHandler(getCheckinStatus),
};
