const express = require('express');
const router = express.Router();
const { getMapFeatures } = require('../controllers/mapController');

router.get('/features', getMapFeatures);

module.exports = router;
