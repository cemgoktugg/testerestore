import { expect, test } from '@playwright/test';

for (const action of ['confirm', 'unsubscribe']) {
  test(`newsletter ${action} keeps tokens out of URLs and waits for an explicit action`, async ({ page }) => {
    let submitted = 0;
    await page.addInitScript(() => localStorage.setItem('ts_cookie_consent', 'necessary'));
    await page.route(`**/store/newsletter/${action}`, async route => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ token: 'fixture-token' });
      submitted++;
      await route.fulfill({ json: { message: 'İşleminiz tamamlandı.' } });
    });
    await page.goto(`/bulten?islem=${action === 'confirm' ? 'onayla' : 'ayril'}#token=fixture-token`);
    const button = page.getByRole('button', { name: action === 'confirm' ? 'Aboneliğimi onayla' : 'Abonelikten ayrıl', exact: true });
    await expect(button).toBeEnabled();
    await expect(page).not.toHaveURL(/fixture-token/);
    expect(submitted).toBe(0);
    await page.reload();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByRole('status')).toContainText('İşleminiz tamamlandı.');
    expect(submitted).toBe(1);
  });
}
