const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMatchesForCurrentSeeker } = require('../controllers/matchController');

router.get('/my-jobs', protect, getMatchesForCurrentSeeker);

module.exports = router;
