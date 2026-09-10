const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getKPIs,
  getReviewQueue,
  getMatches,
  assignChallenge,
  updateChallengeStatus,
  getAnalytics,
  getAllInstitutions,
  getAllIndustries,
  getInstitutionById,
  getIndustryById,
  getVerificationQueue,
  updateVerificationStatus
} = require('../controllers/adminController');

// Ensure user is admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const adminOrInstitution = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'institution')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized' });
  }
};

router.get('/kpis', protect, adminOnly, getKPIs);
router.get('/queue', protect, adminOnly, getReviewQueue);
router.get('/verifications', protect, adminOnly, getVerificationQueue);
router.put('/verifications/:id', protect, adminOnly, updateVerificationStatus);
router.get('/match/:id', protect, adminOnly, getMatches);
router.get('/institutions', protect, adminOnly, getAllInstitutions);
router.get('/institutions/:id', protect, adminOnly, getInstitutionById);
router.get('/industries', protect, adminOnly, getAllIndustries);
router.get('/industries/:id', protect, adminOnly, getIndustryById);
router.put('/challenges/:id/assign', protect, adminOnly, assignChallenge);
router.put('/challenges/:id/status', protect, adminOrInstitution, updateChallengeStatus);
router.get('/analytics', protect, adminOnly, getAnalytics);

module.exports = router;
