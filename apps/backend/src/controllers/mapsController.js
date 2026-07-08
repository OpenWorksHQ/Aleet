const { getRouteEstimate } = require('../services/googleRoutesService');
const { fetchAutocompleteSuggestions } = require('../services/googlePlacesService');
const { reverseGeocode } = require('../services/googleGeocodingService');
const {
    sendSuccess,
    sendValidationError,
    sendError,
} = require('../utils/responseHelper');

/**
 * POST /api/maps/autocomplete
 * Body: { input: string, sessionToken?: string }
 */
const autocompletePlaces = async (req, res) => {
    try {
        const { input, sessionToken } = req.body ?? {};
        const trimmed = typeof input === 'string' ? input.trim() : '';

        if (trimmed.length < 2) {
            return sendValidationError(res, 'Enter at least 2 characters to search.');
        }

        const suggestions = await fetchAutocompleteSuggestions(trimmed, sessionToken);
        return sendSuccess(res, 200, 'Suggestions retrieved', suggestions);
    } catch (error) {
        const status = error.response?.status;
        const googleMessage = error.response?.data?.error?.message;

        console.error('Places autocomplete error:', googleMessage || error.message);
        if (error.response?.data) {
            console.error('[Places API] details:', JSON.stringify(error.response.data));
        }

        if (status === 403) {
            return sendError(
                res,
                403,
                'Places API access denied. Enable Places API (New) for GOOGLE_MAPS_API_KEY in Google Cloud Console.',
            );
        }

        return sendError(res, 500, googleMessage || error.message || 'Failed to fetch address suggestions');
    }
};

/**
 * POST /api/maps/reverse-geocode
 * Body: { latitude: number, longitude: number }
 */
const reverseGeocodeLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body ?? {};

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return sendValidationError(res, 'Valid latitude and longitude are required.');
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return sendValidationError(res, 'Latitude or longitude is out of range.');
        }

        const address = await reverseGeocode(lat, lng);
        return sendSuccess(res, 200, 'Address resolved', address);
    } catch (error) {
        const status = error.response?.status;
        const googleMessage = error.response?.data?.error?.message;

        console.error('Reverse geocode error:', googleMessage || error.message);

        if (status === 403) {
            return sendError(
                res,
                403,
                'Geocoding API access denied. Enable Geocoding API for GOOGLE_MAPS_API_KEY in Google Cloud Console.',
            );
        }

        return sendError(res, 422, error.message || 'Could not resolve address for this location');
    }
};

function resolveLocation({ text, placeId }) {
    const trimmedText = typeof text === 'string' ? text.trim() : '';
    const trimmedPlaceId = typeof placeId === 'string' ? placeId.trim() : '';
    if (trimmedPlaceId) return trimmedPlaceId;
    if (trimmedText) return trimmedText;
    return null;
}

/**
 * POST /api/maps/route-estimate
 * Body: { origin: { text, placeId }, destination: { text, placeId }, departureTime? }
 */
const estimateRoute = async (req, res) => {
    try {
        const { origin, destination, departureTime } = req.body ?? {};

        const originLoc = resolveLocation(origin ?? {});
        const destinationLoc = resolveLocation(destination ?? {});

        if (!originLoc || !destinationLoc) {
            return sendValidationError(
                res,
                'Origin and destination are required (address text or place ID).',
            );
        }

        const estimate = await getRouteEstimate(originLoc, destinationLoc, { departureTime });
        if (!estimate) {
            return sendError(res, 422, 'Could not calculate a driving route for these locations.');
        }

        return sendSuccess(res, 200, 'Route estimated successfully', estimate);
    } catch (error) {
        console.error('Route estimate error:', error);
        return sendError(res, 500, error.message || 'Failed to estimate route');
    }
};

module.exports = { autocompletePlaces, reverseGeocodeLocation, estimateRoute };
