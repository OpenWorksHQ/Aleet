const express = require('express');
const {
  autocompletePlaces,
  getPlaceDetails,
  reverseGeocodeLocation,
  estimateRoute,
} = require('../controllers/mapsController');
const { mapsLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// DELIBERATELY PUBLIC — do not add authenticateJWT here.
//
// The booking wizard (/booking) and the partner application form are both
// anonymous, pre-login pages, and they call these endpoints for address
// autocomplete, reverse geocode and the fare/route estimate before an account
// exists (apps/frontend/lib/api/maps.ts sends no Authorization header). Adding
// auth would break the top of the acquisition funnel.
//
// Quota abuse of GOOGLE_MAPS_API_KEY is mitigated by the per-IP rate limiter
// instead. If these ever need to be locked down further, the options are a
// short-lived anonymous "booking session" token minted by the backend, or
// restricting the Google key by referrer/IP in Google Cloud Console.
router.use(mapsLimiter);

router.post('/autocomplete', autocompletePlaces);
router.get('/place-details', getPlaceDetails);
router.post('/reverse-geocode', reverseGeocodeLocation);
router.post('/route-estimate', estimateRoute);

module.exports = router;
