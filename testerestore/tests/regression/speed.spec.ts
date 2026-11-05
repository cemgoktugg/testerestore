import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ts_cookie_consent', 'necessary'));
});

test('product gallery loads only the visible large image, the next one on demand', async ({ page }) => {
  await page.goto('/products/bimetal-premium');
  const large = (n: number) => page.locator(`img[alt$="- Görsel ${n}"]`);
  await expect(large(1)).toHaveCount(1);
  await expect(large(2)).toHaveCount(0);
  await expect(large(3)).toHaveCount(0);
  await page.getByRole('button', { name: 'Sonraki görsel' }).click();
  await expect(large(2)).toHaveCount(1);
  await expect(large(2)).toHaveClass(/opacity-100/);
  await page.getByRole('button', { name: '3. görsele git' }).click();
  await expect(large(3)).toHaveClass(/opacity-100/);
  await expect(large(1)).toHaveClass(/opacity-0/);
});

test('cross-sell asks only for title, image and price amount', async ({ page }) => {
  const lists: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/store/products' && u.searchParams.get('fields')) lists.push(u.searchParams.get('fields')!);
  });
  await page.goto('/products/bimetal-premium');
  await expect(page.getByRole('heading', { name: 'Diğer Ürünlerimiz' })).toBeVisible({ timeout: 30000 });
  const lite = lists.find((f) => f.includes('variants.calculated_price.calculated_amount'));
  expect(lite, `istekler: ${lists.join(' | ')}`).toBeTruthy();
  expect(lite).not.toContain('*variants');
  expect(lite).not.toContain('metadata');
});
