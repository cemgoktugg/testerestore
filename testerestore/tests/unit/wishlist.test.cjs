require('./register.cjs');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const wishlist = require('../../lib/wishlist.ts');
const storage = new Map();
global.window = new EventTarget();
global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
beforeEach(async () => { await wishlist.connectWishlist(null); storage.clear(); });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const idle = async () => {
  for (let i = 0; i < 20 && wishlist.getWishlistSyncState().syncing; i++) await new Promise(setImmediate);
  assert.equal(wishlist.getWishlistSyncState().syncing, false);
};

test('guest favourites merge once; logout and another account never display the previous account', async () => {
  wishlist.addToWishlist('guest-blade');
  let remoteA = ['account-a'];
  const a = { load: async () => remoteA, save: async (items) => { remoteA = items; } };
  await wishlist.connectWishlist('a', a);
  assert.deepEqual(wishlist.getWishlist(), ['account-a', 'guest-blade']);
  await wishlist.connectWishlist(null);
  assert.deepEqual(wishlist.getWishlist(), []);
  await wishlist.connectWishlist('b', { load: async () => ['account-b'], save: async () => assert.fail('no B changes') });
  assert.deepEqual(wishlist.getWishlist(), ['account-b']);
  await wishlist.connectWishlist('a', a);
  assert.deepEqual(wishlist.getWishlist(), ['account-a', 'guest-blade']);
});

test('a stale account load cannot publish or save into the next account', async () => {
  const delayed = deferred();
  const loadingA = wishlist.connectWishlist('a', { load: () => delayed.promise, save: async () => assert.fail('stale write') });
  await wishlist.connectWishlist('b', { load: async () => ['b'], save: async () => {} });
  delayed.resolve(['private-a']);
  await loadingA;
  assert.deepEqual(wishlist.getWishlist(), ['b']);
});

test('offline removals survive retry without resurrecting removed items or losing new cloud favourites', async () => {
  let cloud = ['remove-me', 'keep-me'];
  let fail = true;
  const adapter = { load: async () => cloud, save: async (items) => { if (fail) throw new Error('offline'); cloud = items; } };
  await wishlist.connectWishlist('a', adapter);
  wishlist.removeFromWishlist('remove-me');
  await idle();
  assert.ok(wishlist.getWishlistSyncState().error);
  cloud.push('new-other-device'); fail = false;
  await wishlist.retryWishlistSync();
  assert.deepEqual(cloud, ['keep-me', 'new-other-device']);
  assert.deepEqual(wishlist.getWishlist(), cloud);
  assert.equal(wishlist.getWishlistSyncState().error, null);
});

test('edits during an in-flight write are serialized and the last action wins', async () => {
  const firstWrite = deferred(); let writes = 0; let cloud = [];
  await wishlist.connectWishlist('a', { load: async () => cloud, save: async (items) => {
    if (++writes === 1) await firstWrite.promise;
    cloud = items;
  } });
  wishlist.addToWishlist('blade');
  wishlist.removeFromWishlist('blade');
  wishlist.addToWishlist('other');
  firstWrite.resolve();
  await idle();
  assert.deepEqual(cloud, ['other']);
  assert.deepEqual(wishlist.getWishlist(), ['other']);
});

test('account switch during a write does not contaminate its cache or call the next persistence adapter', async () => {
  const writeA = deferred();
  await wishlist.connectWishlist('a', { load: async () => [], save: () => writeA.promise });
  wishlist.addToWishlist('only-a');
  await wishlist.connectWishlist('b', { load: async () => ['only-b'], save: async () => assert.fail('unexpected B write') });
  writeA.resolve();
  await new Promise(setImmediate);
  assert.deepEqual(wishlist.getWishlist(), ['only-b']);
});

test('corrupt local data and untrusted metadata are ignored safely', () => {
  storage.set('ts_wishlist', '{broken');
  assert.deepEqual(wishlist.getWishlist(), []);
  assert.deepEqual(wishlist.normalizeWishlist([null, 12, {}, '', 'blade', 'blade']), ['blade']);
});
