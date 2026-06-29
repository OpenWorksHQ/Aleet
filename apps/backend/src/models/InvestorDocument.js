// src/models/InvestorDocument.js
// Investor data-room documents shown on the public /teams (investor) page
// and managed by admins. Files are stored on disk under uploads/investor/.

const mongoose = require('mongoose');

const investorDocumentSchema = new mongoose.Schema(
  {
    // Button/tab text shown on the investor page (e.g. "Financials")
    label: { type: String, required: true, trim: true },

    // Internal/display name of the document (e.g. "Q1 Cash Flow Statement")
    title: { type: String, required: true, trim: true },

    // Original uploaded file name (returned to clients as fileName)
    fileName: { type: String, required: true },

    // Actual file name stored on disk (used to build the URL + delete the file)
    storedFileName: { type: String, required: true },

    // MIME type of the file (e.g. application/pdf)
    mimeType: { type: String, default: null },

    // Controls visibility on the public /teams page
    isPublished: { type: Boolean, default: false },

    // Lower value = listed first
    sortOrder: { type: Number, default: 0 },

    // Admin who created the document
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestorDocument', investorDocumentSchema);
