const VALID_INTENTIONS = ['boredom', 'stress', 'specific', 'entertainment', 'learning']
const VALID_PLATFORMS  = ['youtube', 'instagram', 'both']
const VALID_OUTCOMES   = ['resisted', 'partial', 'gave_in']
const VALID_TRIGGERS   = ['boredom', 'anxiety', 'habit', 'loneliness']

function validateIntentionCategory(value) {
  return VALID_INTENTIONS.includes(value)
}

function validatePlatform(value) {
  return VALID_PLATFORMS.includes(value)
}

function validateSessionBody(body) {
  const errors = []
  const { durationMinutes, moodRating, platform, timestamp } = body

  if (!durationMinutes || typeof durationMinutes !== 'number' 
      || durationMinutes < 1 || durationMinutes > 480)
    errors.push('durationMinutes must be a number between 1 and 480')

  if (!moodRating || !Number.isInteger(moodRating) 
      || moodRating < 1 || moodRating > 5)
    errors.push('moodRating must be an integer between 1 and 5')

  if (!platform || !VALID_PLATFORMS.includes(platform))
    errors.push(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`)

  if (!timestamp || isNaN(new Date(timestamp).getTime()))
    errors.push('timestamp must be a valid ISO date string')

  return errors
}

function validateCravingBody(body) {
  const errors = []
  const { trigger, outcome, timestamp } = body

  if (!trigger || !VALID_TRIGGERS.includes(trigger))
    errors.push(`trigger must be one of: ${VALID_TRIGGERS.join(', ')}`)

  if (!outcome || !VALID_OUTCOMES.includes(outcome))
    errors.push(`outcome must be one of: ${VALID_OUTCOMES.join(', ')}`)

  if (!timestamp || isNaN(new Date(timestamp).getTime()))
    errors.push('timestamp must be a valid ISO date string')

  return errors
}

module.exports = { 
  validateIntentionCategory, 
  validatePlatform, 
  validateSessionBody, 
  validateCravingBody,
  VALID_INTENTIONS,
  VALID_PLATFORMS,
}