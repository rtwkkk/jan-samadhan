const express = require('express');
const router = express.Router();
const { getStats, trackEntity, getCompletedChallenges } = require('../controllers/publicController');

router.get('/stats', getStats);
router.get('/track/:id', trackEntity);
router.get('/challenges/completed', getCompletedChallenges);

module.exports = router;
