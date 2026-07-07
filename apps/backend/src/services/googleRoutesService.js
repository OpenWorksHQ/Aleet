/**
 * services/googleRoutesService.js
 * ---------------------------------------------------------------------------
 * Google Routes API (New) integration.
 * Replaces the legacy Distance Matrix API.
 *
 * Supported location formats for all public methods:
 *   - Plain Place ID:    "ChIJrTLr-GyuEmsRBfy61i59si0"
 *   - Prefixed Place ID: "place_id:ChIJrTLr-GyuEmsRBfy61i59si0"
 *   - Coordinates:       "40.7128,-74.0060"
 *   - Address string:    "123 Main St, New York, NY"
 * ---------------------------------------------------------------------------
 */

const axios = require('axios');

const ROUTES_API_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a Routes API waypoint object from a location string.
 * @param {string} loc
 * @returns {{ waypoint: object } | null}
 */
function buildWaypoint(loc) {
    if (!loc) return null;

    // Prefixed place_id: "place_id:ChIJ..."
    if (loc.startsWith('place_id:')) {
        return { waypoint: { placeId: loc.replace('place_id:', '') } };
    }

    // Plain Place ID (starts with ChIJ, 27+ chars base64url)
    if (/^ChIJ[A-Za-z0-9_\-]{20,}$/.test(loc)) {
        return { waypoint: { placeId: loc } };
    }

    // Coordinates: "lat,lng"
    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(loc.trim())) {
        const [lat, lng] = loc.trim().split(',').map(Number);
        return { waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } };
    }

    // Plain address string
    return { waypoint: { address: loc } };
}

/**
 * Resolve departure time for Routes API.
 * TRAFFIC_AWARE requires a future timestamp; otherwise use traffic-unaware routing.
 */
function resolveDepartureTime(departureTime) {
    if (!departureTime) return null;

    const dt = new Date(departureTime);
    if (Number.isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
        return null;
    }

    return dt.toISOString();
}

/**
 * Core Routes API call — returns the first route element, or null.
 * @param {string} origin
 * @param {string} destination
 * @param {{ departureTime?: string|Date, fieldMask?: string }} options
 */
async function callRoutesApi(origin, destination, { departureTime = null, fieldMask } = {}) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const originWp = buildWaypoint(origin);
    const destWp = buildWaypoint(destination);
    if (!originWp || !destWp) return null;

    const body = {
        origins: [originWp],
        destinations: [destWp],
        travelMode: 'DRIVE',
    };

    const departureIso = resolveDepartureTime(departureTime);
    body.routingPreference = departureIso ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE';
    if (departureIso) {
        body.departureTime = departureIso;
    }

    const { data } = await axios.post(ROUTES_API_URL, body, {
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask || 'originIndex,destinationIndex,distanceMeters,duration,condition'
        }
    });

    const element = Array.isArray(data)
        ? data.find(e => e.originIndex === 0 && e.destinationIndex === 0)
        : null;

    if (!element || element.condition !== 'ROUTE_EXISTS') {
        console.warn('[Routes API] No route found:', JSON.stringify(element));
        return null;
    }

    return element;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const MIN_BILLABLE_HOURS = 1;

function parseDurationSeconds(durationStr) {
    if (typeof durationStr !== 'string') return null;
    const sec = parseInt(durationStr.replace('s', ''), 10);
    return Number.isNaN(sec) ? null : sec;
}

function roundDurationHours(minutes) {
    const hours = minutes / 60;
    return Math.max(MIN_BILLABLE_HOURS, Math.ceil(hours * 4) / 4);
}

function formatDurationText(totalMinutes) {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
    return `${hours} hr ${mins} min`;
}

/**
 * Full route estimate (distance + duration) for venue access and booking UI.
 * Accepts place IDs, coordinates, or address strings.
 *
 * @param {string} origin
 * @param {string} destination
 * @param {{ departureTime?: string|Date }} [options]
 * @returns {Promise<object|null>}
 */
async function getRouteEstimate(origin, destination, { departureTime = null } = {}) {
    try {
        const element = await callRoutesApi(origin, destination, {
            departureTime,
            fieldMask: 'originIndex,destinationIndex,distanceMeters,duration,condition',
        });
        if (!element || typeof element.distanceMeters !== 'number') return null;

        const durationSec = parseDurationSeconds(element.duration);
        if (durationSec == null) return null;

        const durationMinutes = Math.ceil(durationSec / 60);
        const distanceMiles = Math.round((element.distanceMeters / 1609.344) * 10) / 10;

        return {
            durationMinutes,
            durationHours: roundDurationHours(durationMinutes),
            distanceMiles,
            durationText: formatDurationText(durationMinutes),
            distanceText: `${distanceMiles} mi`,
        };
    } catch (err) {
        console.error('[Routes API] getRouteEstimate error:', err.message);
        if (err.response?.data) {
            console.error('[Routes API] details:', JSON.stringify(err.response.data));
        }
        return null;
    }
}

/**
 * Get driving distance in miles between two locations.
 * Returns null if the route cannot be calculated.
 *
 * @param {string} origin
 * @param {string} destination
 * @returns {Promise<number|null>} miles
 */
async function getDistanceMiles(origin, destination) {
    try {
        const element = await callRoutesApi(origin, destination, {
            fieldMask: 'originIndex,destinationIndex,distanceMeters,condition'
        });
        if (!element || typeof element.distanceMeters !== 'number') return null;
        return element.distanceMeters / 1609.344;
    } catch (err) {
        console.error('[Routes API] getDistanceMiles error:', err.message);
        if (err.response?.data) {
            console.error('[Routes API] details:', JSON.stringify(err.response.data));
        }
        return null;
    }
}

/**
 * Get driving duration in seconds between two locations, with live traffic.
 * Returns null if the route cannot be calculated.
 *
 * @param {string} origin
 * @param {string} destination
 * @param {string} departureIsoUtc  ISO UTC string for traffic-aware ETA
 * @returns {Promise<number|null>} seconds
 */
async function getDriveSeconds(origin, destination, departureIsoUtc) {
    try {
        const element = await callRoutesApi(origin, destination, {
            departureTime: departureIsoUtc,
            fieldMask: 'originIndex,destinationIndex,duration,condition'
        });
        if (!element) return null;

        // duration comes as "1234s"
        const durationStr = element.duration;
        if (typeof durationStr !== 'string') return null;
        const sec = parseInt(durationStr.replace('s', ''), 10);
        return isNaN(sec) ? null : sec;
    } catch (err) {
        console.error('[Routes API] getDriveSeconds error:', err.message);
        if (err.response?.data) {
            console.error('[Routes API] details:', JSON.stringify(err.response.data));
        }
        return null;
    }
}

/**
 * Get driving distance in miles from the company base to a pickup location.
 * Used for distance surcharge calculation (free 20 mi, $2/mi beyond).
 *
 * @param {string} pickupLocation
 * @returns {Promise<number|null>} miles from base to pickup
 */
async function getMilesFromBase(pickupLocation) {
    const BASE_ADDRESS = 'Alexandria, VA 22304';
    return getDistanceMiles(BASE_ADDRESS, pickupLocation);
}

module.exports = {
    getRouteEstimate,
    getDistanceMiles,
    getDriveSeconds,
    getMilesFromBase,
};
