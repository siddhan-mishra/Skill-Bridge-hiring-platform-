const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyProfile, upsertMyProfile, getProfileByUserId } = require('../controllers/profileController');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, upsertMyProfile);
router.get('/:userId', getProfileByUserId);

module.exports = router;
