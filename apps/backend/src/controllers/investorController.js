/**
 * controllers/investorController.js
 * ---------------------------------------------------------------------------
 * Investor feature:
 *   Public:
 *     GET  /api/teams/documents      — list PUBLISHED documents
 *     POST /api/teams/submissions    — receive an investor/operator/legal lead
 *   Admin (admin JWT):
 *     GET    /api/admin/investor-documents      — list ALL documents
 *     POST   /api/admin/investor-documents      — create (multipart, file required)
 *     PUT    /api/admin/investor-documents/:id  — update (multipart, file optional)
 *     DELETE /api/admin/investor-documents/:id  — delete document + stored file
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');

const InvestorDocument   = require('../models/InvestorDocument');
const InvestorSubmission = require('../models/InvestorSubmission');
const { sendInvestorSubmissionEmail } = require('../services/emailService');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
} = require('../utils/responseHelper');

const VALID_ROLES = ['investor', 'operator', 'legal', 'other'];
const INVESTOR_UPLOAD_DIR = path.join(__dirname, '../../uploads/investor');

// ---------------------------------------------------------------------------
// Build a full, publicly-accessible URL for a stored investor file.
// Prefers API_URL/APP_URL/APP_BASE_URL env; falls back to the request host so
// the URL is always absolute regardless of deployment config.
// ---------------------------------------------------------------------------
function buildFileUrl(req, storedFileName) {
  const envBase = (process.env.API_URL || process.env.APP_URL || process.env.APP_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const base = envBase || `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/investor/${storedFileName}`;
}

// ---------------------------------------------------------------------------
// Shape a document for API responses
// ---------------------------------------------------------------------------
function toDocumentDTO(doc, req, { includeAdminFields = false } = {}) {
  const base = {
    _id: doc._id,
    label: doc.label,
    title: doc.title,
    fileUrl: buildFileUrl(req, doc.storedFileName),
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sortOrder: doc.sortOrder,
  };
  if (includeAdminFields) {
    base.isPublished = doc.isPublished;
    base.createdAt = doc.createdAt;
    base.updatedAt = doc.updatedAt;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Parse a multipart "isPublished" value ("true"/"false"/true/false) → boolean
// ---------------------------------------------------------------------------
function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

// ---------------------------------------------------------------------------
// Delete a stored file (best-effort — logs but never throws)
// ---------------------------------------------------------------------------
function removeStoredFile(storedFileName) {
  if (!storedFileName) return;
  const filePath = path.join(INVESTOR_UPLOAD_DIR, storedFileName);
  fs.promises.unlink(filePath).catch((err) => {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete investor file:', storedFileName, err.message);
    }
  });
}

// ===========================================================================
// PUBLIC
// ===========================================================================

/**
 * GET /api/teams/documents
 * Published documents only, sorted by sortOrder then createdAt.
 */
const getPublishedDocuments = asyncHandler(async (req, res) => {
  try {
    const docs = await InvestorDocument.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const data = docs.map((d) => toDocumentDTO(d, req));
    return sendSuccess(res, 200, 'Documents retrieved successfully', data);
  } catch (error) {
    console.error('getPublishedDocuments Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve documents');
  }
});

/**
 * POST /api/teams/submissions
 * Validate, persist, and email the company inbox.
 */
const createSubmission = asyncHandler(async (req, res) => {
  try {
    const {
      fullName,
      role,
      linkedinOrWebsite = null,
      background = null,
      email = null,
      phoneOrCalendly = null,
    } = req.body || {};

    // Validation
    if (!fullName || !String(fullName).trim()) {
      return sendValidationError(res, 'fullName is required');
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return sendValidationError(res, `role is required and must be one of: ${VALID_ROLES.join(', ')}`);
    }
    const hasEmail = email && String(email).trim();
    const hasPhone = phoneOrCalendly && String(phoneOrCalendly).trim();
    if (!hasEmail && !hasPhone) {
      return sendValidationError(res, 'At least one of email or phoneOrCalendly is required');
    }

    // Persist first so a lead is never lost even if email fails
    const submission = await InvestorSubmission.create({
      fullName: String(fullName).trim(),
      role,
      linkedinOrWebsite: linkedinOrWebsite ? String(linkedinOrWebsite).trim() : null,
      background: background ? String(background).trim() : null,
      email: hasEmail ? String(email).trim().toLowerCase() : null,
      phoneOrCalendly: hasPhone ? String(phoneOrCalendly).trim() : null,
    });

    // Email the company inbox (non-blocking on failure — lead is already saved)
    try {
      await sendInvestorSubmissionEmail({
        fullName: submission.fullName,
        role: submission.role,
        linkedinOrWebsite: submission.linkedinOrWebsite,
        background: submission.background,
        email: submission.email,
        phoneOrCalendly: submission.phoneOrCalendly,
      });
      submission.emailSent = true;
      await submission.save();
    } catch (mailErr) {
      console.error('Investor submission email failed (lead still saved):', mailErr.message);
    }

    return sendSuccess(res, 201, 'Submission received successfully');
  } catch (error) {
    console.error('createSubmission Error:', error);
    return sendError(res, 500, error.message || 'Failed to submit');
  }
});

