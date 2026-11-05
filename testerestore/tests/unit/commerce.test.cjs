require('./register.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { getInventory, canOrderQuantity } = require('../../lib/inventory.ts');
const { bladeQuoteMatches, createMutationQueue } = require('../../lib/commerce-state.ts');

test('tracked zero stock is unavailable in both purchase rules and schema', () => {
  const variant = { manage_inventory: true, inventory_quantity: 0 };
  assert.equal(getInventory(variant).schemaAvailability, 'https://schema.org/OutOfStock');
  assert.equal(canOrderQuantity(variant, 1), false);
});

test('unknown stock is not advertised as in stock; server may still validate a purchase', () => {
  const inventory = getInventory({ manage_inventory: true });
  assert.equal(inventory.status, 'unknown');
  assert.equal(inventory.schemaAvailability, undefined);
  assert.equal(getInventory(undefined).canPurchase, false);
});

test('known stock bounds requested quantities while explicit backorder permits more', () => {
  const variant = { manage_inventory: true, inventory_quantity: 3 };
  assert.equal(canOrderQuantity(variant, 3), true);
  for (const quantity of [4, 0, -1, 1.5, NaN, Infinity]) assert.equal(canOrderQuantity(variant, quantity), false);
  assert.equal(canOrderQuantity({ ...variant, allow_backorder: true }, 4), true);
  assert.equal(getInventory({ ...variant, inventory_quantity: 0, allow_backorder: true }).schemaAvailability, 'https://schema.org/BackOrder');
  assert.equal(canOrderQuantity({ manage_inventory: false, inventory_quantity: 0 }, 4), true);
});

test('a previous blade quote cannot purchase a newly selected dimension or quantity', () => {
  const selection = { blade_type: 'bi-metal', width_mm: 27, thickness_mm: .9, tooth_pitch: '4/6', length_mm: 2000, quantity: 1 };
  assert.equal(bladeQuoteMatches(selection, { ...selection }), true);
  for (const change of [{ blade_type: 'carbide' }, { width_mm: 34 }, { thickness_mm: 1.1 }, { tooth_pitch: '2/3' }, { length_mm: 2100 }, { quantity: 2 }]) {
    assert.equal(bladeQuoteMatches(selection, { ...selection, ...change }), false);
  }
  assert.equal(bladeQuoteMatches(null, selection), false);
});

test('cart writes are serialized and a rejection does not discard the next write', async () => {
  const enqueue = createMutationQueue();
  const events = [];
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const first = enqueue(async () => { events.push('first-start'); await blocked; events.push('first-end'); });
  const second = enqueue(async () => { events.push('second'); throw Error('stock exhausted'); });
  const rejected = assert.rejects(second, /stock exhausted/);
  const third = enqueue(async () => { events.push('third'); return 3; });
  await Promise.resolve();
  assert.deepEqual(events, ['first-start']);
  release();
  await first;
  await rejected;
  assert.equal(await third, 3);
  assert.deepEqual(events, ['first-start', 'first-end', 'second', 'third']);
});
