require('dotenv').config();

const cron = require('node-cron');
const config = require('./config');
const api = require('./api');

// ─── Start Express API + Dashboard ───
api.startApi();

// ─── Push notification cron jobs ───
try {
  const push = require('./push');

  // 7 PM — remind to start fasting
  cron.schedule(config.pushCronEvening, () => {
    console.log(`[${new Date().toISOString()}] Sending evening push notification...`);
    push.sendPushToAll({
      title: 'Fasting Tracker',
      body: 'Time to start fasting — tap to log',
    });
  }, { timezone: config.timezone });

  // 12 PM — remind to break fast
  cron.schedule(config.pushCronMidday, () => {
    console.log(`[${new Date().toISOString()}] Sending midday push notification...`);
    push.sendPushToAll({
      title: 'Fasting Tracker',
      body: 'Time to break your fast — tap to log',
    });
  }, { timezone: config.timezone });

  console.log('Push notifications scheduled (7 PM + 12 PM MT)');
} catch (e) {
  console.log('Push module not available — push notifications disabled');
}

console.log('');
console.log('Fasting Tracker is running!');
console.log(`  Timezone: ${config.timezone}`);
console.log(`  Dashboard: http://localhost:${process.env.PORT || config.apiPort}`);
console.log('');
