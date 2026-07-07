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

module.exports = { fetchAutocompleteSuggestions };
