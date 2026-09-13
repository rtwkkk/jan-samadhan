const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const universityController = require('../controllers/universityController');

// All routes are protected and for 'institution' only
router.use(protect);
router.use(authorize('institution'));

router.get('/stats', universityController.getUniversityStats);
router.get('/challenges/assigned', universityController.getAssignedChallenges);
router.get('/projects/active', universityController.getActiveProjects);
router.get('/projects/proposals', universityController.getProjectProposals);

router.route('/teams')
  .get(universityController.getStudentTeams)
  .post(universityController.createStudentTeam);

router.route('/teams/:id')
  .put(universityController.updateStudentTeam)
  .delete(universityController.deleteStudentTeam);

router.get('/collaborations/industry', universityController.getIndustryCollaborations);
router.get('/research-innovation', universityController.getResearchInnovation);
router.get('/impact-metrics', universityController.getImpactMetrics);
router.get('/profile', universityController.getUniversityProfile);
router.get('/milestones', universityController.getMilestones);
router.get('/notifications', universityController.getNotifications);

module.exports = router;
