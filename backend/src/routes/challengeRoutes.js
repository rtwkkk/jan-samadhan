const express = require('express');
const router = express.Router();
const { submitChallenge, getChallenges, getChallenge, getMyChallenges, respondToInformationRequest } = require('../controllers/challengeController');
const upload = require('../utils/upload');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public route to submit a challenge (multipart form data)
router.post('/', optionalAuth, upload.single('supportingDocument'), submitChallenge);

// Get user's challenges
router.get('/my', protect, getMyChallenges);

// Respond to information request
router.post('/:id/respond', protect, upload.single('supportingDocument'), respondToInformationRequest);

// Get single challenge (Public/Private logic handled in controller)
router.get('/:id', optionalAuth, getChallenge);

// Admin route to get all challenges
router.get('/', protect, authorize('admin'), getChallenges);

module.exports = router;
