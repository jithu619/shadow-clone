// functions/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { Resend } = require('resend');
const webpush = require('web-push');
const schedule = require('node-schedule');

const app = express();
app.use(cors({ origin: 'https://shadow-clone.netlify.app' }));
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subs = {};
const otps = {};

app.get('/', (req, res) => res.send('OK'));

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email?.includes('@')) return res.status(400).json({ success: false });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otps[email] = { otp, expires: Date.now() + 600000 };

  try {
    await resend.emails.send({
      from: 'Voice Assistant <onboarding@resend.dev>',
      to: email,
      subject: 'Your OTP',
      html: `<h2>OTP: <strong style="color:#3b82f6">${otp}</strong></h2>`
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const rec = otps[email];
  if (rec && Date.now() < rec.expires && rec.otp === otp) {
    delete otps[email];
    res.json({ success: true });
  } else res.json({ success: false });
});

app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  if (email && subscription) {
    subs[email] = subscription;
    res.json({ success: true });
  } else res.status(400).json({ success: false });
});

app.post('/schedule-push', (req, res) => {
  const { email, text, reminderTime, id } = req.body;
  const sub = subs[email];
  if (!sub) return res.status(400).json({ success: false });
  const time = new Date(parseInt(reminderTime));
  schedule.scheduleJob(time, () => {
    webpush.sendNotification(sub, JSON.stringify({ text, id })).catch(() => {});
  });
  res.json({ success: true });
});

// Export for Netlify
module.exports.handler = serverless(app);