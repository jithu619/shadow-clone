require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const webpush = require('web-push');
const schedule = require('node-schedule');

const app = express();
app.use(cors({ origin: 'https://shadow-clone.netlify.app' }));
app.use(express.json());

// === Resend Setup ===
const resend = new Resend(process.env.RESEND_API_KEY);

// === VAPID Setup ===
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// === In-Memory Stores (use Redis in production) ===
const subscriptions = {};
const otpStore = {};

// === Health Check ===
app.get('/', (req, res) => res.send('Backend OK'));

// === Subscribe to Push ===
app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  if (!email || !subscription) return res.status(400).json({ success: false });
  subscriptions[email] = subscription;
  res.json({ success: true });
});

// === Send OTP ===
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email?.includes('@')) return res.status(400).json({ success: false, message: 'Invalid email' });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  otpStore[email] = { otp, expires };

  try {
    await resend.emails.send({
      from: 'Voice Assistant <onboarding@resend.dev>',
      to: email,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family:Arial;text-align:center;padding:20px">
          <h2 style="color:#3b82f6">Your OTP</h2>
          <p style="font-size:28px;font-weight:bold">${otp}</p>
          <p>Valid for 10 minutes.</p>
        </div>
      `
    });
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// === Verify OTP ===
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.json({ success: false, message: 'No OTP found' });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.json({ success: false, message: 'OTP expired' });
  }
  if (record.otp !== otp) return res.json({ success: false, message: 'Invalid OTP' });

  delete otpStore[email];
  res.json({ success: true });
});

// === Schedule Push Notification ===
app.post('/schedule-push', (req, res) => {
  const { email, text, reminderTime, id } = req.body;
  const sub = subscriptions[email];
  if (!sub) return res.status(400).json({ success: false });

  const time = new Date(parseInt(reminderTime));
  if (isNaN(time)) return res.status(400).json({ success: false });

  schedule.scheduleJob(time, () => {
    webpush.sendNotification(sub, JSON.stringify({ text, id })).catch(console.error);
  });

  res.json({ success: true });
});

// === Start Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
});