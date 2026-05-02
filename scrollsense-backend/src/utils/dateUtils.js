/**
 * Shared week-boundary utility.
 * Every pattern endpoint imports this so "current week" is consistent.
 * Week = Monday 00:00:00 UTC → Sunday 23:59:59 UTC.
 */

function getCurrentWeekBounds(now = new Date()) {
  const utcDay = now.getUTCDay(); // 0=Sun 1=Mon … 6=Sat
  const daysToMonday = utcDay === 0 ? 6 : utcDay - 1;

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setUTCDate(weekStart.getUTCDate() - 7);

  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setUTCDate(weekStart.getUTCDate() - 1);
  lastWeekEnd.setUTCHours(23, 59, 59, 999);

  const fmt = (d) => d.toISOString().split('T')[0];

  // Human-readable label e.g. "MON APR 7 — SUN APR 13"
  const fmtLabel = (d) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  };

  return {
    weekStart,
    weekEnd,
    lastWeekStart,
    lastWeekEnd,
    weekStartString: fmt(weekStart),
    weekEndString: fmt(weekEnd),
    lastWeekStartString: fmt(lastWeekStart),
    lastWeekEndString: fmt(lastWeekEnd),
    dataWindowLabel: `${fmtLabel(weekStart)} — ${fmtLabel(weekEnd)}`,
    lastWeekLabel: `${fmtLabel(lastWeekStart)} — ${fmtLabel(lastWeekEnd)}`,
  };
}

function formatHourLabel(h) {
  if (h === 0) return '12AM';
  if (h < 12) return `${h}AM`;
  if (h === 12) return '12PM';
  return `${h - 12}PM`;
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

module.exports = { getCurrentWeekBounds, formatHourLabel, DAY_NAMES, DAY_NAMES_SHORT };
