const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Replace the connection string with your MongoDB Atlas connection string
const mongoUri = 'mongodb+srv://Khaleal:khalil1234@cluster0.tln7a.mongodb.net/mydbase?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  captcha: String,
  verificationCode: String,
  verificationExpires: Date,
  isVerified: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

app.post('/api/register', async (req, res) => {
  const { email, username, password, confirmPassword, captcha } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = crypto.randomBytes(3).toString('hex');
  const verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  const newUser = new User({ email, username, password: hashedPassword, captcha, verificationCode, verificationExpires });
  await newUser.save();

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Your Verification Code',
    html: `
      <p>Hello ${username},</p>
      <p>Your 2FA code is:</p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-style: italic;">
        ${verificationCode}
      </p>
      <p>
        Best wishes,<br>EmailJS team
      </p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error('Error sending email:', error);
    }
    console.log('Email sent:', info.response);
  });

  res.status(201).json({ message: 'User registered successfully. Please check your email for the verification code.', verificationCode });
});

app.post('/api/verify', async (req, res) => {
  const { email, verificationCode } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Invalid email or verification code');
  }

  if (user.verificationCode !== verificationCode || user.verificationExpires < Date.now()) {
    return res.status(400).send('Invalid or expired verification code');
  }

  user.verificationCode = null;
  user.verificationExpires = null;
  user.isVerified = true;
  await user.save();

  res.status(200).send('Verification successful');
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});