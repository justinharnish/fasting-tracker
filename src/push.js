const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const config = require('./config');

const SUBSCRIPTIONS_PATH = path.join(__dirname, '..', 'data', 'push-subscriptions.json');

// Configure web-push with VAPID credentials
if (config.vapidPublicKey && config.vapidPrivateKey) {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey,
  );
}

function loadSubscriptions() {
  if (!fs.existsSync(SUBSCRIPTIONS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSubscriptions(subs) {
  const dir = path.dirname(SUBSCRIPTIONS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SUBSCRIPTIONS_PATH, JSON.stringify(subs, null, 2));
}

function addSubscription(sub) {
  const subs = loadSubscriptions();
  // Avoid duplicates by endpoint
  const idx = subs.findIndex(s => s.endpoint === sub.endpoint);
  if (idx >= 0) {
    subs[idx] = sub;
  } else {
    subs.push(sub);
  }
  saveSubscriptions(subs);
}

function removeSubscription(endpoint) {
  const subs = loadSubscriptions().filter(s => s.endpoint !== endpoint);
  saveSubscriptions(subs);
}

async function sendPushToAll(payload) {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    console.log('[Push] VAPID keys not configured — skipping push');
    return;
  }

  const subs = loadSubscriptions();
  const expired = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        expired.push(sub.endpoint);
      } else {
        console.error('[Push] Send failed:', err.message);
      }
    }
  }

  // Remove expired subscriptions
  if (expired.length > 0) {
    const remaining = subs.filter(s => !expired.includes(s.endpoint));
    saveSubscriptions(remaining);
    console.log(`[Push] Removed ${expired.length} expired subscription(s)`);
  }
}

module.exports = { addSubscription, removeSubscription, sendPushToAll };
