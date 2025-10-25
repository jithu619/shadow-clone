const express = require('express');
const webpush = require('web-push');
const schedule = require('node-schedule');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors({
  origin: 'https://jithu619.github.io',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
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
// Store subscriptions and jobs
const subscriptions = {};
const jobs = {};

// Subscribe endpoint
app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  subscriptions[email] = subscription;
  console.log(`Subscribed ${email} at ${new Date().toISOString()}`);
  res.json({ success: true });
});

// Schedule push notification
app.post('/schedule-push', (req, res) => {
  const { email, text, reminderTime, id } = req.body;
  const subscription = subscriptions[email];
  if (!subscription) {
    console.error(`No subscription for ${email}`);
    return res.json({ success: false, message: 'No subscription found' });
  }
  const scheduleTime = new Date(parseInt(reminderTime));
  if (isNaN(scheduleTime.getTime())) {
    console.error(`Invalid reminderTime: ${reminderTime}`);
    return res.json({ success: false, message: 'Invalid reminder time' });
  }
  const job = schedule.scheduleJob(scheduleTime, () => {
    console.log(`Sending push for ${id} at ${new Date().toISOString()}`);
    webpush.sendNotification(subscription, JSON.stringify({ text, id }))
      .catch(err => console.error('Push error:', err));
    delete jobs[id];
  });
  jobs[id] = job;
  console.log(`Scheduled push for ${id} at ${scheduleTime.toISOString()}`);
  res.json({ success: true });
});

// OTP endpoints (placeholder)
app.post('/send-otp', (req, res) => {
  res.json({ success: true, message: 'OTP sent' });
});

app.post('/verify-otp', (req, res) => {
  res.json({ success: true });
});