// authController.js — register / login / getMe
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'All fields are required' });

    if (!['seeker', 'recruiter'].includes(role))
      return res.status(400).json({ message: 'Role must be seeker or recruiter' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, password: hashed, role });
    const token  = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[authController] register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[authController] login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('[authController] getMe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    const ok   = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password incorrect' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[authController] changePassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
