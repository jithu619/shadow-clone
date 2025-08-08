const express = require('express');
const webpush = require('web-push');
const schedule = require('node-schedule');
const app = express();
app.use(express.json());

// Load environment variables
require('dotenv').config();

// VAPID configuration
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};
webpush.setVapidDetails(process.env.VAPID_EMAIL, vapidKeys.publicKey, vapidKeys.privateKey);

// Store subscriptions and jobs (use a database in production)
const subscriptions = {};
const jobs = {};

// Subscribe endpoint
app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  subscriptions[email] = subscription;
  console.log(`Subscribed ${email}`);
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
    delete jobs[id];
  });
  jobs[id] = job;
  console.log(`Scheduled push for ${id} at ${new Date(reminderTime)}`);
  res.json({ success: true });
});

// OTP endpoints (from previous setup)
app.post('/send-otp', (req, res) => {
  // Your existing OTP logic
  res.json({ success: true, message: 'OTP sent' }); // Placeholder
});

app.post('/verify-otp', (req, res) => {
  // Your existing OTP verification logic
  res.json({ success: true }); // Placeholder
});

app.listen(3000, () => console.log('Server running on port 3000'));