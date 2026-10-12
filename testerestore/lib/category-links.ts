// Client bileşenlerinin de kullandığı hafif kategori link yardımcıları
// (kategori içerikleri lib/category-pages.ts'de — tarayıcı paketine girmesin).
/**
 * Ana sayfa filtre etiketleri (?kategori=…) → kategori sayfası. Admin'deki
 * footer linkleri ve eski iç linkler hâlâ `/?kategori=X#products` biçiminde
 * olabilir; bunlar render sırasında gerçek kategori sayfasına çevrilir.
 */
const PILL_TO_SLUG: Record<string, string> = {
  'Bi-Metal': 'bi-metal-serit-testere',
  'Ahşap Kesim': 'ahsap-serit-testere',
  'Et ve Kemik Kesim': 'et-kemik-serit-testere',
  'Karbür Uçlu': 'karbur-uclu-serit-testere',
};

export function resolveLegacyCategoryHref(href: string | undefined | null): string | undefined {
  if (!href || !href.includes('kategori=')) return href ?? undefined;
  try {
    const u = new URL(href, 'https://x.local');
    if (u.pathname !== '/') return href;
    const slug = PILL_TO_SLUG[u.searchParams.get('kategori') || ''];
    return slug ? `/kategori/${slug}` : href;
  } catch {
    return href;
  }
}
