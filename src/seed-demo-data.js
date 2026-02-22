/**
 * Generates 30 days of realistic demo fasting data for testing the dashboard.
 * Run: node src/seed-demo-data.js
 */

const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Denver';
const DATA_PATH = path.join(__dirname, '..', 'data', 'fasting-log.json');
const DASHBOARD_PATH = path.join(__dirname, '..', 'dashboard', 'fasting-log.json');

function randomMinuteOffset(maxMinutes) {
  return Math.floor(Math.random() * maxMinutes * 2) - maxMinutes;
}

function generateEntries(days = 30) {
  const entries = [];
  const today = dayjs().tz(TZ);

  for (let i = 0; i < days; i++) {
    const date = today.subtract(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    const prevDay = date.subtract(1, 'day').format('YYYY-MM-DD');

    // Skip ~10% of days (missed tracking)
    if (Math.random() < 0.1) continue;

    // Fasting start: around 8 PM the previous evening, ±60 min
    const startOffset = randomMinuteOffset(60);
    const fastStart = dayjs.tz(`${prevDay} 20:00`, 'YYYY-MM-DD HH:mm', TZ)
      .add(startOffset, 'minute');

    // Fasting end: around 12 PM, ±90 min
    const endOffset = randomMinuteOffset(90);
    const fastEnd = dayjs.tz(`${dateStr} 12:00`, 'YYYY-MM-DD HH:mm', TZ)
      .add(endOffset, 'minute');

    const hoursOfFasting = Math.round(fastEnd.diff(fastStart, 'minute') / 6) / 10;

    entries.push({
      date: dateStr,
      fastStart: fastStart.toISOString(),
      fastEnd: fastEnd.toISOString(),
      hoursOfFasting,
      goalMet: hoursOfFasting >= 16,
    });
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

const data = { entries: generateEntries(30) };

// Write to both locations
for (const filePath of [DATA_PATH, DASHBOARD_PATH]) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.entries.length} entries to ${filePath}`);
}

// Also write JS module so dashboard works when opened directly (file:// protocol)
const JS_PATH = path.join(__dirname, '..', 'dashboard', 'data.js');
fs.writeFileSync(JS_PATH, `window.FASTING_DATA = ${JSON.stringify(data, null, 2)};`);
console.log(`Wrote embedded data to ${JS_PATH}`);

console.log('\nSample entry:');
console.log(JSON.stringify(data.entries[0], null, 2));
