const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  placeId: { type: String, default: '' },
}, { _id: false });

const partnerApplicationSchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true },
  businessType: { type: String, required: true, trim: true },
  contactName: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  contactPhone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  /** Verified Google Places selection (required for accurate mileage). */
  businessLocation: { type: placeSchema, default: null },
  website: { type: String, default: null, trim: true },
  notes: { type: String, default: null, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: null },
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PartnerApplication', partnerApplicationSchema);
