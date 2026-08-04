// utils/uploadStorage.js
//
// Single place that decides WHERE uploaded files land.
//
//   AWS_S3_BUCKET set  → multer-s3 storage (durable, survives redeploys)
//   otherwise          → local disk under UPLOAD_DIR
//
// UPLOAD_DIR matters: the historic default (`<repo>/apps/backend/uploads`) sits
// inside the CI checkout, so every deploy replaced the directory and silently
// destroyed every driver's license photo and investor document uploaded since
// the previous release. Operators MUST point UPLOAD_DIR at a mounted volume, or
// set AWS_S3_BUCKET, for any deployment that is not a developer laptop.
//
// The S3 configuration mirrors utils/s3.js (region / credentials / key prefix);
// that module builds its own single-purpose multer instance and covers only two
// of the app's upload fields, so the storage engine is constructed here where
// every upload definition in utils/multer.js can share it.

const path = require('path');
const fs = require('fs');
const multer = require('multer');

/** True when uploads should go to S3 instead of the local filesystem. */
const usingS3 = () => Boolean(process.env.AWS_S3_BUCKET);

/**
 * Base directory for local uploads. Falls back to the in-repo path only when
 * UPLOAD_DIR is unset (developer machines).
 */
const baseUploadDir = () =>
  process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '../../uploads');

/**
 * Absolute local directory for a given sub-folder ('' = root of the uploads
 * dir). Creates it when local storage is in use.
 */
const resolveUploadDir = (subdir = '') => {
  const dir = subdir ? path.join(baseUploadDir(), subdir) : baseUploadDir();
  if (!usingS3() && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/**
 * multer-s3 reports `key` / `location`, not `filename`. Controllers persist
 * `file.filename` and hand it to fileUrl(), so normalise it to the absolute
 * object URL — fileUrl() passes absolute URLs straight through.
 */
const withFilename = (storage) => ({
  _handleFile(req, file, cb) {
    storage._handleFile(req, file, (err, info) => {
      if (err) return cb(err);
      return cb(null, { ...info, filename: info.location || info.key });
    });
  },
  _removeFile(req, file, cb) {
    storage._removeFile(req, file, cb);
  },
});

/**
 * Build a storage engine.
 *
 * @param {Object}   options
 * @param {string}   options.subdir   - sub-folder / key prefix ('' or 'investor')
 * @param {Function} options.filename - (req, file, cb) => cb(null, safeName);
 *                                      shared by both engines so the sanitised
 *                                      extension logic applies to S3 too.
 */
const createUploadStorage = ({ subdir = '', filename }) => {
  if (usingS3()) {
    // Required lazily: multer-s3 throws at construction time when no bucket is
    // configured, so this must not run on disk-only deployments.
    const { S3Client } = require('@aws-sdk/client-s3');
    const multerS3 = require('multer-s3');

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const prefix = subdir ? `uploads/${subdir}/` : 'uploads/';

    return withFilename(
      multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET,
        // ACL is only sent when explicitly configured: modern buckets use
        // "Bucket owner enforced" object ownership and reject any ACL. Note
        // that AWS_S3_ACL=public-read makes these objects world-readable and
        // re-opens the PII exposure that the /uploads auth gate closes — use a
        // private bucket with presigned URLs instead.
        ...(process.env.AWS_S3_ACL ? { acl: process.env.AWS_S3_ACL } : {}),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => {
          filename(req, file, (err, safeName) => {
            if (err) return cb(err);
            return cb(null, `${prefix}${safeName}`);
          });
        },
      }),
    );
  }

  const dir = resolveUploadDir(subdir);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename,
  });
};

module.exports = {
  usingS3,
  baseUploadDir,
  resolveUploadDir,
  createUploadStorage,
};
