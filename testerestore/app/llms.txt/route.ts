import { listProducts } from '../../lib/medusa/services/products';
import { isReadyMade } from '../../lib/ready-made';
import { CATEGORY_PAGES } from '../../lib/category-pages';
import { LEGAL_LINKS } from '../../lib/legal-links';
import { SITE_URL } from '../../lib/seo';

/**
 * /llms.txt — AI asistanları (ChatGPT, Claude, Perplexity…) için sitenin
 * sade metin özeti (https://llmstxt.org). Kategori ve ürün listesi canlı
 * veriden üretilir; saatte bir yenilenir.
 */
export const revalidate = 3600;

export async function GET() {
  const { products } = await listProducts({ limit: 200 });
  const configurable = products.filter((p) => !isReadyMade(p));
  const ready = products.filter((p) => isReadyMade(p));
  const line = (title: string, path: string, note?: string | null) =>
    `- [${title}](${SITE_URL}${path})${note ? `: ${note.replace(/\s+/g, ' ').trim()}` : ''}`;

  const body = [
    '# Testere Store',
    '',
    '> Türkiye’de şerit testere bıçağı satan online mağaza: bi-metal (M42, M51), karbür uçlu, ahşap, et-kemik ve sünger/tekstil kesim bıçakları. Bıçaklar müşterinin girdiği ölçüde (genişlik, kalınlık, diş adımı/TPI, boy) kaynaklanarak hazırlanır; standart ölçülerde stoktan hazır boy bıçaklar da satılır. Fiyatlar Türk lirasıdır (TRY).',
    '',
    'Sipariş: ürün sayfasında ölçü seçilir, fiyat anında hesaplanır, kartla (iyzico, 3D Secure) ödenir. Kişiye özel ölçüde üretilen bıçaklarda cayma hakkı yoktur; hazır boy ürünlerde 14 gün cayma hakkı vardır.',
    '',
    '## Kategoriler',
    ...CATEGORY_PAGES.map((c) => line(c.h1, `/kategori/${c.slug}`, c.description)),
    line('Hazır Boy Ürünler', '/hazir-urunler', 'Stoktan, standart ölçülerde önceden kaynaklı bıçaklar.'),
    '',
    '## Ölçüye göre sipariş edilen ürünler',
    ...configurable.map((p) => line(p.title || '', `/products/${p.handle}`, p.subtitle)),
    '',
    '## Hazır boy ürünler',
    ...ready.map((p) => line(p.title || '', `/products/${p.handle}`)),
    '',
    '## Bilgi',
    line('Sık Sorulan Sorular', '/sss', 'Ölçü alma, TPI seçimi, ödeme, kargo ve cayma hakkı.'),
    line('İletişim', '/iletisim'),
    '',
    '## Yasal',
    ...LEGAL_LINKS.map((l) => line(l.title, `/yasal/${l.slug}`)),
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
