const express = require('express');
const router = express.Router();
const upload = require('../utils/upload');
const evidenceController = require('../controllers/evidenceController');

// Public routes (accessed from email link — no auth required)

// GET  /api/evidence/:leadId — Fetch voice call info for the upload page
router.get('/:leadId', evidenceController.getEvidenceInfo);

// POST /api/evidence/:leadId — Submit location + uploaded files
router.post('/:leadId', upload.array('files', 5), evidenceController.submitEvidence);

module.exports = router;
