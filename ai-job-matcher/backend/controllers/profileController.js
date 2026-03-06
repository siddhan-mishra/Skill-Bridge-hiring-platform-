const Profile = require('../models/profile');

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
    const data = req.body;
    const profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { ...data, user: req.user._id },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    console.error('upsertMyProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
