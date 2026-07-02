// src/models/InvestorSubmission.js
// Captures investor/operator/legal interest submissions from the public
// /teams page. Each submission is persisted (so leads are never lost) and
// also emailed to the company inbox.

const mongoose = require('mongoose');

const investorSubmissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

    role: {
      type: String,
      required: true,
      enum: ['investor', 'operator', 'legal', 'other'],
    },

    linkedinOrWebsite: { type: String, default: null, trim: true },
    background: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    phoneOrCalendly: { type: String, default: null, trim: true },

    // Whether the notification email to the company inbox was sent successfully
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestorSubmission', investorSubmissionSchema);
