const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Replace the connection string with your MongoDB Atlas connection string
const mongoUri = 'mongodb+srv://Khaleal:khalil123@cluster0.tln7a.mongodb.net/mydbase?retryWrites=true&w=majority&appName=Cluster0';

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

const taskSchema = new mongoose.Schema({
  title: String,
  start: Date,
  end: Date,
  description: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'in progress' }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

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

  res.status(201).json({ message: 'User registered successfully. Please check your email for the verification code.', verificationCode });
});

app.post('/api/verify', async (req, res) => {
  const { email, verificationCode } = req.body;

  console.log(`Verifying code for email: ${email}, code: ${verificationCode}`);

  const user = await User.findOne({ email });
  if (!user) {
    console.log('Invalid email');
    return res.status(400).send('Invalid email or verification code');
  }

  if (user.verificationCode !== verificationCode || user.verificationExpires < Date.now()) {
    console.log('Invalid or expired verification code');
    return res.status(400).send('Invalid or expired verification code');
  }

  user.verificationCode = null;
  user.verificationExpires = null;
  user.isVerified = true;
  await user.save();

  res.status(200).send('Verification successful');
});

app.post('/api/login', async (req, res) => {
  const { email, password, captcha } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).send('Invalid email or password');
  }

  let role = 'user';
  if (user._id.toString() === '675377c4a30574f5356ce976') {
    role = 'admin';
  } else if (['674e2489b7ca46dcfcb80acc', '674e4282b6cd89467793bff5'].includes(user._id.toString())) {
    role = 'privileged';
  }

  res.status(200).json({ message: 'Login successful', role, username: user.username });
});

// Endpoint to fetch all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username email');
  res.status(200).json(users);
});

// Endpoint to delete a user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.status(200).send('User deleted successfully');
});

// Endpoint to save tasks
app.post('/api/tasks', async (req, res) => {
  const { title, start, end, description } = req.body;
  const newTask = new Task({ title, start, end, description });
  await newTask.save();
  res.status(201).json(newTask);
});

// Endpoint to fetch all tasks
app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find({}).populate('userId', 'username email');
  res.status(200).json(tasks);
});

// Endpoint to update task status
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const task = await Task.findByIdAndUpdate(id, { status }, { new: true });
  res.status(200).json(task);
});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.array('files'), (req, res) => {
  res.status(200).send('Files uploaded successfully');
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});