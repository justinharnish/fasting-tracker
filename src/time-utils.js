const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const config = require('./config');

/**
 * Get the current time in the configured timezone.
 */
function now() {
  return dayjs().tz(config.timezone);
}

/**
 * Build an ISO timestamp for a given hour/minute on a given date in Mountain Time.
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number} hour - 0-23
 * @param {number} minute - 0-59
 */
function buildTimestamp(dateStr, hour, minute) {
  return dayjs.tz(`${dateStr} ${hour}:${minute}`, 'YYYY-MM-DD H:m', config.timezone).toISOString();
}

/**
 * Get the "fasting date" — the date the fast ENDS.
 * - If it's evening (fast start), the fasting date is TOMORROW.
 * - If it's midday (fast end), the fasting date is TODAY.
 */
function getFastingDateForStart() {
  return now().add(1, 'day').format('YYYY-MM-DD');
}

function getFastingDateForEnd() {
  return now().format('YYYY-MM-DD');
}

/**
 * Parse a custom time string like "8:45pm" or "12:15 PM" into { hour, minute }.
 * Returns null if parsing fails.
 */
function parseCustomTime(input) {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');

  // Try patterns: "8:45pm", "8pm", "20:45", "8:45 PM"
  const patterns = [
    /^(\d{1,2}):(\d{2})\s*(am|pm)$/,
    /^(\d{1,2})\s*(am|pm)$/,
    /^(\d{1,2}):(\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;

    let hour = parseInt(match[1], 10);
    const minute = match[2] && !match[2].match(/am|pm/) ? parseInt(match[2], 10) : 0;
    const ampm = match[match.length - 1];

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
}

/**
 * Format hour/minute to a display string like "8:00 PM".
 */
function formatTime(hour, minute) {
  const d = dayjs().hour(hour).minute(minute);
  return d.format('h:mm A');
}

module.exports = {
  now,
  buildTimestamp,
  getFastingDateForStart,
  getFastingDateForEnd,
  parseCustomTime,
  formatTime,
  dayjs,
};
