const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeWebsiteUrl } = require('./normalizeWebsite');

test('adds https:// when no scheme is supplied', () => {
  assert.equal(normalizeWebsiteUrl('example.com'), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('www.example.com'), 'https://www.example.com');
  assert.equal(normalizeWebsiteUrl('sub.example.co.uk/path'), 'https://sub.example.co.uk/path');
});

test('preserves an explicit http:// or https:// scheme', () => {
  assert.equal(normalizeWebsiteUrl('http://example.com'), 'http://example.com');
  assert.equal(normalizeWebsiteUrl('https://example.com'), 'https://example.com');
});

test('scheme detection is case-insensitive', () => {
  assert.equal(normalizeWebsiteUrl('HTTPS://example.com'), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('HtTp://example.com'), 'http://example.com');
});

test('trims surrounding whitespace', () => {
  assert.equal(normalizeWebsiteUrl('   example.com   '), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('\n https://example.com \t'), 'https://example.com');
});

test('lowercases the host but leaves the path casing alone', () => {
  assert.equal(normalizeWebsiteUrl('https://EXAMPLE.com'), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('https://EXAMPLE.com/MyPage'), 'https://example.com/MyPage');
});

test('strips a single trailing slash', () => {
  assert.equal(normalizeWebsiteUrl('https://example.com/'), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('example.com/'), 'https://example.com');
  assert.equal(normalizeWebsiteUrl('https://example.com/path/'), 'https://example.com/path');
});

test('keeps query strings and fragments intact', () => {
  assert.equal(normalizeWebsiteUrl('http://a.b.co/x?q=1'), 'http://a.b.co/x?q=1');
  assert.equal(normalizeWebsiteUrl('example.com/x#frag'), 'https://example.com/x#frag');
});

test('returns null for empty-ish input instead of throwing', () => {
  for (const input of [undefined, null, '', '   ', false, 0, NaN]) {
    assert.equal(normalizeWebsiteUrl(input), null, `expected null for ${String(input)}`);
  }
});

test('rejects a hostname with no dot', () => {
  assert.throws(
    () => normalizeWebsiteUrl('notadomain'),
    (err) => err.code === 'INVALID_WEBSITE' && err.message === 'Enter a valid website URL',
  );
  assert.throws(() => normalizeWebsiteUrl('localhost'), { code: 'INVALID_WEBSITE' });
});

test('rejects non-http schemes rather than rewriting them to https', () => {
  // Only http/https are recognised as schemes; anything else gets an https://
  // prefix and then has to survive the hostname check. "ftp://x.com" becomes
  // "https://ftp://x.com" (host "ftp", no dot) and "javascript:alert(1)"
  // produces an unparseable URL — both are rejected.
  assert.throws(() => normalizeWebsiteUrl('ftp://x.com'), { code: 'INVALID_WEBSITE' });
  assert.throws(() => normalizeWebsiteUrl('javascript:alert(1)'), { code: 'INVALID_WEBSITE' });
  assert.throws(() => normalizeWebsiteUrl('data:text/html,hi'), { code: 'INVALID_WEBSITE' });
});

test('a scheme-only or hostless URL is rejected', () => {
  assert.throws(() => normalizeWebsiteUrl('http://'), { code: 'INVALID_WEBSITE' });
  assert.throws(() => normalizeWebsiteUrl('https://'), { code: 'INVALID_WEBSITE' });
  assert.throws(() => normalizeWebsiteUrl(' ///// '), { code: 'INVALID_WEBSITE' });
});

test('a protocol-relative URL is upgraded to https', () => {
  assert.equal(normalizeWebsiteUrl('//example.com'), 'https://example.com');
});

test('every rejection carries the INVALID_WEBSITE code for callers to branch on', () => {
  for (const input of ['notadomain', 'ftp://x.com', 'http://', ' ///// ']) {
    assert.throws(
      () => normalizeWebsiteUrl(input),
      { code: 'INVALID_WEBSITE' },
      `expected INVALID_WEBSITE for "${input}"`,
    );
  }
});

test('normalization is idempotent', () => {
  const once = normalizeWebsiteUrl('  EXAMPLE.com/path/  ');
  assert.equal(normalizeWebsiteUrl(once), once);
});
