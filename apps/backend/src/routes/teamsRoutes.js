const express = require('express');
const {
  getPublishedDocuments,
  createSubmission,
} = require('../controllers/investorController');

const router = express.Router();

// ── Public — no auth ─────────────────────────────────────────────────────────

// List published investor documents
router.get('/documents', getPublishedDocuments);

// Receive an investor/operator/legal submission
router.post('/submissions', createSubmission);

module.exports = router;
