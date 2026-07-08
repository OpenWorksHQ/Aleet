const axios = require('axios');

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Reverse geocode lat/lng to a formatted street address (Geocoding API).
 * Uses GOOGLE_MAPS_API_KEY on the server only.
 */
async function reverseGeocode(latitude, longitude) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: apiKey,
    });

    const { data } = await axios.get(`${GEOCODE_URL}?${params.toString()}`, {
        timeout: 10000,
    });

    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
        const detail = data.error_message || data.status || 'UNKNOWN';
        const err = new Error(`Reverse geocoding failed: ${detail}`);
        err.googleStatus = data.status;
        throw err;
    }

    const best = data.results[0];
    const text = typeof best.formatted_address === 'string' ? best.formatted_address.trim() : '';
    const placeId = typeof best.place_id === 'string' ? best.place_id.trim() : '';

    if (!text) {
        throw new Error('Reverse geocoding returned no formatted address');
    }

    return { text, placeId };
}

module.exports = { reverseGeocode };
