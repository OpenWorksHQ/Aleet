const express = require('express');
const { autocompletePlaces, reverseGeocodeLocation, estimateRoute } = require('../controllers/mapsController');

const router = express.Router();

router.post('/autocomplete', autocompletePlaces);
router.post('/reverse-geocode', reverseGeocodeLocation);
router.post('/route-estimate', estimateRoute);

module.exports = router;
