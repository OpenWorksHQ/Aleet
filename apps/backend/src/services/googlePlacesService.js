const axios = require('axios');
const { randomUUID } = require('crypto');

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

/**
 * Places API (New) — server-side autocomplete.
 * Uses GOOGLE_MAPS_API_KEY (keep key on server only).
 */
async function fetchAutocompleteSuggestions(input, sessionToken) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const trimmed = typeof input === 'string' ? input.trim() : '';
    if (trimmed.length < 2) return [];

    const { data } = await axios.post(
        AUTOCOMPLETE_URL,
        {
            input: trimmed,
            sessionToken: sessionToken || randomUUID(),
        },
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
    const state = get('administrative_area_level_1');
    const postalCode = get('postal_code');
    const country = get('country');
    const formattedAddress = data.formattedAddress || '';

    return {
        placeId: (data.id || id).replace(/^places\//, ''),
        formattedAddress,
        street: street || formattedAddress,
        city,
        state,
        postalCode,
        country,
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        displayName: data.displayName?.text || '',
    };
}

module.exports = { fetchAutocompleteSuggestions, fetchPlaceDetails };
