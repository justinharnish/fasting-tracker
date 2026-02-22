const path = require('path');
const express = require('express');
const cors = require('cors');
const store = require('./store');
const config = require('./config');
const fasting = require('./fasting');

let server = null;

function startApi() {
  const app = express();
  const PORT = process.env.PORT || config.apiPort || 3456;
  const dashboardDir = path.join(__dirname, '..', 'dashboard');

  app.use(cors());
  app.use(express.json());

  // ─── Fasting action endpoints ───

  // POST /api/fast/start — start a fast
  app.post('/api/fast/start', (req, res) => {
    try {
      const { hour, minute } = req.body || {};
      const result = (hour != null && minute != null)
        ? fasting.startFast(hour, minute)
        : fasting.startFastNow();
      console.log(`[API] Fast started: ${result.displayTime} for ${result.fastingDate}`);
      res.json(result);
    } catch (err) {
      console.error('Error starting fast:', err);
      res.status(500).json({ error: 'Failed to start fast' });
    }
  });

  // POST /api/fast/stop — stop a fast
  app.post('/api/fast/stop', (req, res) => {
    try {
      const { hour, minute } = req.body || {};
      const result = (hour != null && minute != null)
        ? fasting.stopFast(hour, minute)
        : fasting.stopFastNow();
      console.log(`[API] Fast stopped: ${result.displayTime} for ${result.fastingDate}`);
      res.json(result);
    } catch (err) {
      console.error('Error stopping fast:', err);
      res.status(500).json({ error: 'Failed to stop fast' });
    }
  });

  // POST /api/fast/update — update the most recent timestamp
  app.post('/api/fast/update', (req, res) => {
    try {
      const { hour, minute } = req.body;
      if (hour == null || minute == null) {
        return res.status(400).json({ error: 'Missing hour and minute' });
      }
      const result = fasting.updateMostRecent(hour, minute);
      if (!result) {
        return res.status(404).json({ error: 'No recent entry to update' });
      }
      console.log(`[API] Updated ${result.field}: ${result.displayTime}`);
      res.json(result);
    } catch (err) {
      console.error('Error updating fast:', err);
      res.status(500).json({ error: 'Failed to update fast' });
    }
  });

  // GET /api/status — current fasting state
  app.get('/api/status', (req, res) => {
    try {
      res.json(fasting.getStatus());
    } catch (err) {
      console.error('Error getting status:', err);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // GET /api/config — time option arrays for UI rendering
  app.get('/api/config', (req, res) => {
    res.json({
      eveningTimeOptions: config.eveningTimeOptions,
      middayTimeOptions: config.middayTimeOptions,
      fastingGoalHours: config.fastingGoalHours,
      timezone: config.timezone,
    });
  });

  // ─── Existing CRUD endpoints ───

  // GET /api/entries — return all entries
  app.get('/api/entries', (req, res) => {
    try {
      const data = store.loadData();
      res.json(data.entries);
    } catch (err) {
      console.error('Error fetching entries:', err);
      res.status(500).json({ error: 'Failed to fetch entries' });
    }
  });

  // POST /api/entry — upsert an entry
  app.post('/api/entry', (req, res) => {
    try {
      const { date, fastStart, fastEnd } = req.body;
      if (!date) return res.status(400).json({ error: 'Missing date' });

      const entry = {
        date,
        fastStart: fastStart || undefined,
        fastEnd: fastEnd || undefined,
      };

      if (entry.fastStart && entry.fastEnd) {
        entry.hoursOfFasting = store.calculateFastingHours(entry.fastStart, entry.fastEnd);
        entry.goalMet = entry.hoursOfFasting >= config.fastingGoalHours;
      }

      const saved = store.upsertEntry(entry);
      console.log(`[API] Upserted entry for ${date}`);
      res.json(saved);
    } catch (err) {
      console.error('Error upserting entry:', err);
      res.status(500).json({ error: 'Failed to upsert entry' });
    }
  });

  // DELETE /api/entry — delete an entry
  app.delete('/api/entry', (req, res) => {
    try {
      const { date } = req.body;
      if (!date) return res.status(400).json({ error: 'Missing date' });

      const data = store.loadData();
      const idx = data.entries.findIndex(e => e.date === date);
      if (idx < 0) return res.status(404).json({ error: 'Entry not found' });

      data.entries.splice(idx, 1);
      store.saveData(data);
      console.log(`[API] Deleted entry for ${date}`);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting entry:', err);
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });

  // ─── Push notification endpoints (added in Phase 5) ───
  try {
    const push = require('./push');

    app.get('/api/vapid-public-key', (req, res) => {
      res.json({ publicKey: config.vapidPublicKey });
    });

    app.post('/api/push/subscribe', (req, res) => {
      try {
        push.addSubscription(req.body);
        res.json({ success: true });
      } catch (err) {
        console.error('Error saving subscription:', err);
        res.status(500).json({ error: 'Failed to save subscription' });
      }
    });

    app.post('/api/push/unsubscribe', (req, res) => {
      try {
        const { endpoint } = req.body;
        push.removeSubscription(endpoint);
        res.json({ success: true });
      } catch (err) {
        console.error('Error removing subscription:', err);
        res.status(500).json({ error: 'Failed to remove subscription' });
      }
    });

    app.post('/api/push/test', async (req, res) => {
      try {
        await push.sendPushToAll({
          title: 'Fasting Tracker',
          body: 'Test notification — push is working!',
        });
        res.json({ success: true });
      } catch (err) {
        console.error('Error sending test push:', err);
        res.status(500).json({ error: 'Failed to send test push' });
      }
    });
  } catch (e) {
    console.log('[API] Push module not available (web-push not installed?) — push endpoints disabled');
  }

  // ─── Serve dashboard as static files at root ───
  app.use(express.static(dashboardDir));

  function listen() {
    server = app.listen(PORT, () => {
      console.log(`[Dashboard + API] http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[API] Port ${PORT} is busy — retrying in 5s...`);
        setTimeout(() => {
          try { server.close(); } catch (e) {}
          listen();
        }, 5000);
      } else {
        console.error('[API] Server error:', err.message);
      }
    });
  }

  listen();
}

function stopApi() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startApi, stopApi };
