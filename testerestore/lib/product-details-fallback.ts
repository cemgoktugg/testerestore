/**
 * Hard-coded product detail fallback.
 *
 * Used only when:
 *   1. Medusa is not configured (MEDUSA_READY === false), or
 *   2. The requested slug isn't found in Medusa.
 *
 * Once products are seeded in Medusa Admin, this module is effectively dead
 * code (still kept so the demo never breaks).
 */

export interface ProductDetailsFallback {
  id: string;
  name: string;
  description: string;
  image: string;
  images?: string[];
  priceTag: string;
  category: string;
  type: 'blade' | 'machine';
  specs: string[];
  longDescription: string;
  applications: string[];
  features: string[];
}

export const PRODUCT_DETAILS_FALLBACK: Record<string, ProductDetailsFallback> = {
  'bimetal-premium': {
    id: 'bimetal-premium',
    name: 'Bi-Metal M42 Premium Şerit Testere Bıçağı',
    description:
      'Yüksek hız çeliği dişleri ve yay çeliği gövdesi ile genel metal, profil ve boru kesimlerinde mükemmel ömür ve yüksek aşınma direnci.',
    image: '/images/bimetal_blade.png',
    images: ['/images/bimetal_blade.png', '/images/hero_bandsaw.png', '/images/bandsaw_machine.png', '/images/carbide_blade.png'],
    priceTag: '110 TL / m',
    category: 'Bi-Metal',
    type: 'blade',
    specs: ['Alman Çeliği', 'M42 Kalite', 'Profiller & Borular'],
    longDescription:
      'M42 kalite şerit testerelerimiz, yüksek kaliteli HSS (Co %8) diş uçları ve esnek yay çeliği gövdesi sayesinde her türlü çelik kesiminde üstün performans sunar. Özellikle boru, profil ve dolu demir kesimlerinde titreşimi azaltan değişken diş (TPI) yapısına sahiptir. Kırılmalara karşı özel gövde mukavemeti mevcuttur.',
    applications: ['Yapısal çelikler ve profiller', 'İnce ve kalın etli çelik borular', 'Düşük alaşımlı dolu çelik malzemeler', 'Demir dışı pirinç, alüminyum ve bronz metaller'],
    features: ['IDEAL marka makinelerde kusursuz kaynak garantisi', 'Isıl işlemli HSS M42 dişler ile maksimum körelme mukavemeti', 'Gelişmiş değişken diş adımı (Vario) tasarımı ile düşük titreşimli çalışma'],
  },
  'carbide-ultimate': {
    id: 'carbide-ultimate',
    name: 'Carbide Ultimate Karbür Şerit Testere Bıçağı',
    description:
      'Karbür uçlu dişleri sayesinde paslanmaz çelikler, titanyum ve döküm malzemeler gibi zorlu metal kesimlerinde rakipsiz kesim hızı ve ömür.',
    image: '/images/carbide_blade.png',
    images: ['/images/carbide_blade.png', '/images/hero_bandsaw.png', '/images/bimetal_blade.png', '/images/bandsaw_machine.png'],
    priceTag: '280 TL / m',
    category: 'Karbür Uçlu',
    type: 'blade',
    specs: ['Karbür Dişler', 'Yüksek Sertlik', 'Zorlu Çelikler'],
    longDescription:
      'Karbür şerit testerelerimiz, diş uçlarına kaynaklanmış sert karbür partikülleri sayesinde en aşındırıcı ve sert malzemeleri kesmek için tasarlanmıştır. Paslanmaz çelikler, nikel alaşımları, titanyum ve dökme demir kesiminde en yüksek verimi sunar. Zorlu kesim koşullarında bile formunu koruyarak yüksek kesim düzgünlüğü sağlar.',
    applications: ['Tungsten, Titanyum ve Nikel alaşımları', '304/316 Paslanmaz dolu çelikler', 'Yüksek aşındırıcılığa sahip döküm bloklar', 'Sertleştirilmiş kalıp çelikleri'],
    features: ['Karbür uç teknolojisi ile HSS bıçaklara göre 5 kat daha uzun ömür', 'Minimum talaş sürtünmesi ve mükemmel pürüzsüz kesim yüzeyleri', 'Özel diş açıları sayesinde hızlı talaş atımı ve aşırı ısınmayı önleme'],
  },
  'woodcut-classic': {
    id: 'woodcut-classic',
    name: 'Woodcut Classic Ağaç Kesim Şerit Testeresi',
    description:
      'Sert ve yumuşak ağaçların hızlı ve düzgün dilimlenmesi için özel karbon çeliğinden üretilmiş yüksek dayanımlı marangoz bıçakları.',
    image: '/images/woodworking_blade.png',
    images: ['/images/woodworking_blade.png', '/images/hero_bandsaw.png', '/images/bandsaw_machine.png'],
    priceTag: '55 TL / m',
    category: 'Ağaç Kesim',
    type: 'blade',
    specs: ['Esnek Gövde', 'Aggressive Diş', 'Hızlı Dilimleme'],
    longDescription:
      'Woodcut serimiz, yüksek karbonlu çelik alaşımından üretilmiştir. Ağaç kesiminde ihtiyaç duyulan yüksek gerilim mukavemetini sağlamak üzere gövdesi özel olarak fırınlanmıştır. Sert, yaş, kuru veya donmuş ağaç bloklarının dilimlenmesinde son derece hassas ve verimli sonuçlar elde etmenizi sağlar.',
    applications: ['Sert ve yumuşak tomruk dilimleme işlemleri', 'Mobilya atölyeleri için hassas kavisli kesimler', 'MDF, sunta ve lamine ahşap panel kesimleri'],
    features: ['Yüksek gövde esnekliği sayesinde küçük kasnaklı makinelerde bile çatlamadan çalışma', 'Geniş diş aralığı ile hızlı talaş tahliyesi ve yanmayı önleme', 'Kolaylıkla tekrar bilenebilir ve diş çaprazlanabilir alaşım yapısı'],
  },
  'kraken-machine': {
    id: 'kraken-machine',
    name: 'Kraken Professional Şerit Testere Makinesi',
    description:
      'Profesyonel atölyeler için tasarlanmış, güçlü motorlu, hassas kılavuz rulmanlı ve döküm gövde yapılı şerit testere makinesi.',
    image: '/images/bandsaw_machine.png',
    images: ['/images/bandsaw_machine.png', '/images/hero_bandsaw.png', '/images/bimetal_blade.png', '/images/carbide_blade.png'],
    priceTag: '48.500 TL',
    category: 'Şerit Makinesi',
    type: 'machine',
    specs: ['2.2 kW Motor', '350mm Volan', 'Lazer Kılavuz'],
    longDescription:
      'Kraken endüstriyel şerit testere makinesi, metal ve ahşap atölyelerinin ağır hizmet ihtiyaçları için tasarlanmıştır. Çift devirli kayış sistemi, hassas rulman yataklı testere kılavuzları ve 45 dereceye kadar yatabilir döküm tablası ile kusursuz açılı kesimlere imkan tanır. Gövdesi titreşimi soğuracak şekilde optimize edilmiştir.',
    applications: ['Profiller ve metal lamaların açılı hassas kesimleri', 'Mobilya tomruk ve kalas dilimleme işleri', 'Plastik ve kalın pleksiglas panellerin kesimleri'],
    features: ['2.2 kW yüksek torklu bakır sargı elektrik motoru', 'Hassas optik lazer kesim çizgi kılavuzu', 'Dahili acil stop acil durum anahtarı ve tekerlek emniyet şalterleri'],
  },
};
