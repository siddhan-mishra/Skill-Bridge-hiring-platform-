const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyProfile, upsertMyProfile } = require('../controllers/profileController');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, upsertMyProfile);

module.exports = router;
