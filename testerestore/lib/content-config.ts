/**
 * Centralized content config.
 *
 * Everything in this file is data the Medusa Admin does NOT manage today
 * (hero slides, advantage cards, usage sectors, CTA copy). It is shaped
 * so it can be replaced 1:1 with a future Medusa Custom Module / Strapi /
 * Sanity feed without touching the React components.
 *
 * Replacement plan:
 *   1. Build a Medusa custom module "site-content" with the same fields.
 *   2. Replace the static export below with a server-side fetcher.
 *   3. Components keep their props — no JSX changes required.
 */

export interface HeroSlideContent {
  id: string;
  badge: string;
  badgeIcon: "zap" | "flame" | "wrench" | "award";
  titlePrefix: string;
  titleSuffix?: string;
  highlight: string;
  description: string;
  image: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  accent: string;
}

export interface AdvantageCard {
  id: string;
  icon: "shield" | "truck" | "headset" | "award" | "leaf";
  title: string;
  description: string;
}

export interface UsageSector {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface SiteContent {
  hero: {
    slides: HeroSlideContent[];
  };
  ctaCallout: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
  };
  advantages: AdvantageCard[];
  sectors: UsageSector[];
  catalogSection: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
  };
  bestSellersSection: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
  };
  seo: {
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    twitterHandle?: string;
    ogImage: string;
  };
}

export const siteContent: SiteContent = {
  hero: {
    slides: [
      {
        id: "bimetal",
        badge: "Özel Boy Kaynaklı Şerit Testereler",
        badgeIcon: "zap",
        titlePrefix: "Endüstriyel Kesimde",
        highlight: "Premium Standartlar",
        description:
          "Geleceğin Şerit Testere Mağazası. Malzemenizi seçin, milimetrik boyunuzu girin, 3D inceleyin ve kaynak garantisiyle sipariş verin.",
        image: "/images/hero_bandsaw.png",
        primaryCta: { label: "Hemen Yapılandır", href: "/products/bimetal-premium" },
        secondaryCta: { label: "Ürünleri İncele", href: "#products" },
        accent: "from-orange-500/30 via-amber-500/10",
      },
      {
        id: "carbide",
        badge: "Karbür Uçlu Yeni Seri",
        badgeIcon: "flame",
        titlePrefix: "Paslanmaz & Titanyum İçin",
        highlight: "Karbür Uçlu Performans",
        description:
          "Karbür uçlu dişleriyle en sert alaşımlarda dahi rakipsiz kesim hızı. Uzun ömür, düşük titreşim, profesyonel atölye standardı.",
        image: "/images/carbide_blade.png",
        primaryCta: { label: "Carbide Modelini Gör", href: "/products/carbide-ultimate" },
        secondaryCta: { label: "Tüm Bıçaklar", href: "#products" },
        accent: "from-sky-500/25 via-indigo-500/10",
      },
      {
        id: "machine",
        badge: "Profesyonel Atölye Ekipmanı",
        badgeIcon: "wrench",
        titlePrefix: "Güçlü Motor, Hassas Kesim",
        highlight: "Kraken Şerit Makinesi",
        description:
          "2.2 kW motor, 350 mm volan ve lazer kılavuzlu döküm gövde. Atölyenizin üretim hızını üst seviyeye çıkaran profesyonel çözüm.",
        image: "/images/bandsaw_machine.png",
        primaryCta: { label: "Makineyi İncele", href: "/products/kraken-machine" },
        secondaryCta: { label: "Teknik Özellikler", href: "#products" },
        accent: "from-emerald-500/25 via-teal-500/10",
      },
    ],
  },
  ctaCallout: {
    title: "Tam Ölçünüzü Biliyor musunuz?",
    description:
      "Beklemek yok. Bi-Metal M42 sayfamıza giderek milimetrik boyunuzu girin, fiyatı anında görün ve sepetinize ekleyin. Profesyonel kaynaklı şeridiniz aynı gün hazırlansın.",
    primaryCta: { label: "Parametrik Siparişe Git", href: "/products/bimetal-premium" },
  },
  advantages: [
    { id: "ideal-welding", icon: "shield", title: "Alman IDEAL Kaynak", description: "Mikroişlemci kontrollü alın kaynağı ile kopma garantisi." },
    { id: "fast-shipping", icon: "truck", title: "24 Saatte Kargo", description: "Stokta hazır ve özel ölçü tüm siparişler aynı gün hazırlanır." },
    { id: "expert-support", icon: "headset", title: "Uzman Desteği", description: "Doğru diş ve kesim parametrelerini birlikte belirleyelim." },
  ],
  sectors: [
    { id: "metal", icon: "🔩", title: "Metal & Sanayi", description: "Profil, boru, dolu çelik." },
    { id: "wood", icon: "🪵", title: "Ahşap & Marangoz", description: "Sert/yumuşak ağaç dilimleme." },
    { id: "meat-bone", icon: "🥩", title: "Et & Kemik", description: "Hijyenik paslanmaz alaşım." },
    { id: "textile", icon: "🧶", title: "Sünger / Tekstil", description: "Pürüzsüz kavisli kesim." },
    { id: "carbide", icon: "💎", title: "Karbür Uçlu", description: "Sertleştirilmiş kalıp çelikleri." },
  ],
  catalogSection: {
    eyebrow: "Ürünlerimiz",
    title: "Premium",
    titleHighlight: "Katalog",
    subtitle:
      "Metal, ahşap, et-kemik ve karbür uçlu şerit testere çözümlerini kullanım alanına göre keşfedin.",
  },
  bestSellersSection: {
    eyebrow: "En Çok Tercih Edilenler",
    title: "Çok Satan",
    titleHighlight: "Ürünlerimiz",
    subtitle:
      "Profesyonel atölyelerin ve sanayi uzmanlarının en çok tercih ettiği şerit testerelerimiz. Müşteri puanları ve satış adetleriyle kanıtlanmış kalite.",
  },
  seo: {
    siteName: "TestereStore",
    defaultTitle: "Testere Store — Premium Şerit Testereler ve Bıçaklar",
    defaultDescription:
      "Endüstriyel şerit testereler ve şerit testere bıçaklarında modern, yüksek kaliteli ve parametrik çözümler sunan Türkiye'nin lider satış platformu.",
    ogImage: "/images/hero_bandsaw.png",
  },
};
