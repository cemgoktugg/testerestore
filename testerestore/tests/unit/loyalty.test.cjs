require('./register.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pointsForTotal, reversalDelta, applyLedgerAction } = require('../../../medusa-backend/apps/backend/src/modules/loyalty/ledger.ts');
const { loyaltyPromotion, redeemPoints } = require('../../../medusa-backend/apps/backend/src/modules/loyalty/redeem.ts');

function fixture() {
  const state = { balance: 20, debits: 0, creates: 0, promotions: [], redemptions: new Map(), failCreate: false, failActivate: false };
  const loyalty = {
    async prepareRedemption(input) {
      let row = state.redemptions.get(input.requestKey);
      if (!row) {
        row = { id: input.requestKey, code: `LP-${input.requestKey}`, points: input.points, status: 'draft' };
        state.redemptions.set(input.requestKey, row);
      }
      return { ...row };
    },
    async reserveRedemption(input) {
      const row = state.redemptions.get(input.redemptionId);
      if (row.status !== 'draft') return row;
      if (state.balance < row.points) throw Error('insufficient points');
      state.balance -= row.points;
      state.debits++;
      row.status = 'reserved';
      return { ...row };
    },
    async completeRedemption(input) {
      const row = state.redemptions.get(input.redemptionId);
      row.status = 'ready';
      return { ...row };
    },
  };
  const promotions = {
    async listPromotions({ code }) { return state.promotions.filter((row) => row.code === code); },
    async createPromotions(rows) {
      if (state.failCreate) throw Error('promotion create failed');
      if (state.promotions.some((row) => row.code === rows[0].code)) throw Error('duplicate code');
      state.creates++;
      const promotion = { ...rows[0], id: `promo_${state.creates}` };
      state.promotions.push(promotion);
      return [promotion];
    },
    async updatePromotions(rows) {
      if (state.failActivate) throw Error('activation failed');
      const row = state.promotions.find((promotion) => promotion.id === rows[0].id);
      Object.assign(row, rows[0]);
      return [row];
    },
  };
  return { state, loyalty, promotions };
}

test('loyalty rates preserve existing rounding and never increase points during a reversal', () => {
  assert.equal(pointsForTotal(1500), 15);
  assert.equal(pointsForTotal(199.99), 1);
  assert.equal(reversalDelta(15, 9), -6);
  assert.equal(reversalDelta(9, 15), 0);
  assert.equal(reversalDelta(15, 0), -15);
  assert.throws(() => pointsForTotal(NaN));
});

test('loyalty coupons are initially unusable, customer-specific and single-use', () => {
  const coupon = loyaltyPromotion('cus_1', 'LP-test', 10);
  assert.equal(coupon.status, 'draft');
  assert.equal(coupon.limit, 1);
  assert.equal(coupon.application_method.value, 5);
  assert.equal(coupon.application_method.currency_code, 'try');
  assert.deepEqual(coupon.rules, [{ attribute: 'customer_id', operator: 'eq', values: ['cus_1'] }]);
});

test('failed coupon creation does not debit any points', async () => {
  const { state, loyalty, promotions } = fixture();
  state.failCreate = true;
  await assert.rejects(redeemPoints(loyalty, promotions, { customerId: 'cus_1', requestKey: 'one', points: 10 }), /create failed/);
  assert.equal(state.balance, 20);
  assert.equal(state.debits, 0);
});

test('a failed activation resumes its existing coupon and debit without spending twice', async () => {
  const { state, loyalty, promotions } = fixture();
  const input = { customerId: 'cus_1', requestKey: 'one', points: 10 };
  state.failActivate = true;
  await assert.rejects(redeemPoints(loyalty, promotions, input), /activation failed/);
  assert.equal(state.balance, 10);
  assert.equal(state.promotions[0].status, 'draft');
  state.failActivate = false;
  const ready = await redeemPoints(loyalty, promotions, input);
  assert.equal(ready.status, 'ready');
  assert.equal(state.debits, 1);
  assert.equal(state.creates, 1);
  assert.equal(state.promotions[0].status, 'active');
});

test('insufficient points never activate an otherwise-created draft coupon', async () => {
  const { state, loyalty, promotions } = fixture();
  state.balance = 1;
  await assert.rejects(redeemPoints(loyalty, promotions, { customerId: 'cus_1', requestKey: 'one', points: 10 }), /insufficient/);
  assert.equal(state.balance, 1);
  assert.equal(state.promotions[0].status, 'draft');
});

test('concurrent retries reuse one coupon and one debit', async () => {
  const { state, loyalty, promotions } = fixture();
  const input = { customerId: 'cus_1', requestKey: 'one', points: 10 };
  await Promise.all([redeemPoints(loyalty, promotions, input), redeemPoints(loyalty, promotions, input)]);
  assert.equal(state.creates, 1);
  assert.equal(state.debits, 1);
  assert.equal(state.balance, 10);
});

test('concurrent different redemptions cannot activate coupons beyond the account balance', async () => {
  const { state, loyalty, promotions } = fixture();
  const results = await Promise.allSettled([
    redeemPoints(loyalty, promotions, { customerId: 'cus_1', requestKey: 'one', points: 15 }),
    redeemPoints(loyalty, promotions, { customerId: 'cus_1', requestKey: 'two', points: 15 }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.balance, 5);
  assert.equal(state.promotions.filter((row) => row.status === 'active').length, 1);
});

// A minimal query adapter exercises ledger decisions. PostgreSQL locking/rollback
// still require the deployment database integration check; this is not that check.
function ledgerFixture() {
  const state = { account: null, transactions: [] };
  const db = { async execute(sql, args = []) {
    if (sql.includes('pg_advisory_xact_lock')) return [];
    if (sql.startsWith('insert into loyalty_account')) {
      state.account ??= { id: args[0], customer_id: args[1], balance: 0, lifetime_earned: 0 };
      return [];
    }
    if (sql.startsWith('select * from loyalty_account')) return [state.account];
    if (sql.startsWith('select * from loyalty_transaction where idempotency_key')) return state.transactions.filter(row => row.idempotency_key === args[0]);
    if (sql.startsWith('select * from loyalty_transaction where customer_id')) return state.transactions.filter(row => row.customer_id === args[0] && row.order_id === args[1]);
    if (sql.startsWith('insert into loyalty_transaction')) {
      const [id, customer_id, order_id, points, reason, idempotency_key, target_points] = args;
      const row = { id, customer_id, order_id, points, reason, idempotency_key, target_points };
      state.transactions.push(row);
      return [row];
    }
    if (sql.startsWith('update loyalty_account')) {
      state.account.balance += args[0];
      state.account.lifetime_earned += args[1];
      return [];
    }
    throw Error(`Unexpected ledger query: ${sql}`);
  } };
  return { state, db };
}

test('duplicate completion and return events each create one ledger movement', async () => {
  const { state, db } = ledgerFixture();
  const order = { customerId: 'cus_1', orderId: 'order_1' };
  const credit = { type: 'credit', ...order, totalTry: 1500 };
  const returned = { type: 'reverse', ...order, totalTry: 900, eventKey: 'return:order_1:ret_1' };
  await applyLedgerAction(db, credit);
  await applyLedgerAction(db, credit);
  await applyLedgerAction(db, returned);
  await applyLedgerAction(db, returned);
  assert.equal(state.account.balance, 9);
  assert.equal(state.account.lifetime_earned, 15);
  assert.equal(state.transactions.length, 2);
});

test('a cancellation received before completion prevents later stale earned points', async () => {
  const { state, db } = ledgerFixture();
  const order = { customerId: 'cus_1', orderId: 'order_1' };
  await applyLedgerAction(db, { type: 'reverse', ...order, totalTry: 0, eventKey: 'cancel:order_1' });
  await applyLedgerAction(db, { type: 'credit', ...order, totalTry: 1500 });
  assert.equal(state.account.balance, 0);
  assert.equal(state.account.lifetime_earned, 0);
});

test('late return events cannot restore points already reversed by cancellation', async () => {
  const { state, db } = ledgerFixture();
  const order = { customerId: 'cus_1', orderId: 'order_1' };
  await applyLedgerAction(db, { type: 'credit', ...order, totalTry: 1500 });
  await applyLedgerAction(db, { type: 'reverse', ...order, totalTry: 0, eventKey: 'cancel:order_1' });
  await applyLedgerAction(db, { type: 'reverse', ...order, totalTry: 900, eventKey: 'return:order_1:ret_1' });
  assert.equal(state.account.balance, 0);
});
