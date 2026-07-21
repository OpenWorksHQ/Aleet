const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Shareable Founder 30 private-deal links.
 * Admin generates a link scoped to optional regions; guest claims it → founder30Invited.
 */
const founderInviteSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    label: { type: String, default: 'Founder 30 private deal', trim: true },
    /** Optional: restrict deal messaging / future eligibility to these regions. */
    regions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Region' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
    maxUses: { type: Number, default: null }, // null = unlimited
    useCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    claimedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

founderInviteSchema.statics.createToken = function createToken() {
  return crypto.randomBytes(24).toString('hex');
};

founderInviteSchema.methods.isClaimable = function isClaimable() {
  if (!this.active) return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  if (this.maxUses != null && this.useCount >= this.maxUses) return false;
  return true;
};

module.exports = mongoose.model('FounderInvite', founderInviteSchema);
