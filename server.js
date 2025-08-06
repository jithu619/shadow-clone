const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // App Password
  }
});

const otps = {};

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.json({ success: false, message: 'Invalid email.' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = otp;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Voice Assistant',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, otp }); // Return OTP for local testing
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid OTP.' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on port ' + (process.env.PORT || 3000));
});