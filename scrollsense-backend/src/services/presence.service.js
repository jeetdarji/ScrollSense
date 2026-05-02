/**
 * Presence Service — In-memory online status tracking for group members.
 *
 * No database writes. State is rebuilt from socket reconnections after
 * server restart. This is intentional — presence is ephemeral by nature.
 *
 * Structure: Map<groupId, Map<anonymousName, { socketId, connectedAt }>>
 */

const MAX_ENTRIES = 100000; // Safety bound — refuse additions beyond this
let totalEntries = 0;

/** @type {Map<string, Map<string, { socketId: string, connectedAt: Date }>>} */
const presenceMap = new Map();

/**
 * Mark a member as online in their group.
 *
 * @param {string} groupId
 * @param {string} anonymousName
 * @param {string} socketId
 */
function setOnline(groupId, anonymousName, socketId) {
  if (!groupId || !anonymousName || !socketId) return;

  const gid = groupId.toString();

  if (!presenceMap.has(gid)) {
    // Safety check before creating new group entry
    if (totalEntries >= MAX_ENTRIES) {
      console.warn('[presence] Max entries reached — refusing new online entry');
      return;
    }
    presenceMap.set(gid, new Map());
  }

  const groupPresence = presenceMap.get(gid);

  // Only increment total if this is a genuinely new entry
  if (!groupPresence.has(anonymousName)) {
    if (totalEntries >= MAX_ENTRIES) {
      console.warn('[presence] Max entries reached — refusing new online entry');
      return;
    }
    totalEntries++;
  }

  groupPresence.set(anonymousName, {
    socketId,
    connectedAt: new Date(),
  });
}

/**
 * Mark a member as offline.
 *
 * @param {string} groupId
 * @param {string} anonymousName
 */
function setOffline(groupId, anonymousName) {
  if (!groupId || !anonymousName) return;

  const gid = groupId.toString();
  const groupPresence = presenceMap.get(gid);

  if (groupPresence && groupPresence.has(anonymousName)) {
    groupPresence.delete(anonymousName);
    totalEntries = Math.max(0, totalEntries - 1);

    // Clean up empty group maps
    if (groupPresence.size === 0) {
      presenceMap.delete(gid);
    }
  }
}

/**
 * Get all online member names in a group.
 *
 * @param {string} groupId
 * @returns {string[]} array of anonymousNames currently online
 */
function getOnlineMembers(groupId) {
  if (!groupId) return [];

  const gid = groupId.toString();
  const groupPresence = presenceMap.get(gid);

  if (!groupPresence) return [];
  return Array.from(groupPresence.keys());
}

/**
 * Check if a specific member is online.
 *
 * @param {string} groupId
 * @param {string} anonymousName
 * @returns {boolean}
 */
function isOnline(groupId, anonymousName) {
  if (!groupId || !anonymousName) return false;

  const gid = groupId.toString();
  const groupPresence = presenceMap.get(gid);

  return groupPresence ? groupPresence.has(anonymousName) : false;
}

/**
 * Clear all presence data for a group (e.g. group deletion).
 *
 * @param {string} groupId
 */
function clearGroup(groupId) {
  if (!groupId) return;

  const gid = groupId.toString();
  const groupPresence = presenceMap.get(gid);

  if (groupPresence) {
    totalEntries = Math.max(0, totalEntries - groupPresence.size);
    presenceMap.delete(gid);
  }
}

/**
 * Get the socket ID for a specific online member.
 *
 * @param {string} groupId
 * @param {string} anonymousName
 * @returns {string|null}
 */
function getSocketId(groupId, anonymousName) {
  if (!groupId || !anonymousName) return null;

  const gid = groupId.toString();
  const groupPresence = presenceMap.get(gid);

  if (!groupPresence) return null;
  const entry = groupPresence.get(anonymousName);
  return entry ? entry.socketId : null;
}

module.exports = {
  setOnline,
  setOffline,
  getOnlineMembers,
  isOnline,
  clearGroup,
  getSocketId,
};