// ===========================================================================
// ADMIN
// ===========================================================================

/**
 * GET /api/admin/investor-documents
 * All documents (published + unpublished), sorted by sortOrder then createdAt.
 */
const listAllDocuments = asyncHandler(async (req, res) => {
  try {
    const docs = await InvestorDocument.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const data = docs.map((d) => toDocumentDTO(d, req, { includeAdminFields: true }));
    return sendSuccess(res, 200, 'Documents retrieved successfully', data);
  } catch (error) {
    console.error('listAllDocuments Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve documents');
  }
});

/**
 * POST /api/admin/investor-documents
 * Create a document. File is required.
 * Multipart fields: label, title, isPublished, sortOrder, document (file)
 */
const createDocument = asyncHandler(async (req, res) => {
  try {
    const { label, title, isPublished, sortOrder } = req.body || {};

    if (!label || !String(label).trim()) {
      if (req.file) removeStoredFile(req.file.filename);
      return sendValidationError(res, 'label is required');
    }
    if (!title || !String(title).trim()) {
      if (req.file) removeStoredFile(req.file.filename);
      return sendValidationError(res, 'title is required');
    }
    if (!req.file) {
      return sendValidationError(res, 'document file is required');
    }

    const doc = await InvestorDocument.create({
      label: String(label).trim(),
      title: String(title).trim(),
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      mimeType: req.file.mimetype,
      isPublished: parseBoolean(isPublished, false),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      createdBy: req.user?._id || req.user?.id || null,
    });

    return sendSuccess(res, 201, 'Document created successfully', toDocumentDTO(doc, req, { includeAdminFields: true }));
  } catch (error) {
    console.error('createDocument Error:', error);
    if (req.file) removeStoredFile(req.file.filename);
    return sendError(res, 500, error.message || 'Failed to create document');
  }
});

/**
 * PUT /api/admin/investor-documents/:id
 * Update a document. File is optional — when present it replaces the old file.
 * Multipart fields: label, title, isPublished, sortOrder, document (optional file)
 */
const updateDocument = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { label, title, isPublished, sortOrder } = req.body || {};

    const doc = await InvestorDocument.findById(id);
    if (!doc) {
      if (req.file) removeStoredFile(req.file.filename);
      return sendNotFound(res, 'Document not found');
    }

    if (label !== undefined) {
      if (!String(label).trim()) {
        if (req.file) removeStoredFile(req.file.filename);
        return sendValidationError(res, 'label cannot be empty');
      }
      doc.label = String(label).trim();
    }

    if (title !== undefined) {
      if (!String(title).trim()) {
        if (req.file) removeStoredFile(req.file.filename);
        return sendValidationError(res, 'title cannot be empty');
      }
      doc.title = String(title).trim();
    }

    if (isPublished !== undefined) {
      doc.isPublished = parseBoolean(isPublished, doc.isPublished);
    }

    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) {
      doc.sortOrder = Number(sortOrder);
    }

    // Replace file if a new one was uploaded
    if (req.file) {
      const oldStored = doc.storedFileName;
      doc.fileName = req.file.originalname;
      doc.storedFileName = req.file.filename;
      doc.mimeType = req.file.mimetype;
      // Delete the previous file after swapping references
      removeStoredFile(oldStored);
    }

    await doc.save();

    return sendSuccess(res, 200, 'Document updated successfully', toDocumentDTO(doc, req, { includeAdminFields: true }));
  } catch (error) {
    console.error('updateDocument Error:', error);
    if (req.file) removeStoredFile(req.file.filename);
    return sendError(res, 500, error.message || 'Failed to update document');
  }
});

/**
 * DELETE /api/admin/investor-documents/:id
 * Delete the document record and its stored file.
 */
const deleteDocument = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await InvestorDocument.findById(id);
    if (!doc) return sendNotFound(res, 'Document not found');

    const storedFileName = doc.storedFileName;
    await doc.deleteOne();
    removeStoredFile(storedFileName);

    return sendSuccess(res, 200, 'Document deleted successfully', { _id: id });
  } catch (error) {
    console.error('deleteDocument Error:', error);
    return sendError(res, 500, error.message || 'Failed to delete document');
  }
});

module.exports = {
  // public
  getPublishedDocuments,
  createSubmission,
  // admin
  listAllDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
};
