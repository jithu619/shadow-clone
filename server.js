const express = require('express');
const webpush = require('web-push');
const schedule = require('node-schedule');
const cors = require('cors');
const { Resend } = require('resend'); 
const resend = new Resend(process.env.RESEND_API_KEY);
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

// Store subscriptions,otp and jobs
const subscriptions = {};
const otpStore = {};
const jobs = {};

app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  subscriptions[email] = subscription;
  console.log(`Subscribed ${email} at ${new Date().toISOString()}`);
  res.json({ success: true });
});

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.json({ success: false, message: 'Invalid email' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store OTP
  otpStore[email] = { otp, expires };

  try {
    await resend.emails.send({
      from: 'Voice Assistant <onboarding@resend.dev>', // Change to your verified sender
      to: [email],
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Your OTP Code</h2>
          <p style="font-size: 24px; font-weight: bold; color: #3b82f6;">${otp}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Email send error:', error);
    res.json({ success: false, message: 'Failed to send OTP' });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res.json({ success: false, message: 'No OTP requested' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.json({ success: false, message: 'OTP expired' });
  }

  if (record.otp !== otp) {
    return res.json({ success: false, message: 'Invalid OTP' });
  }

  // OTP valid
  delete otpStore[email];
  res.json({ success: true });
});

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

app.post('/send-otp', (req, res) => {
  res.json({ success: true, message: 'OTP sent' });
});

app.post('/verify-otp', (req, res) => {
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));