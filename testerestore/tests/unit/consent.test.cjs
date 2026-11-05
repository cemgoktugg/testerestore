require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCookiePreferences } = require('../../lib/cookie-consent.ts');

test('tracking is denied for absent, malformed and legacy blanket consent', () => {
  for (const raw of [null, '', 'accepted', '{', '{"version":2,"analytics":"true","marketing":false}']) assert.equal(parseCookiePreferences(raw), null);
});
test('an existing refusal stays refused, and categories remain independent', () => {
  assert.equal(parseCookiePreferences('necessary').analytics, false);
  const value = { version: 2, analytics: true, marketing: false, updatedAt: '2026-10-19T00:00:00.000Z' };
  assert.deepEqual(parseCookiePreferences(JSON.stringify(value)), value);
});

test('event dispatch respects categories and does not double-send Google events', () => {
  const { trackEvent } = require('../../lib/analytics.ts');
  const oldWindow = global.window;
  const env = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_GTM_ID = 'GTM-TEST';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '123';
    let consent = { version: 2, analytics: true, marketing: false, updatedAt: '' };
    const google = [], facebook = [];
    global.window = { localStorage: { getItem: () => JSON.stringify(consent) }, dataLayer: [], gtag: (...args) => google.push(args), fbq: (...args) => facebook.push(args) };
    trackEvent('add_to_cart', { value: 10 });
    assert.equal(google.length, 1);
    assert.equal(window.dataLayer.length, 0);
    assert.equal(facebook.length, 0);
    consent.marketing = true;
    trackEvent('add_to_cart', { value: 10 });
    assert.equal(google.length, 1);
    assert.equal(window.dataLayer.length, 1);
    assert.equal(facebook.length, 1);
    window.location = { pathname: '/bulten' };
    trackEvent('add_to_cart');
    assert.equal(window.dataLayer.length, 1);
    assert.equal(facebook.length, 1);
    window.location = { pathname: '/products/test' };
    consent = { ...consent, analytics: false, marketing: false };
    trackEvent('add_to_cart');
    assert.equal(window.dataLayer.length, 1);
    assert.equal(facebook.length, 1);
  } finally {
    global.window = oldWindow;
    for (const key of ['NEXT_PUBLIC_GTM_ID', 'NEXT_PUBLIC_GA_ID', 'NEXT_PUBLIC_META_PIXEL_ID']) {
      if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
    }
  }
});
