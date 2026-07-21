const axios = require('axios');
const { randomUUID } = require('crypto');

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

/** Rough geographic centers for US state bias (lat/lng).
 * Places API (New) caps circle.radius at 50_000 meters.
 */
const US_STATE_BIAS = {
    AL: { lat: 32.8, lng: -86.8 },
    AK: { lat: 64.2, lng: -153.4 },
    AZ: { lat: 34.3, lng: -111.7 },
    AR: { lat: 34.9, lng: -92.4 },
    CA: { lat: 37.2, lng: -119.5 },
    CO: { lat: 39.0, lng: -105.5 },
    CT: { lat: 41.6, lng: -72.7 },
    DE: { lat: 39.0, lng: -75.5 },
    FL: { lat: 27.8, lng: -81.7 },
    GA: { lat: 32.7, lng: -83.4 },
    HI: { lat: 20.8, lng: -156.3 },
    ID: { lat: 44.4, lng: -114.6 },
    IL: { lat: 40.0, lng: -89.2 },
    IN: { lat: 39.9, lng: -86.3 },
    IA: { lat: 42.0, lng: -93.5 },
    KS: { lat: 38.5, lng: -98.3 },
    KY: { lat: 37.5, lng: -85.3 },
    LA: { lat: 31.0, lng: -92.0 },
    ME: { lat: 45.3, lng: -69.2 },
    MD: { lat: 39.0, lng: -76.7 },
    MA: { lat: 42.2, lng: -71.5 },
    MI: { lat: 44.3, lng: -85.4 },
    MN: { lat: 46.0, lng: -94.3 },
    MS: { lat: 32.7, lng: -89.7 },
    MO: { lat: 38.4, lng: -92.5 },
    MT: { lat: 47.0, lng: -109.6 },
    NE: { lat: 41.5, lng: -99.8 },
    NV: { lat: 39.3, lng: -116.6 },
    NH: { lat: 43.7, lng: -71.6 },
    NJ: { lat: 40.1, lng: -74.5 },
    NM: { lat: 34.4, lng: -106.1 },
    NY: { lat: 42.9, lng: -75.5 },
    NC: { lat: 35.5, lng: -79.4 },
    ND: { lat: 47.4, lng: -100.5 },
    OH: { lat: 40.3, lng: -82.8 },
    OK: { lat: 35.5, lng: -97.5 },
    OR: { lat: 44.0, lng: -120.5 },
    PA: { lat: 40.9, lng: -77.2 },
    RI: { lat: 41.7, lng: -71.5 },
    SC: { lat: 33.9, lng: -80.9 },
    SD: { lat: 44.4, lng: -100.2 },
    TN: { lat: 35.8, lng: -86.3 },
    TX: { lat: 31.5, lng: -99.3 },
    UT: { lat: 39.3, lng: -111.7 },
    VT: { lat: 44.0, lng: -72.7 },
    VA: { lat: 37.5, lng: -78.9 },
    WA: { lat: 47.4, lng: -120.5 },
    WV: { lat: 38.6, lng: -80.6 },
    WI: { lat: 44.5, lng: -89.5 },
    WY: { lat: 43.0, lng: -107.6 },
    DC: { lat: 38.9, lng: -77.0 },
};

const MAX_BIAS_RADIUS_METERS = 50000;

/**
 * Places API (New) — server-side autocomplete.
 * Uses GOOGLE_MAPS_API_KEY (keep key on server only).
 * @param {string} input
 * @param {string} [sessionToken]
 * @param {{ regionCode?: string }} [options]  US state code (e.g. OH) to bias results
 */
async function fetchAutocompleteSuggestions(input, sessionToken, options = {}) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const trimmed = typeof input === 'string' ? input.trim() : '';
    if (trimmed.length < 2) return [];

    const code = typeof options.regionCode === 'string'
        ? options.regionCode.trim().toUpperCase()
        : '';
    const bias = code ? US_STATE_BIAS[code] : null;

    // Soft bias: append state code when missing so early keystrokes prefer that state.
    // (Hard circle bias is capped at 50km by Places API.)
    let searchInput = trimmed;
    if (code && !new RegExp(`\\b${code}\\b`, 'i').test(trimmed)) {
        searchInput = `${trimmed}, ${code}`;
    }

    const body = {
        input: searchInput,
        sessionToken: sessionToken || randomUUID(),
        includedRegionCodes: ['us'],
    };

    if (bias) {
        body.locationBias = {
            circle: {
                center: { latitude: bias.lat, longitude: bias.lng },
                radius: MAX_BIAS_RADIUS_METERS,
            },
        };
    }

    const { data } = await axios.post(
        AUTOCOMPLETE_URL,
        body,
        {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
            },
        },
    );

    return (data.suggestions ?? [])
        .map((item) => {
            const prediction = item.placePrediction;
            if (!prediction) return null;

            const placeId = prediction.placeId
                || (typeof prediction.place === 'string'
                    ? prediction.place.replace(/^places\//, '')
                    : '');

            const text = prediction.text?.text ?? '';
            const mainText = prediction.structuredFormat?.mainText?.text ?? text;
            const secondaryText = prediction.structuredFormat?.secondaryText?.text ?? '';

            if (!placeId || !text) return null;

            return { placeId, text, mainText, secondaryText };
        })
        .filter(Boolean);
}

/**
 * Places API (New) — fetch a place's formatted address + address components.
 * Used so partner business locations store a full verified street address
 * (for distance / mileage), not just free-typed text.
 */
async function fetchPlaceDetails(placeId) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const id = typeof placeId === 'string' ? placeId.trim() : '';
    if (!id) throw new Error('placeId is required');

    const resourceName = id.startsWith('places/') ? id : `places/${id}`;
    const { data } = await axios.get(
        `https://places.googleapis.com/v1/${resourceName}`,
        {
            timeout: 10000,
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask':
                    'id,formattedAddress,addressComponents,location,displayName',
            },
        },
    );

    const components = Array.isArray(data.addressComponents) ? data.addressComponents : [];
    const get = (type) => {
        const hit = components.find((c) => Array.isArray(c.types) && c.types.includes(type));
        return hit?.longText || hit?.shortText || '';
    };

    const streetNumber = get('street_number');
    const route = get('route');
    const street = [streetNumber, route].filter(Boolean).join(' ').trim();
    const city =
        get('locality')
        || get('sublocality')
        || get('postal_town')
        || get('administrative_area_level_2');
    const stateComponent = components.find(
        (c) => Array.isArray(c.types) && c.types.includes('administrative_area_level_1'),
    );
    const state = stateComponent?.longText || stateComponent?.shortText || '';
    const stateCode = stateComponent?.shortText || '';
    const postalCode = get('postal_code');
    const country = get('country');
    const formattedAddress = data.formattedAddress || '';

    return {
        placeId: (data.id || id).replace(/^places\//, ''),
        formattedAddress,
        street: street || formattedAddress,
        city,
        state,
        stateCode,
        postalCode,
        country,
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        displayName: data.displayName?.text || '',
    };
}

module.exports = { fetchAutocompleteSuggestions, fetchPlaceDetails };
