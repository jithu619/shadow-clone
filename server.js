require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const schedule = require('node-schedule');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();

// Middleware
app.use(cors({
  origin: 'https://jithu619.github.io',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Stores
const subscriptions = {};
const otpStore = {};
const jobs = {};

// Log startup
console.log('Server starting...');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
console.log('VAPID_EMAIL:', process.env.VAPID_EMAIL || 'MISSING');

// Routes
app.get('/', (req, res) => {
  res.send('Shadow Clone Backend Running');
});

app.post('/subscribe-push', (req, res) => {
  const { email, subscription } = req.body;
  if (!email || !subscription) return res.status(400).json({ success: false });
  subscriptions[email] = subscription;
  console.log(`Subscribed: ${email}`);
  res.json({ success: true });
});

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid email' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;
  otpStore[email] = { otp, expires };

  try {
    await resend.emails.send({
      from: 'Voice Assistant <onboarding@resend.dev>',
      to: [email],
      subject: 'Your OTP Code',
      html: `<h2>OTP: <strong style="color:#3b82f6;font-size:24px">${otp}</strong></h2><p>Valid for 10 minutes.</p>`
    });
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ success: false, message: 'Email failed' });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.json({ success: false, message: 'No OTP' });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.json({ success: false, message: 'Expired' });
  }
  if (record.otp !== otp) return res.json({ success: false, message: 'Invalid' });

  delete otpStore[email];
  res.json({ success: true });
});

app.post('/schedule-push', (req, res) => {
  const { email, text, reminderTime, id } = req.body;
  const sub = subscriptions[email];
  if (!sub) return res.status(400).json({ success: false });

  const time = new Date(parseInt(reminderTime));
  if (isNaN(time)) return res.status(400).json({ success: false });

  const job = schedule.scheduleJob(time, () => {
    webpush.sendNotification(sub, JSON.stringify({ text, id })).catch(console.error);
    delete jobs[id];
  });
  jobs[id] = job;
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server LIVE on port ${PORT}`);
});