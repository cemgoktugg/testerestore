import { expect, test } from "@playwright/test";

test("çerez kategorileri ayrı kaydedilir ve footer'dan geri alınır", async ({ page }) => {
  await page.goto("/iletisim");
  const panel = page.getByRole("dialog", { name: "Çerez Tercihleri" });
  await panel.getByRole("button", { name: "Tercihleri düzenle" }).click();
  await panel.getByRole("checkbox", { name: /^Analitik/ }).check();
  await panel.getByRole("button", { name: "Seçimlerimi kaydet" }).click();
  await expect(panel).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ts_cookie_consent")!))).toMatchObject({ version: 2, analytics: true, marketing: false });
  await page.getByRole("button", { name: "Çerez tercihleri", exact: true }).click();
  await expect(panel.getByRole("checkbox", { name: /^Analitik/ })).toBeChecked();
  await panel.getByRole("button", { name: "Sadece zorunlu" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ts_cookie_consent")!))).toMatchObject({ analytics: false, marketing: false });
  await expect(page.getByRole("heading", { name: "Bize Ulaşın" })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp ile iletişime geç" })).toHaveCount(0);
});

test.describe("ürün ve sepet doğruluğu", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ts_cookie_consent", "necessary"));
  });

  test("stok sıfır olduğunda satın alma kapanır ve SEO stok bilgisi eşleşir", async ({ page }) => {
    await page.goto("/products/hazir-tukendi");
    await expect(page.getByRole("button", { name: "Sepete Ekle", exact: true })).toBeDisabled();
    await expect(page.getByText("Tükendi", { exact: true }).first()).toBeVisible();
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    const product = schema.map(s => JSON.parse(s)).find(s => s["@type"] === "Product");
    expect(product.offers.availability).toBe("https://schema.org/OutOfStock");
    await expect(page.getByText("0 adet · aynı gün kargo", { exact: true })).toHaveCount(0);
  });

  test("mevcut stoktan fazla adet eklenemez", async ({ page }) => {
    await page.goto("/products/hazir-stok");
    await page.getByRole("spinbutton", { name: "Adet", exact: true }).fill("4");
    await expect(page.getByRole("button", { name: "Sepete Ekle", exact: true })).toBeDisabled();
    await expect(page.getByRole("alert").filter({ hasText: "mevcut stoğu aşıyor" })).toBeVisible();
    await page.getByRole("spinbutton", { name: "Adet", exact: true }).fill("3");
    await expect(page.getByRole("button", { name: "Sepete Ekle", exact: true })).toBeEnabled();
  });

  test("başarısız sepet değişikliği açıklanır ve mevcut ürün korunur", async ({ page }) => {
    await page.goto("/products/hazir-stok");
    await page.getByRole("button", { name: "Sepete Ekle", exact: true }).click();
    await expect(page.getByRole("button", { name: /Sepete Eklendi/ })).toBeVisible();
    await page.goto("/cart");
    await page.route("**/store/carts/*/line-items/*", async route => {
      if (["POST", "DELETE"].includes(route.request().method())) return route.fulfill({ status: 503, json: { message: "Test bağlantı hatası" } });
      return route.continue();
    });
    await page.getByRole("button", { name: /adedini artır$/ }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /adedini artır$/ })).toBeEnabled();
    await page.getByRole("button", { name: /ürününü sepetten çıkar$/ }).click();
    await expect(page.getByRole("heading", { name: /Bi-Metal M42 Hazır 3002/ })).toBeVisible();
    await expect(page.getByText("Sepetiniz Boş", { exact: true })).toHaveCount(0);
  });

  test("ölçü değişiminde eski fiyat yanıtı yeni seçimi geçersiz kılamaz", async ({ page }) => {
    await page.route("**/store/blade-price/calculate", async route => {
      const input = route.request().postDataJSON();
      if (input.length_mm === 3500) await new Promise(resolve => setTimeout(resolve, 900));
      const unit = input.length_mm / 10;
      await route.fulfill({ json: { ...input, length_meter: input.length_mm / 1000, price_per_meter: 100, welding_fee: 90, unit_price: unit, subtotal: unit * input.quantity, total_price: (unit + 90) * input.quantity, currency_code: "try" } });
    });
    await page.goto("/products/bimetal-premium");
    const add = page.getByRole("button", { name: "Sepete Ekle", exact: true });
    await expect(add).toBeEnabled();
    const length = page.getByRole("spinbutton").first();
    const oldRequest = page.waitForRequest(req => req.url().endsWith("/blade-price/calculate") && req.postDataJSON().length_mm === 3500);
    const oldResponse = page.waitForResponse(res => res.url().endsWith("/blade-price/calculate") && res.request().postDataJSON().length_mm === 3500);
    await length.fill("3500");
    await expect(add).toBeDisabled();
    await oldRequest;
    await length.fill("4000");
    await expect(add).toBeEnabled();
    await oldResponse;
    await expect(length).toHaveValue("4000");
    await expect(page.getByText(/4\.000 mm/).first()).toBeVisible();
    await expect(page.getByText(/3\.500 mm/)).toHaveCount(0);
  });
});

test("sitemap 200 kaydın ötesindeki ürünleri de içerir", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("/products/hazir-204");
});
