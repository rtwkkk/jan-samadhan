const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, adminOnlyRoute } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/admin-only', protect, authorize('admin'), adminOnlyRoute);

module.exports = router;
