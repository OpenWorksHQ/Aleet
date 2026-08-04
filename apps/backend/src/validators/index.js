/**
 * validators/index.js
 * ---------------------------------------------------------------------------
 * Barrel for the request schemas. Route files may import either this or the
 * individual domain module — the per-domain modules are the source of truth.
 * ---------------------------------------------------------------------------
 */

module.exports = {
  common: require('./common'),
  auth: require('./authValidators'),
  booking: require('./bookingValidators'),
  payment: require('./paymentValidators'),
  subscription: require('./subscriptionValidators'),
  payout: require('./payoutValidators'),
  region: require('./regionValidators'),
  addOn: require('./addOnValidators'),
  vehicleType: require('./vehicleTypeValidators'),
};
