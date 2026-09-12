const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const industryController = require('../controllers/industryController');

// All routes are protected and for 'industry' only
router.use(protect);
router.use(authorize('industry'));

router.get('/stats', industryController.getIndustryStats);
router.get('/challenges/open', industryController.getOpenChallenges);
router.get('/collaborations/active', industryController.getActiveCollaborations);
router.get('/csr/requests', industryController.getCSRRequests);
router.get('/profile', industryController.getIndustryProfile);
router.get('/notifications', industryController.getNotifications);

module.exports = router;
