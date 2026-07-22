import { test, expect } from "@playwright/test";

test.describe("Smoke — kritik sayfalar açılıyor", () => {
  test("Ana sayfa", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Testere/);
    // Hero alanı veya konteyner görünüyor
    await expect(page.locator("body")).toBeVisible();
  });

  test("Katalog sayfasındaki ürün kartları render olur", async ({ page }) => {
    await page.goto("/");
    // En az bir ürün kartı görünene kadar bekle (Medusa yüklemesi async)
    const card = page.locator('[id="products"] article').first();
    await card.waitFor({ state: "visible", timeout: 15_000 });
  });

  test("Blog listesi sayfası açılır", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: /rehberi/i })).toBeVisible();
  });

  test("Yasal sayfalar açılır (KVKK örneği)", async ({ page }) => {
    await page.goto("/yasal/kvkk-aydinlatma-metni");
    await expect(
      page.getByRole("heading", { name: /KVKK Aydınlatma Metni/i })
    ).toBeVisible();
  });

  test("Arama sayfası açılıp 'sonuç bulunamadı' veya kart döndürür", async ({
    page,
  }) => {
    await page.goto("/arama?q=zzzzz_imkansiz_arama");
    await expect(page.getByText(/arama sonuçları/i)).toBeVisible();
  });

  test("Footer'da yasal linkler render olur", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Gizlilik Politikası/i })).toBeVisible();
  });
});

test.describe("Sepet — boş durum + ürün ekleme", () => {
  test("Sepet boşken anlamlı mesaj gösterir", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/Sepetiniz Boş/i)).toBeVisible();
  });
});

test.describe("SEO altyapısı", () => {
  test("sitemap.xml 200 döner ve XML içerir", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<?xml");
    expect(body).toContain("<urlset");
  });

  test("robots.txt 200 döner ve Sitemap satırı içerir", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toContain("sitemap:");
  });

  test("manifest.webmanifest erişilebilir", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect([200, 304]).toContain(res.status());
  });
});
