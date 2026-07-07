const express = require('express');
const { autocompletePlaces, estimateRoute } = require('../controllers/mapsController');

const router = express.Router();

router.post('/autocomplete', autocompletePlaces);
router.post('/route-estimate', estimateRoute);

module.exports = router;
