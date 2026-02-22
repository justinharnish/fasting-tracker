const config = require('./config');
const store = require('./store');
const timeUtils = require('./time-utils');

function startFast(hour, minute) {
  const fastingDate = timeUtils.getFastingDateForStart();
  const startDate = timeUtils.now().format('YYYY-MM-DD');
  const timestamp = timeUtils.buildTimestamp(startDate, hour, minute);
  const displayTime = timeUtils.formatTime(hour, minute);

  const entry = store.getEntryForDate(fastingDate) || { date: fastingDate };
  entry.fastStart = timestamp;

  if (entry.fastEnd) {
    entry.hoursOfFasting = store.calculateFastingHours(entry.fastStart, entry.fastEnd);
    entry.goalMet = entry.hoursOfFasting >= config.fastingGoalHours;
  }

  store.upsertEntry(entry);

  const goalTime = timeUtils.dayjs(timestamp).add(config.fastingGoalHours, 'hours');
  const goalTimeStr = goalTime.format('h:mm A');

  return { entry, displayTime, goalTimeStr, fastingDate };
}

function stopFast(hour, minute) {
  const fastingDate = timeUtils.getFastingDateForEnd();
  const timestamp = timeUtils.buildTimestamp(fastingDate, hour, minute);
  const displayTime = timeUtils.formatTime(hour, minute);

  const entry = store.getEntryForDate(fastingDate) || { date: fastingDate };
  entry.fastEnd = timestamp;

  if (entry.fastStart) {
    entry.hoursOfFasting = store.calculateFastingHours(entry.fastStart, entry.fastEnd);
    entry.goalMet = entry.hoursOfFasting >= config.fastingGoalHours;
  }

  store.upsertEntry(entry);

  return {
    entry,
    displayTime,
    hours: entry.hoursOfFasting || null,
    goalMet: entry.goalMet || false,
    fastingDate,
  };
}

function startFastNow() {
  const now = timeUtils.now();
  return startFast(now.hour(), now.minute());
}

function stopFastNow() {
  const now = timeUtils.now();
  return stopFast(now.hour(), now.minute());
}

function getStatus() {
  const allEntries = store.getAllEntries();
  const activeEntry = allEntries.find(e => e.fastStart && !e.fastEnd);

  if (activeEntry) {
    const startTime = timeUtils.dayjs(activeEntry.fastStart);
    const now = timeUtils.now();
    const elapsedHours = Math.round((now.diff(startTime) / (1000 * 60 * 60)) * 10) / 10;
    const goalTime = startTime.add(config.fastingGoalHours, 'hours');
    const remainingHours = Math.round((goalTime.diff(now) / (1000 * 60 * 60)) * 10) / 10;
    const goalTimeStr = goalTime.format('h:mm A');

    return { isFasting: true, elapsedHours, remainingHours, goalTimeStr, entry: activeEntry };
  }

  const now = timeUtils.now();
  const target = config.defaults.fastingStartTarget;
  let nextFastTime = now.clone().hour(target).minute(0).second(0);
  if (now.hour() >= target) nextFastTime = nextFastTime.add(1, 'day');
  const hoursUntil = Math.round((nextFastTime.diff(now) / (1000 * 60 * 60)) * 10) / 10;

  return { isFasting: false, hoursUntil, nextFastTimeStr: nextFastTime.format('h:mm A') };
}

function updateMostRecent(hour, minute) {
  const allEntries = store.getAllEntries();
  if (allEntries.length === 0) return null;

  // Find the most recent entry (sorted desc by date)
  const recent = allEntries[0];

  // Determine which field was most recently set
  let field;
  if (recent.fastEnd && recent.fastStart) {
    // Both set — compare timestamps to find which was logged later
    const startTime = new Date(recent.fastStart).getTime();
    const endTime = new Date(recent.fastEnd).getTime();
    field = endTime >= startTime ? 'fastEnd' : 'fastStart';
  } else if (recent.fastEnd) {
    field = 'fastEnd';
  } else if (recent.fastStart) {
    field = 'fastStart';
  } else {
    return null;
  }

  // Build the new timestamp on the same date as the existing one
  const existingTimestamp = recent[field];
  const existingDate = timeUtils.dayjs(existingTimestamp).format('YYYY-MM-DD');
  const newTimestamp = timeUtils.buildTimestamp(existingDate, hour, minute);
  const displayTime = timeUtils.formatTime(hour, minute);

  recent[field] = newTimestamp;

  if (recent.fastStart && recent.fastEnd) {
    recent.hoursOfFasting = store.calculateFastingHours(recent.fastStart, recent.fastEnd);
    recent.goalMet = recent.hoursOfFasting >= config.fastingGoalHours;
  }

  store.upsertEntry(recent);

  return { entry: recent, field, displayTime };
}

module.exports = { startFast, stopFast, startFastNow, stopFastNow, getStatus, updateMostRecent };
