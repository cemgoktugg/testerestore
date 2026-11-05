require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectAllPages, parsePage } = require('../../lib/pagination.ts');
const { categoryIdsForHandles, productCategoryHandles } = require('../../lib/catalog-category.ts');

test('catalogue includes products past both the old 100 and 200 item cutoffs', async () => {
  const catalogue = Array.from({ length: 257 }, (_, id) => ({ id }));
  const offsets = [];
  const actual = await collectAllPages(async (offset, limit) => {
    offsets.push(offset);
    // A server can impose a smaller page limit than requested.
    return { items: catalogue.slice(offset, offset + Math.min(limit, 50)), count: catalogue.length };
  });
  assert.deepEqual(actual, catalogue);
  assert.deepEqual(offsets, [0, 50, 100, 150, 200, 250]);
});

test('an unavailable later page must not become a complete, cacheable partial catalogue', async () => {
  await assert.rejects(collectAllPages(async (offset) => {
    if (offset) throw new Error('backend unavailable');
    return { items: [1, 2], count: 3 };
  }), /backend unavailable/);
  await assert.rejects(collectAllPages(async (offset) => ({ items: offset ? [] : [1], count: 2 })), /tamamlanamadı/);
});

test('empty catalogues and count-less endpoints terminate, invalid page sizes fail', async () => {
  assert.deepEqual(await collectAllPages(async () => ({ items: [], count: 0 })), []);
  assert.deepEqual(await collectAllPages(async (offset) => ({ items: [1, 2, 3].slice(offset, offset + 2) }), 2), [1, 2, 3]);
  await assert.rejects(collectAllPages(async () => ({ items: [] }), 0), /Geçersiz/);
  for (const page of [null, '', '-1', 'Infinity', 'NaN', '1.5', '9007199254740993']) assert.equal(parsePage(page), 1);
  assert.equal(parsePage('12'), 12);
});

test('new nested categories appear under their parents and multi-category products retain both families', () => {
  const categories = [
    { id: 'child', handle: 'new-alloy', parent_category_id: 'metal' },
    { id: 'deep', handle: 'new-deep', parent_category_id: 'child' },
    { id: 'wood', handle: 'wood' },
    { id: 'metal', handle: 'bimetal' },
  ];
  assert.deepEqual(categoryIdsForHandles(categories, ['bimetal']).sort(), ['child', 'deep', 'metal']);
  assert.deepEqual(productCategoryHandles(categories, [{ id: 'deep' }, { id: 'wood' }]), ['new-deep', 'new-alloy', 'bimetal', 'wood']);
  assert.deepEqual(categoryIdsForHandles(categories, ['unknown']), []);
});
