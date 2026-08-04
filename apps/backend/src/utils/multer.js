// utils/multer.js (upload definitions — storage engine comes from uploadStorage.js)
const multer = require('multer');
const path = require('path');
const {
  usingS3,
  baseUploadDir,
  createUploadStorage,
} = require('./uploadStorage');

// Local upload roots. When AWS_S3_BUCKET is set these are unused (nothing is
// written to disk) but the paths are still exported so callers that clean up
// legacy local files keep working.
const uploadsDir = baseUploadDir();
const investorDir = path.join(uploadsDir, 'investor');

// ── Filename safety ─────────────────────────────────────────────────────────
// Never reuse the client-supplied extension: `path.extname(file.originalname)`
// happily yields ".php", ".svg" or "" and the value is attacker-controlled. The
// stored extension is derived from the (validated) MIME type instead, and the
// original extension only has to agree with it.

/** Allowed image uploads: MIME → accepted extensions (first = canonical). */
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

/**
 * Investor data-room uploads. Broader than images because the data room holds
 * decks and financial models — every entry is still an explicit MIME →
 * extension pair, and these routes are admin-only (see investorDocumentRoutes).
 */
const ALLOWED_INVESTOR_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const IMAGE_REJECTED_MESSAGE =
  'Only JPG, JPEG, PNG and WEBP image files are allowed!';
const INVESTOR_REJECTED_MESSAGE =
  'Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, WEBP.';

/** Build a fileFilter that validates BOTH the MIME type and the extension. */
const makeFileFilter = (allowedTypes, message) => (req, file, cb) => {
  const extensions = allowedTypes[file.mimetype];
  if (!extensions) return cb(new Error(message), false);

  const originalExt = path.extname(file.originalname || '').toLowerCase();
  // An extension is optional (some clients send none) but when present it must
  // match the declared MIME type — no ".pdf.exe" smuggling.
  if (originalExt && !extensions.includes(originalExt)) {
    return cb(new Error(message), false);
  }

  return cb(null, true);
};

/** Build a filename generator that derives the extension from the allowlist. */
const makeFilenameGenerator = (allowedTypes) => (req, file, cb) => {
  const extensions = allowedTypes[file.mimetype];
  if (!extensions) return cb(new Error('Unsupported file type'));

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  // Field names come from our own route definitions, but sanitise anyway so a
  // crafted multipart part name can never influence the stored path.
  const safeField = String(file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
  return cb(null, `${safeField || 'file'}-${uniqueSuffix}${extensions[0]}`);
};

// ── Image uploads (driver documents, avatars) ───────────────────────────────
const upload = multer({
  storage: createUploadStorage({
    subdir: '',
    filename: makeFilenameGenerator(ALLOWED_IMAGE_TYPES),
  }),
  fileFilter: makeFileFilter(ALLOWED_IMAGE_TYPES, IMAGE_REJECTED_MESSAGE),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Define multer fields for driver documents (step 3)
const uploadDriverDocuments = upload.fields([
  { name: 'licenseImage', maxCount: 1 },
  { name: 'vehicleImage', maxCount: 1 },
  { name: 'forHireLicenseImage', maxCount: 1 },
]);

// Define multer fields for driver signup complete (step 4)
const uploadDriverComplete = upload.fields([
  { name: 'forHireLicenseImage', maxCount: 1 },
]);

// No-file upload — parses multipart/form-data body fields only (no files expected)
const uploadNone = upload.none();

// Single for-hire license image upload (used by admin to attach Aleet-generated license)
const uploadSingleForHireLicense = upload.single('forHireLicenseImage');

// Avatar upload (used by /api/users/contact-info)
const uploadAvatar = upload.fields([
  { name: 'avatar', maxCount: 1 },
]);

// ── Investor data-room documents ────────────────────────────────────────────
// Stored under uploads/investor/ so they're served at /uploads/investor/<file>
// — a path the /uploads auth gate restricts to admins.
const investorUpload = multer({
  storage: createUploadStorage({
    subdir: 'investor',
    filename: makeFilenameGenerator(ALLOWED_INVESTOR_TYPES),
  }),
  fileFilter: makeFileFilter(ALLOWED_INVESTOR_TYPES, INVESTOR_REJECTED_MESSAGE),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — documents can be larger than images
});

// Single investor document upload — field name is "document"
const uploadInvestorDocument = investorUpload.single('document');

// Error handler tailored to investor uploads (handles the doc-type message too)
const handleInvestorUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 25MB.' });
    }
    return res.status(400).json({ success: false, message: 'File upload error: ' + error.message });
  } else if (error && /Unsupported file type/.test(error.message || '')) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next(error);
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      error: 'File upload error: ' + error.message
    });
  } else if (error && error.message === IMAGE_REJECTED_MESSAGE) {
    return res.status(400).json({
      error: 'Only image files (JPG, JPEG, PNG, WEBP) are allowed.'
    });
  }
  next(error);
};

/**
 * Build a fully-qualified URL for an uploaded file.
 * Falls back to a relative path when APP_URL is not set.
 *
 * Accepts either a multer file object or a stored filename. When uploads go to
 * S3 the stored value is already an absolute object URL, so it is returned
 * unchanged.
 *
 * @param {string|Object} fileOrName - multer file, or file.filename
 * @returns {string}
 */
const fileUrl = (fileOrName) => {
  const filename =
    fileOrName && typeof fileOrName === 'object'
      ? fileOrName.filename || fileOrName.location || fileOrName.key
      : fileOrName;

  if (!filename) return '';
  if (/^https?:\/\//i.test(filename)) return filename;

  const base = (process.env.APP_URL || '').replace(/\/$/, '');
  return base ? `${base}/uploads/${filename}` : `/uploads/${filename}`;
};

module.exports = {
  uploadDriverDocuments,
  uploadDriverComplete,
  uploadSingleForHireLicense,
  uploadAvatar,
  handleUploadError,
  uploadNone,
  fileUrl,
  uploadInvestorDocument,
  handleInvestorUploadError,
  // Storage locations — used by server.js (static mount) and investorController
  uploadsDir,
  investorDir,
  usingS3,
};
