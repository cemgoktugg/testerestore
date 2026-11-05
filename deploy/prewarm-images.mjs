#!/usr/bin/env node
/**
 * Deploy sonrası ürün resimlerini önceden dönüştürür (next/image önbelleğini ısıtır).
 *
 * Neden: next/image bir resmi her genişlik için ilk istendiğinde VPS'te
 * dönüştürür. Isıtılmamış önbellekte yeni bir cihazın ürün sayfası resimleri
 * saniyelerce bekliyordu. Bu betik, cihazların en sık istediği genişlikleri
 * sırayla ister; sonraki ziyaretçiler hazır dosyayı alır.
 *
 * Kullanım (herhangi bir bilgisayardan, Node 18+):
 *   node deploy/prewarm-images.mjs                 # https://testerestore.com
 *   node deploy/prewarm-images.mjs https://alan.adi
 *
 * Sunucuyu yormamak için aynı anda en fazla 2 istek gönderir. Yalnız GET yapar.
 */
const SITE = (process.argv.slice(2).find((a) => !a.startsWith("--")) || "https://testerestore.com").replace(/\/$/, "");
const CONCURRENCY = 2;
// Telefon (1x-3x), tablet ve masaüstü ana resim genişlikleri + küçük resimler.
const WIDTHS = new Set([64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920]);
const ACCEPT = "image/webp,image/*,*/*;q=0.8";

async function text(url) {
  const r = await fetch(url, { headers: { "User-Agent": "testerestore-prewarm" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// Sayfada geçen her optimize resmin kaynak adresi (url= parametresi). Galeride
// yalnız ilk resim HTML'de büyük haliyle var, diğerleri küçük resim olarak
// geçiyor; kaynaktan bütün genişlikler üretildiği için hepsi ısınır.
function sourceImages(html) {
  const out = new Set();
  for (const m of html.matchAll(/\/_next\/image\?url=([^&"\s]+)/g)) {
    try {
      out.add(decodeURIComponent(m[1]));
    } catch {
      /* bozuk adres: atla */
    }
  }
  return out;
}

async function pool(items, worker) {
  const queue = [...items];
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        await worker(queue.shift());
        done++;
        if (done % 25 === 0) console.log(`  ${done}/${items.length}`);
      }
    })
  );
}

const sitemap = await text(`${SITE}/sitemap.xml`);
const pages = [SITE + "/", SITE + "/hazir-urunler"];
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  if (/\/products\//.test(m[1])) pages.push(m[1].replace(/^https?:\/\/[^/]+/, SITE));
}
console.log(`${pages.length} sayfa taranıyor…`);

const sources = new Set();
await pool(pages, async (p) => {
  try {
    for (const s of sourceImages(await text(p))) sources.add(s);
  } catch (e) {
    console.warn("  sayfa atlandı:", e.message);
  }
});
const urls = new Set();
for (const s of sources) {
  for (const w of WIDTHS) urls.add(`${SITE}/_next/image?url=${encodeURIComponent(s)}&w=${w}&q=75`);
}
console.log(`${sources.size} farklı resim bulundu.`);
if (process.argv.includes("--dry")) {
  console.log(`(deneme) ${urls.size} istek atılacaktı; ilk örnek: ${[...urls][0] ?? "-"}`);
  process.exit(0);
}
console.log(`${urls.size} resim boyutu ısıtılıyor…`);

const started = Date.now();
let slow = 0, failed = 0;
await pool([...urls], async (u) => {
  const t = Date.now();
  try {
    const r = await fetch(u, { headers: { Accept: ACCEPT, "User-Agent": "testerestore-prewarm" } });
    await r.arrayBuffer();
    if (!r.ok) { failed++; console.warn("  hata", r.status, u); }
    else if (Date.now() - t > 1500) slow++;
  } catch (e) {
    failed++;
    console.warn("  hata", e.message, u);
  }
});
console.log(
  `Bitti: ${urls.size} resim, ${Math.round((Date.now() - started) / 1000)} sn` +
    ` (yavaş ilk dönüşüm: ${slow}, hata: ${failed}).`
);
