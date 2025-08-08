const express = require('express');
const webpush = require('web-push');
const schedule = require('node-schedule');
const app = express();
app.use(express.json());

// Replace with your VAPID keys
const vapidKeys = {
  publicKey: 'YOUR_VAPID_PUBLIC_KEY',
  privateKey: 'YOUR_VAPID_PRIVATE_KEY'
};
webpush.setVapidDetails('mailto:your-email@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

// Store subscriptions (use a database in production)
const subscriptions = {};

// Store scheduled jobs
const jobs = {};

// Subscribe endpoint
app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  subscriptions[email] = subscription;
  res.json({ success: true });
});

// Schedule push notification
app.post('/schedule-push', (req, res) => {
  const { email, text, reminderTime, id } = req.body;
  const subscription = subscriptions[email];
  if (!subscription) {
    return res.json({ success: false, message: 'No subscription found' });
  }
  const job = schedule.scheduleJob(new Date(reminderTime), () => {
    webpush.sendNotification(subscription, JSON.stringify({ text, id }))
      .catch(err => console.error('Push error:', err));
  });
  jobs[id] = job;
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));