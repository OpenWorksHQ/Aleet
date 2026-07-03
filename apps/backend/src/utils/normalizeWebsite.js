function normalizeWebsiteUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (!url.hostname || !url.hostname.includes('.')) {
      throw new Error('Invalid hostname');
    }
    return url.href.replace(/\/$/, '');
  } catch {
    const err = new Error('Enter a valid website URL');
    err.code = 'INVALID_WEBSITE';
    throw err;
  }
}

module.exports = { normalizeWebsiteUrl };
