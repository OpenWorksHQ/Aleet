const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  placeId: { type: String, default: '' },
}, { _id: false });

const partnerUpdateRequestSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  proposedChanges: {
    pickupLocation: { type: placeSchema, default: undefined },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    contactName: { type: String },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String },
    businessName: { type: String },
    website: { type: String },
    notes: { type: String },
  },
  currentSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
}, { timestamps: true });

partnerUpdateRequestSchema.index({ partner: 1, status: 1 });

module.exports = mongoose.model('PartnerUpdateRequest', partnerUpdateRequestSchema);
