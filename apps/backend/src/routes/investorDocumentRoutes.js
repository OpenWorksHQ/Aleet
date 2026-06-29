const express = require('express');
const {
  listAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/investorController');
const requireAdmin = require('../middleware/requireAdmin');
const { uploadInvestorDocument, handleInvestorUploadError } = require('../utils/multer');

const router = express.Router();

// ── Admin — admin JWT required ───────────────────────────────────────────────
// Base path: /api/admin/investor-documents

// List all documents (published + unpublished)
router.get('/', requireAdmin, listAllDocuments);

// Create — multipart form (file required, field name "document")
router.post('/', requireAdmin, uploadInvestorDocument, handleInvestorUploadError, createDocument);

// Update — multipart form (file optional)
router.put('/:id', requireAdmin, uploadInvestorDocument, handleInvestorUploadError, updateDocument);

// Delete document + stored file
router.delete('/:id', requireAdmin, deleteDocument);

module.exports = router;
