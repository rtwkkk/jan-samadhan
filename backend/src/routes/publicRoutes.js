const express = require('express');
const router = express.Router();
const { getStats, trackEntity } = require('../controllers/publicController');

router.get('/stats', getStats);
router.get('/track/:id', trackEntity);

module.exports = router;
