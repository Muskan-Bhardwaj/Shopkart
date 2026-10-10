const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// 1. Login Handler
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database is not connected' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      customer: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Register Handler
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name, valid email, and password with at least 6 characters'
      });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database is not connected' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email: cleanEmail, password: hashedPassword });

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      customer: { id: newUser._id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// MUST EXPORT BOTH FUNCTIONS EXACTLY LIKE THIS
module.exports = {
  loginCustomer,
  registerCustomer
};