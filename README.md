# Fasting Tracker

A personal 16:8 intermittent fasting tracker with a web dashboard, action buttons, and push notifications.

## Features

- **Dashboard**: Color-coded bar chart, stats, live status card, click-to-edit
- **Action Buttons**: Start / Stop / Update fast with preset times or custom input
- **Push Notifications**: 7 PM and 12 PM reminders via web push (PWA)
- **Mobile-Friendly**: Add to Home Screen, touch-friendly, responsive layout
- **Cloud Hosted**: Fly.io with persistent volume — accessible from any device

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3456
```

## Push Notifications

Generate VAPID keys and add to `.env`:

```bash
npx web-push generate-vapid-keys
```

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

On mobile: add the site to your Home Screen, then tap "Enable Notifications" on the dashboard.

## Deploy to Fly.io

```bash
fly launch
fly volumes create fasting_data --region den --size 1
fly secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=...
fly deploy
```

Migrate existing data:

```bash
fly sftp shell
put data/fasting-log.json /app/data/fasting-log.json
```

## Project Structure

```
fasting-tracker/
├── src/
│   ├── app.js           # Entrypoint (Express + push cron)
│   ├── api.js           # REST API + static server
│   ├── fasting.js       # Core fasting logic
│   ├── push.js          # Web push notification module
│   ├── config.js        # Configuration & constants
│   ├── store.js         # JSON file data store
│   └── time-utils.js    # Timezone & time utilities
├── dashboard/
│   ├── index.html       # Dashboard (served at /)
│   ├── manifest.json    # PWA manifest
│   ├── sw.js            # Service worker
│   └── icon-*.png       # App icons
├── data/
│   └── fasting-log.json # Primary data file
├── Dockerfile
├── fly.toml
└── package.json
```

## Environment Variables

```
TIMEZONE=America/Denver
PORT=3456
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

## Docker

```bash
docker build -t fasting-tracker .
docker run -p 3456:3456 -v $(pwd)/data:/app/data --env-file .env fasting-tracker
```
