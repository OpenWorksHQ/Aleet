const express = require('express');
const {
  autocompletePlaces,
  getPlaceDetails,
  reverseGeocodeLocation,
  estimateRoute,
} = require('../controllers/mapsController');

const router = express.Router();

router.post('/autocomplete', autocompletePlaces);
router.get('/place-details', getPlaceDetails);
router.post('/reverse-geocode', reverseGeocodeLocation);
router.post('/route-estimate', estimateRoute);

module.exports = router;
