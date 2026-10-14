/**
 * /llms.txt ve /llms-full.txt içerik üreticileri (https://llmstxt.org).
 * AI asistanları (ChatGPT, Claude, Perplexity, Gemini) siteyi bu dosyalardan
 * hızlı ve doğru özetleyebilir. İçerik canlı veriden (Medusa + lib/*) üretilir.
 */
import { listProductsForLlms } from './medusa/services/products';
import { isReadyMade } from './ready-made';
import { CATEGORY_PAGES } from './category-pages';
import { GUIDES, type GuideBlock } from './guides';
import { LEGAL_LINKS } from './legal-links';
import { SITE_URL } from './seo';
import type { StoreProduct } from './medusa/types';

const one = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();
const link = (title: string, path: string, note?: string | null) =>
  `- [${title}](${SITE_URL}${path})${note ? `: ${one(note)}` : ''}`;

const INTRO = [
  '# Testere Store',
  '',
  '> Türkiye’de şerit testere bıçağı satan online mağaza (testerestore.com): bi-metal (M42, M51), karbür uçlu (TCT), ahşap, et-kemik ve sünger/tekstil kesim bıçakları. Bıçaklar müşterinin girdiği ölçüde (genişlik, kalınlık, diş adımı/TPI, boy) kesilip alın kaynağıyla birleştirilerek hazırlanır; standart ölçülerde stoktan hazır boy bıçaklar da satılır. Fiyatlar Türk lirasıdır (TRY).',
  '',
  'Sipariş: ürün sayfasında ölçü seçilir, fiyat anında hesaplanır, kredi/banka kartıyla (iyzico, 3D Secure) ödenir. Kişiye özel ölçüde üretilen bıçaklarda cayma hakkı yoktur; hazır boy ürünlerde teslimden itibaren 14 gün cayma hakkı vardır.',
  'Kargo: ürün toplamı KDV dahil 2.000 TL ve üzeri siparişlerde standart kargo ücretsizdir; altındaki siparişlerde kargo ücreti 79,90 TL + KDV’dir.',
];

async function products(): Promise<StoreProduct[]> {
  try {
    return await listProductsForLlms();
  } catch {
    return [];
  }
}

export async function buildLlmsTxt(): Promise<string> {
  const all = await products();
  const configurable = all.filter((p) => !isReadyMade(p));
  const ready = all.filter((p) => isReadyMade(p));
  return [
    ...INTRO,
    '',
    `Tüm içeriğin tek dosyada tam metni: ${SITE_URL}/llms-full.txt`,
    '',
    '## Kategoriler',
    ...CATEGORY_PAGES.map((c) => link(c.h1, `/kategori/${c.slug}`, c.description)),
    link('Hazır Boy Ürünler', '/hazir-urunler', 'Stoktan, standart ölçülerde önceden kaynaklı bıçaklar.'),
    '',
    '## Ölçüye göre sipariş edilen ürünler',
    ...configurable.map((p) => link(p.title || '', `/products/${p.handle}`, p.subtitle)),
    '',
    '## Hazır boy ürünler',
    ...ready.map((p) => link(p.title || '', `/products/${p.handle}`)),
    '',
    '## Teknik rehberler',
    ...GUIDES.map((g) => link(g.h1, `/rehber/${g.slug}`, g.summary)),
    '',
    '## Bilgi',
    link('Sık Sorulan Sorular', '/sss', 'Ölçü alma, TPI seçimi, ödeme, kargo ve cayma hakkı.'),
    link('Hakkımızda', '/hakkimizda'),
    link('İletişim', '/iletisim'),
    '',
    '## Yasal',
    ...LEGAL_LINKS.map((l) => link(l.title, `/yasal/${l.slug}`)),
    '',
  ].join('\n');
}

function blockText(b: GuideBlock): string {
  switch (b.type) {
    case 'p':
    case 'note':
      return b.text;
    case 'h2':
      return `### ${b.text}`;
    case 'ul':
      return b.items.map((i) => `- ${i}`).join('\n');
    case 'ol':
      return b.items.map((i, k) => `${k + 1}. ${i}`).join('\n');
    case 'formula':
      return `${b.text}${b.note ? ` (${b.note})` : ''}`;
    case 'table':
      return [
        `| ${b.head.join(' | ')} |`,
        `| ${b.head.map(() => '---').join(' | ')} |`,
        ...b.rows.map((r) => `| ${r.join(' | ')} |`),
        b.caption ? `\n${b.caption}` : '',
      ].join('\n');
  }
}

export async function buildLlmsFullTxt(): Promise<string> {
  const all = await products();
  const out: string[] = [...INTRO, ''];

  out.push('## Kategoriler', '');
  for (const c of CATEGORY_PAGES) {
    out.push(`### ${c.h1}`, `URL: ${SITE_URL}/kategori/${c.slug}`, '', ...c.intro.map(one), '');
    out.push(`${c.tipsTitle}:`, ...c.tips.map((t) => `- ${t}`), '');
    for (const f of c.faqs) out.push(`Soru: ${f.q}`, `Cevap: ${f.a}`, '');
  }

  out.push('## Ürünler', '');
  for (const p of all) {
    const m = (p.metadata || {}) as Record<string, unknown>;
    out.push(`### ${p.title}`, `URL: ${SITE_URL}/products/${p.handle}`);
    if (p.categories?.length) out.push(`Kategori: ${p.categories.map((c) => c.name).join(', ')}`);
    if (p.subtitle) out.push('', one(p.subtitle));
    const long = typeof m.long_description === 'string' ? m.long_description : p.description;
    if (long) out.push('', long.replace(/^### /gm, '#### '));
    const specs = Array.isArray(m.technical_specs) ? (m.technical_specs as Array<{ label: string; value: string }>) : [];
    if (specs.length) out.push('', 'Teknik özellikler:', ...specs.map((s) => `- ${s.label}: ${s.value}`));
    if (m.min_length_mm && m.max_length_mm) out.push(`- Sipariş edilebilir boy: ${m.min_length_mm}–${m.max_length_mm} mm`);
    if (isReadyMade(p) && m.width_mm) {
      out.push(`- Ölçü: ${m.width_mm} × ${m.thickness_mm} mm, ${m.tooth_pitch} TPI, ${m.length_mm} mm boy (hazır, stoktan)`);
    }
    out.push('');
  }

  out.push('## Teknik rehberler', '');
  for (const g of GUIDES) {
    out.push(`### ${g.h1}`, `URL: ${SITE_URL}/rehber/${g.slug}`, '', ...g.blocks.map(blockText), '');
    for (const f of g.faqs) out.push(`Soru: ${f.q}`, `Cevap: ${f.a}`, '');
  }

  out.push('## Yasal sayfalar', ...LEGAL_LINKS.map((l) => link(l.title, `/yasal/${l.slug}`)), '');
  return out.join('\n');
}
