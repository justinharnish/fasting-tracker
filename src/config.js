const path = require('path');

module.exports = {
  // Timezone
  timezone: process.env.TIMEZONE || 'America/Denver',

  // Fasting goal in hours
  fastingGoalHours: 16,

  // API / Dashboard port
  apiPort: 3456,

  // Data file path
  dataFilePath: path.join(__dirname, '..', 'data', 'fasting-log.json'),

  // Dashboard data file path (synced copy for file:// access)
  dashboardDataPath: path.join(__dirname, '..', 'dashboard', 'fasting-log.json'),

  // Default fasting times (Mountain Time)
  defaults: {
    fastStartHour: 20, // 8 PM
    fastEndHour: 12,   // 12 PM (noon)
    fastingStartTarget: 19, // 7 PM
  },

  // Button time options (30-min intervals)
  eveningTimeOptions: [
    { text: '7:00 PM', hour: 19, minute: 0 },
    { text: '7:30 PM', hour: 19, minute: 30 },
    { text: '8:00 PM', hour: 20, minute: 0 },
    { text: '8:30 PM', hour: 20, minute: 30 },
    { text: '9:00 PM', hour: 21, minute: 0 },
  ],
  middayTimeOptions: [
    { text: '11:00 AM', hour: 11, minute: 0 },
    { text: '11:30 AM', hour: 11, minute: 30 },
    { text: '12:00 PM', hour: 12, minute: 0 },
    { text: '12:30 PM', hour: 12, minute: 30 },
    { text: '1:00 PM', hour: 13, minute: 0 },
  ],

  // Push notification schedule (cron expressions)
  pushCronEvening: '0 19 * * *',  // 7 PM
  pushCronMidday: '0 12 * * *',   // 12 PM

  // VAPID keys for web push (loaded from .env)
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:fasting-tracker@example.com',
};
