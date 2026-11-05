require('./register.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const storage = new Map();
global.window = {};
global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
const medusa = { store: { cart: {} } };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent?.filename.endsWith('services\\cart.ts') || parent?.filename.endsWith('services/cart.ts')) {
    if (request === '../client') return { medusa };
    if (request === '../config') return { MEDUSA_READY: true };
    if (request === './region') return { getCurrentRegion: async () => ({ id: 'reg_test' }) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const cart = require('../../lib/medusa/services/cart.ts');
Module._load = originalLoad;

test('transient retrieval errors preserve the persisted cart', async () => {
  storage.set('ts_cart_id', 'cart_existing');
  medusa.store.cart.retrieve = async () => { throw Object.assign(Error('outage'), { status: 503 }); };
  await assert.rejects(cart.retrieveCart(), /outage/);
  assert.equal(storage.get('ts_cart_id'), 'cart_existing');
});

test('only a missing or completed cart clears the saved identifier', async () => {
  storage.set('ts_cart_id', 'cart_missing');
  medusa.store.cart.retrieve = async () => { throw Object.assign(Error('missing'), { status: 404 }); };
  assert.equal(await cart.retrieveCart(), null);
  assert.equal(storage.has('ts_cart_id'), false);
  storage.set('ts_cart_id', 'cart_completed');
  medusa.store.cart.retrieve = async () => ({ cart: { id: 'cart_completed', completed_at: '2026-01-01' } });
  assert.equal(await cart.retrieveCart(), null);
  assert.equal(storage.has('ts_cart_id'), false);
});

test('a failed line mutation rejects instead of reporting a successful empty response', async () => {
  storage.set('ts_cart_id', 'cart_existing');
  medusa.store.cart.retrieve = async () => ({ cart: { id: 'cart_existing' } });
  medusa.store.cart.updateLineItem = async () => { throw Error('insufficient inventory'); };
  medusa.store.cart.deleteLineItem = async () => { throw Error('network unavailable'); };
  medusa.store.cart.createLineItem = async () => { throw Error('out of stock'); };
  await assert.rejects(cart.updateLineItem('cali_1', 4), /Adet güncellenemedi/);
  await assert.rejects(cart.removeLineItem('cali_1'), /çıkarılamadı/);
  await assert.rejects(cart.addLineItem({ variantId: 'var_1', quantity: 1 }), /eklenemedi/);
  assert.equal(storage.get('ts_cart_id'), 'cart_existing');
});
