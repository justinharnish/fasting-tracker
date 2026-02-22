const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Simple JSON file-based data store for fasting entries.
 *
 * Schema:
 * {
 *   entries: [
 *     {
 *       date: "2026-02-09",           // Date the fast ENDS (eating day)
 *       fastStart: "2026-02-08T20:00:00-07:00",
 *       fastEnd: "2026-02-09T12:00:00-07:00",
 *       hoursOfFasting: 16.0,
 *       goalMet: true
 *     }
 *   ]
 * }
 */

function ensureDataDir() {
  const dir = path.dirname(config.dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadData() {
  ensureDataDir();
  if (!fs.existsSync(config.dataFilePath)) {
    const empty = { entries: [] };
    fs.writeFileSync(config.dataFilePath, JSON.stringify(empty, null, 2));
    return empty;
  }
  const raw = fs.readFileSync(config.dataFilePath, 'utf-8');
  return JSON.parse(raw);
}

function saveData(data) {
  ensureDataDir();
  fs.writeFileSync(config.dataFilePath, JSON.stringify(data, null, 2));
  syncToDashboard(data);
}

function syncToDashboard(data) {
  const dashDir = path.dirname(config.dashboardDataPath);
  if (!fs.existsSync(dashDir)) {
    fs.mkdirSync(dashDir, { recursive: true });
  }
  // Write JSON (for HTTP-served dashboard)
  fs.writeFileSync(config.dashboardDataPath, JSON.stringify(data, null, 2));
  // Write JS module (for file:// opened dashboard)
  const jsPath = path.join(dashDir, 'data.js');
  fs.writeFileSync(jsPath, `window.FASTING_DATA = ${JSON.stringify(data, null, 2)};`);
}

/**
 * Get or create today's entry. "Today" is determined by when the fast ends.
 * If we're recording a fast-start in the evening, the entry date is TOMORROW.
 * If we're recording a fast-end at noon, the entry date is TODAY.
 */
function getEntryForDate(dateStr) {
  const data = loadData();
  return data.entries.find(e => e.date === dateStr) || null;
}

function upsertEntry(entry) {
  const data = loadData();
  const idx = data.entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) {
    data.entries[idx] = { ...data.entries[idx], ...entry };
  } else {
    data.entries.push(entry);
  }
  // Sort by date descending
  data.entries.sort((a, b) => b.date.localeCompare(a.date));
  saveData(data);
  return entry;
}

function calculateFastingHours(fastStart, fastEnd) {
  if (!fastStart || !fastEnd) return null;
  const start = new Date(fastStart);
  const end = new Date(fastEnd);
  const diffMs = end - start;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal
}

function getAllEntries() {
  return loadData().entries;
}

module.exports = {
  loadData,
  saveData,
  getEntryForDate,
  upsertEntry,
  calculateFastingHours,
  getAllEntries,
  syncToDashboard,
};
