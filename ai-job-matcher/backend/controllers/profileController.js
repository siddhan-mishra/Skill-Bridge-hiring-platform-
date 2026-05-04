const Profile = require('../models/profile');
const mongoose = require('mongoose');

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    res.json(profile || null);
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.upsertMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { ...req.body, user: req.user._id },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    console.error('upsertMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/profile/:userId — public profile (any logged-in user)
exports.getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Guard: reject obviously bad IDs before hitting Mongoose
    if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const profile = await Profile
      .findOne({ user: userId })
      .populate('user', 'name email role')
      .lean();

    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error('getProfileByUserId error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
