require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signCartRecovery, verifyCartRecovery, recoveryEmailFingerprint } = require('../../../medusa-backend/apps/backend/src/lib/cart-recovery-token.ts');
const secret = 'test-only-signing-key-that-is-long-enough';

test('recovery token is bound to cart, email and expiry', () => {
  const token = signCartRecovery('cart_example', ' Person@Example.com ', secret, 1000);
  const decoded = verifyCartRecovery(token, secret, 2000);
  assert.equal(decoded.cart, 'cart_example');
  assert.equal(decoded.email, recoveryEmailFingerprint('person@example.com'));
  assert.equal(verifyCartRecovery(token, secret, 1000 + 48 * 3600 * 1000), null);
  assert.equal(verifyCartRecovery(token, 'different-secret', 2000), null);
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...decoded, cart: 'cart_someone_else' })).toString('base64url');
  assert.equal(verifyCartRecovery(forged + '.' + signature, secret, 2000), null);
  assert.equal(verifyCartRecovery(payload + '.short', secret, 2000), null);
});
