require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const stub = (path, exports) => { require.cache[require.resolve(path)] = { id: require.resolve(path), filename: require.resolve(path), loaded: true, exports }; };
let productHandler;
let currentToken = 'token-a';
const customerCalls = [];
const medusa = {
  client: { getToken: () => Promise.resolve(currentToken) },
  store: {
    product: { list: (query) => productHandler(query) },
    customer: {
      retrieve: async (query, headers) => { customerCalls.push(headers.Authorization); return { customer: { id: 'a', metadata: { existing_preference: true } } }; },
      update: async (body, query, headers) => { customerCalls.push(headers.Authorization); assert.deepEqual(body.metadata, { existing_preference: true, wishlist: ['blade'] }); },
    },
  },
};
stub('../../lib/medusa/client.ts', { medusa });
stub('../../lib/medusa/config.ts', { MEDUSA_READY: true });
stub('../../lib/medusa/services/region.ts', { getCurrentRegion: async () => ({ id: 'reg_test' }) });
const products = require('../../lib/medusa/services/products.ts');
const auth = require('../../lib/medusa/services/auth.ts');

test('ready-made filtering and sitemap/LLM listings include products beyond initial API pages', async () => {
  const catalogue = Array.from({ length: 205 }, (_, id) => ({ id: `p_${id}`, handle: `blade-${id}`, title: `Blade ${id}`, metadata: { is_ready_made: id >= 200, length_mm: 1000 + id } }));
  productHandler = async ({ offset = 0, limit }) => ({ products: catalogue.slice(offset, offset + limit), count: catalogue.length });
  assert.equal((await products.listReadyMade()).length, 5);
  assert.equal((await products.listReadyMade(2))[1].handle, 'blade-201');
  assert.equal((await products.listProductsForSitemap()).length, 205);
  assert.equal((await products.listProductsForLlms()).length, 205);
});

test('catalogue service propagates an API outage instead of reporting zero search matches', async () => {
  productHandler = async () => { throw new Error('offline'); };
  await assert.rejects(products.listProducts({ q: 'blade' }), /offline/);
  await assert.rejects(products.listReadyMade(), /offline/);
});

test('wishlist API writes remain pinned to the original customer token and preserve unrelated metadata', async () => {
  const persistence = auth.customerWishlistPersistence('a');
  currentToken = 'token-b';
  await persistence.load();
  await persistence.save(['blade']);
  assert.deepEqual(customerCalls, ['Bearer token-a', 'Bearer token-a', 'Bearer token-a']);
  await assert.rejects(auth.customerWishlistPersistence('wrong-owner').load(), /Müşteri oturumu değişti/);
});
