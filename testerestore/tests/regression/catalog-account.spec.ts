import { expect, test, type Route } from '@playwright/test';

const json = (route: Route, body: unknown, status = 200) => route.fulfill({
  status, contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body),
});
const product = (index: number, title = `Arama ürünü ${index}`) => ({
  id: `prod_search_${index}`, handle: index === 0 ? 'hazir-stok' : `arama-${index}`, title,
  thumbnail: '/images/bimetal_blade.png', variants: [], metadata: {}, categories: [],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ts_cookie_consent', 'necessary'));
});

test('search failures offer retry and all 25 results are reachable through pagination', async ({ page }) => {
  let fail = true;
  const products = Array.from({ length: 25 }, (_, i) => product(i));
  await page.route('**/store/products?**', async (route) => {
    if (fail) return json(route, { message: 'Temporary outage' }, 503);
    const query = new URL(route.request().url()).searchParams;
    const offset = Number(query.get('offset') || 0), limit = Number(query.get('limit') || 24);
    return json(route, { products: products.slice(offset, offset + limit), count: 25, offset, limit });
  });
  await page.goto('/arama?q=bul');
  await expect(page.getByText('Arama sonuçları yüklenemedi. Lütfen tekrar deneyin.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sonuç bulunamadı' })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await expect(page.locator('main h3')).toHaveCount(24);
  await page.getByRole('link', { name: 'Sonraki', exact: true }).click();
  await expect(page).toHaveURL(/sayfa=2/);
  await expect(page.locator('main h3')).toHaveCount(1);
  await expect(page.locator('main h3')).toHaveText('Arama ürünü 24');
});

test('search combobox ignores an older response and supports keyboard selection', async ({ page, isMobile }) => {
  let releaseOld: () => void = () => {};
  let markOldStarted: () => void = () => {};
  let oldFinished = false;
  const oldStarted = new Promise<void>((resolve) => { markOldStarted = resolve; });
  const oldGate = new Promise<void>((resolve) => { releaseOld = resolve; });
  await page.route('**/store/products?**', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'eski') {
      markOldStarted(); await oldGate;
      await json(route, { products: [product(1, 'Eski sonuç')], count: 1 }); oldFinished = true;
      return;
    }
    return json(route, { products: [product(0, 'Yeni sonuç')], count: 1 });
  });
  await page.goto('/arama');
  if (isMobile) await page.getByRole('button', { name: 'Ara', exact: true }).click();
  const search = page.getByRole('combobox', { name: 'Ürün ara' });
  await search.fill('eski');
  await oldStarted;
  await search.fill('yeni');
  await expect(page.getByRole('option', { name: 'Yeni sonuç' })).toBeVisible();
  releaseOld();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.getByRole('option', { name: 'Eski sonuç' })).toHaveCount(0);
  await search.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Yeni sonuç' })).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/products\/hazir-stok/);
});

test('account shows order errors, paginates history, and edits/defaults addresses with feedback', async ({ page }) => {
  const customer = { id: 'cus_fixture', first_name: 'Test', last_name: 'Müşteri', email: 'test@example.invalid', metadata: { wishlist: [] } };
  let address = { id: 'addr_1', first_name: 'Test', last_name: 'Müşteri', address_1: 'Eski adres', city: 'İstanbul', country_code: 'tr', is_default_shipping: false, is_default_billing: false };
  let failOrders = true;
  const orders = Array.from({ length: 12 }, (_, i) => ({ id: `order_${i}`, display_id: i + 1, status: 'pending', fulfillment_status: 'not_fulfilled', currency_code: 'try', total: 300, created_at: '2026-10-19T00:00:00Z', items: [] }));
  await page.addInitScript(() => localStorage.setItem('medusa_auth_token', 'test-customer-token'));
  await page.route('**/store/customers/me**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/addresses/addr_1')) {
      address = { ...address, ...route.request().postDataJSON() };
      return json(route, { customer: { ...customer, addresses: [address] } });
    }
    if (path.endsWith('/addresses')) return json(route, { addresses: [address], count: 1 });
    return json(route, { customer });
  });
  await page.route('**/store/orders?**', async (route) => {
    if (failOrders) return json(route, { message: 'Unavailable' }, 503);
    const q = new URL(route.request().url()).searchParams;
    const offset = Number(q.get('offset') || 0), limit = Number(q.get('limit') || 10);
    return json(route, { orders: orders.slice(offset, offset + limit), count: orders.length });
  });
  await page.goto('/hesabim');
  await page.getByRole('button', { name: 'Siparişlerim', exact: true }).click();
  await expect(page.getByText('Siparişler yüklenemedi.', { exact: true })).toBeVisible();
  failOrders = false;
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Siparişlerim (12)' })).toBeVisible();
  await expect(page.locator('main a[href^="/hesabim/siparis/"]')).toHaveCount(10);
  await page.getByRole('button', { name: 'Sonraki', exact: true }).click();
  await expect(page.locator('main a[href^="/hesabim/siparis/"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Adreslerim', exact: true }).click();
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByLabel('Adres Satırı', { exact: true }).fill('Yeni kayıtlı adres');
  await page.getByRole('button', { name: 'Değişiklikleri Kaydet' }).click();
  await expect(page.getByRole('status')).toContainText('Adresiniz güncellendi.');
  await expect(page.getByText('Yeni kayıtlı adres')).toBeVisible();
  await page.getByRole('button', { name: 'Teslimat için varsayılan yap' }).click();
  await expect(page.getByText('Varsayılan teslimat', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Varsayılan adres güncellendi.');
});

test('ready-made filters can reach records after the original 200 product cutoff', async ({ page }) => {
  await page.goto('/hazir-urunler');
  await page.getByLabel('Boy', { exact: true }).selectOption('3204');
  await expect(page.locator('main a[href="/products/hazir-204"]')).toBeVisible();
});

test('category pagination links expose products beyond the initial API page', async ({ page }) => {
  await page.goto('/kategori/bi-metal-serit-testere?sayfa=9');
  const section = page.locator('section[aria-labelledby="urunler"]');
  await expect(section.locator('li')).toHaveCount(13);
  await expect(section.locator('a[href="/products/hazir-204"]')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /sayfa=9$/);
  await section.getByRole('link', { name: 'Önceki', exact: true }).click();
  await expect(page).toHaveURL(/sayfa=8$/);
  await expect(section.locator('li')).toHaveCount(24);
});
