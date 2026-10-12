// IndexNow: sitemap'teki tüm URL'leri Bing, Yandex vb. arama motorlarına anında bildirir.
// ChatGPT / Copilot arama Bing dizinini kullandığı için AI görünürlüğünü hızlandırır.
// Kullanım (deploy sonrası):  node scripts/indexnow.mjs
// Anahtar dosyası: public/7360f1fc8507df6febb4a4d0de0b865f.txt  (https://testerestore.com/7360f1fc8507df6febb4a4d0de0b865f.txt)
const HOST = 'testerestore.com';
const KEY = '7360f1fc8507df6febb4a4d0de0b865f';
const SITE = `https://${HOST}`;

const keyRes = await fetch(`${SITE}/${KEY}.txt`);
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
  console.error('Anahtar dosyası canlıda yok veya hatalı — önce deploy edin.');
  process.exit(1);
}
const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) { console.error('Sitemap boş.'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${urlList.length} URL gönderildi → HTTP ${res.status}`, res.status === 200 || res.status === 202 ? '(kabul edildi)' : await res.text());
