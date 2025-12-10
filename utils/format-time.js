const moment = require('moment-timezone');

/**
 * Formats a Date/timestamp to 'HH:mm z' in Europe/London timezone.
 * @param {Date|string|number} date
 * @returns {string}
 */
function formatLondonTime(date) {
  return moment(date).tz('Europe/London').format('HH:mm z');
}

/**
 * Converts a duration in minutes to a human-readable string.
 * Example: 135 -> "2 hours, 15 minutes"
 * @param {number} minutes
 * @returns {string}
 */
function formatTime(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return "0 minutes";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hStr = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const mStr = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
  return [hStr, mStr].filter(Boolean).join(', ') || '0 minutes';
}

module.exports = {
  formatLondonTime,
  formatTime
};