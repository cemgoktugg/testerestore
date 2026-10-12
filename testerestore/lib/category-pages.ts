/**
 * Kategori landing sayfaları (/kategori/[slug]) — SEO/GEO içeriği.
 *
 * Medusa kategorilerinin handle'ları İngilizce (bimetal, wood, meat-bone…);
 * URL'ler Türkçe ve aranan ifadeyle eşleşsin diye slug → handle eşlemesi
 * burada tutulur. Metinler genel, doğrulanabilir teknik bilgidir: menşe,
 * "lider", süre/rakam vaadi gibi iddialar BİLEREK yoktur (ürüne özgü değerler
 * ürün sayfalarında). Yeni kategori eklemek için diziye kayıt eklemek yeterli.
 */

export interface CategoryFaq {
  q: string;
  a: string;
}

export interface CategoryPage {
  slug: string;
  /** Bu sayfada listelenecek Medusa kategori handle'ları (alt kategoriler dahil). */
  handles: string[];
  /** Menü / breadcrumb adı */
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string[];
  tipsTitle: string;
  tips: string[];
  faqs: CategoryFaq[];
}

const TPI_RULE =
  'Temel kural, kesit içinde aynı anda en az üç dişin çalışmasıdır. İnce cidarlı boru ve profillerde sık diş (yüksek TPI), büyük kesitli dolu malzemede seyrek diş (düşük TPI) seçilir. Ürün sayfasındaki diş profili ve TPI danışmanı, malzemenize ve kesitinize göre öneri verir.';

const LENGTH_FAQ: CategoryFaq = {
  q: 'Şerit testere boyunu nasıl ölçerim?',
  a: 'En doğru değer, makinenizin etiketinde veya kullanım kılavuzunda yazan bıçak boyudur. Elinizde eski bir bıçak varsa üzerine bir işaret koyup düz bir zeminde bir tam tur yuvarlayarak ölçebilirsiniz. Siparişte boyu milimetre olarak girersiniz; bıçak bu ölçüde kaynaklanarak hazırlanır.',
};

export const CATEGORY_PAGES: CategoryPage[] = [
  {
    slug: 'bi-metal-serit-testere',
    handles: ['bimetal', 'bimetal-m42', 'bimetal-m51'],
    name: 'Bi-Metal',
    h1: 'Bi-Metal Şerit Testere Bıçakları',
    title: 'Bi-Metal Şerit Testere Bıçağı (M42, M51) — Özel Ölçü',
    description:
      'M42 ve M51 bi-metal şerit testere bıçakları: dolu malzeme, profil, boru ve paslanmaz çelik kesimi için. İstediğiniz boyda kaynaklı özel ölçü veya hazır boy.',
    intro: [
      'Bi-metal şerit testere bıçakları, esnek bir yay çeliği gövdeye kaynakla birleştirilmiş yüksek hız çeliği (HSS) dişlerden oluşur. Esnek gövde makinedeki sürekli bükülmeye dayanırken sert dişler kesme ağzını uzun süre korur; bu yüzden metal kesiminde en yaygın kullanılan bıçak tipidir.',
      'M42 kalitesi, kobalt alaşımlı HSS dişleriyle yapı çelikleri, profiller, borular ve genel atölye kesimleri için dengeli bir seçimdir. M51 ise daha yüksek aşınma ve ısı direnci gerektiren alaşımlı çelikler, paslanmaz çelikler ve büyük kesitli dolu malzemeler için tercih edilir.',
      'Bıçağı makinenizin boyuna göre milimetrik olarak sipariş edebilir; genişlik, kalınlık ve diş adımını (TPI) kesilecek malzemeye göre seçebilirsiniz. Standart ölçüler için stoktaki hazır boy bıçaklara da göz atabilirsiniz.',
    ],
    tipsTitle: 'Bi-metal bıçak seçerken',
    tips: [
      'Genişlik ve kalınlık, makinenizin kasnak çapına ve bıçak kılavuzlarına uygun olmalıdır; makine kılavuzundaki değeri esas alın.',
      'Kesit içinde en az üç diş bulunmalı: ince cidarlı boru ve profilde sık diş, büyük dolu malzemede seyrek diş seçin.',
      'Değişken diş adımı (ör. 4/6, 5/8 TPI) titreşimi ve gürültüyü azaltır; farklı kesitler kesen atölyeler için daha esnektir.',
      'Paslanmaz ve alaşımlı çelikleri sık kesiyorsanız M51 kalitesi, M42’ye göre daha uzun bıçak ömrü sağlar.',
    ],
    faqs: [
      {
        q: 'M42 ile M51 arasındaki fark nedir?',
        a: 'İkisi de bi-metal yapıdadır; fark diş malzemesindedir. M42, genel amaçlı metal kesimi için kobalt alaşımlı HSS dişlere sahiptir. M51 daha yüksek sertlik ve ısı direnci sunar; alaşımlı çelik, paslanmaz ve büyük kesitli malzemelerde daha uzun ömür sağlar.',
      },
      { q: 'Hangi diş adımını (TPI) seçmeliyim?', a: TPI_RULE },
      LENGTH_FAQ,
      {
        q: 'Bi-metal bıçakla paslanmaz çelik kesilir mi?',
        a: 'Evet. Paslanmaz çelikte düşük kesme hızı, yeterli soğutma sıvısı ve sabit ilerleme önemlidir. Paslanmazı sık kesiyorsanız M51 kalitesi önerilir.',
      },
    ],
  },
  {
    slug: 'm42-serit-testere',
    handles: ['bimetal-m42'],
    name: 'M42',
    h1: 'M42 Bi-Metal Şerit Testere',
    title: 'M42 Şerit Testere Bıçağı — Özel Boy ve Hazır Boy',
    description:
      'M42 bi-metal şerit testere bıçakları: yapı çeliği, profil, boru ve genel atölye kesimleri için. Milimetrik özel boy veya stoktan hazır boy seçenekleri.',
    intro: [
      'M42, bi-metal şerit testerelerin en yaygın kullanılan kalitesidir. Kobalt alaşımlı yüksek hız çeliği dişler, yay çeliği gövdeye kaynaklanır; böylece hem esnek hem de aşınmaya dayanıklı bir bıçak elde edilir.',
      'Yapı çelikleri, inşaat profilleri, borular, dolu miller ve genel imalat kesimlerinde fiyat/performans açısından dengeli bir seçimdir. Ölçünüzü girerek kaynaklı özel boy sipariş edebilir ya da standart boylardaki hazır M42 bıçaklardan seçebilirsiniz.',
    ],
    tipsTitle: 'M42 için ipuçları',
    tips: [
      'Profil ve borularda kesitteki en ince et kalınlığına göre diş seçin; bu kesimlerde 5/8 veya 6/10 TPI gibi sık dişler uygundur.',
      'Orta ve büyük çaplı dolu malzemede 3/4 veya 2/3 TPI gibi seyrek dişler talaşı daha iyi boşaltır.',
      'Yeni bıçağı ilk birkaç kesimde düşük ilerlemeyle alıştırmak (rodaj) bıçak ömrünü uzatır.',
    ],
    faqs: [{ q: 'M42 bıçak için doğru TPI nasıl seçilir?', a: TPI_RULE }, LENGTH_FAQ],
  },
  {
    slug: 'm51-serit-testere',
    handles: ['bimetal-m51'],
    name: 'M51',
    h1: 'M51 Bi-Metal Şerit Testere',
    title: 'M51 Şerit Testere Bıçağı — Zor Malzemeler İçin',
    description:
      'M51 bi-metal şerit testere bıçakları: paslanmaz, alaşımlı ve takım çelikleri ile büyük kesitli malzemeler için yüksek ısı ve aşınma direnci.',
    intro: [
      'M51 kalitesi, M42’ye göre daha yüksek sertlik ve ısı direncine sahip HSS dişler kullanır. Kesme sırasında yüksek ısı oluşturan paslanmaz çelikler, alaşımlı çelikler, takım çelikleri ve büyük kesitli dolu malzemelerde diş ağzını daha uzun süre korur.',
      'Seri üretimde ve zor malzemeleri düzenli kesen işletmelerde bıçak değiştirme sıklığını azaltarak duruş sürelerini düşürmeye yardımcı olur.',
    ],
    tipsTitle: 'M51 için ipuçları',
    tips: [
      'Paslanmaz ve alaşımlı çeliklerde kesme hızını düşük, ilerlemeyi sabit tutun ve bol soğutma sıvısı kullanın.',
      'Büyük kesitlerde seyrek ve değişken diş adımı (ör. 1,4/2 veya 2/3 TPI) talaş boşaltımını kolaylaştırır.',
    ],
    faqs: [
      {
        q: 'M51 bıçak ne zaman tercih edilmeli?',
        a: 'Paslanmaz, alaşımlı veya takım çeliği gibi zor malzemeleri sık kesiyorsanız ya da büyük kesitli dolu malzemelerde çalışıyorsanız M51, M42’ye göre daha uzun bıçak ömrü sağlar. Genel yapı çeliği ve profil kesimi için M42 genellikle yeterlidir.',
      },
      LENGTH_FAQ,
    ],
  },
  {
    slug: 'ahsap-serit-testere',
    handles: ['wood'],
    name: 'Ahşap Kesim',
    h1: 'Ahşap Kesim Şerit Testereleri',
    title: 'Ahşap Şerit Testere Bıçağı — Marangoz ve Kereste Kesimi',
    description:
      'Ahşap kesim şerit testere bıçakları: marangozluk, mobilya, kereste biçme ve kıvrımlı kesim için. İstediğiniz boyda kaynaklı özel ölçü.',
    intro: [
      'Ahşap şerit testere bıçakları marangozluk, mobilya, kereste ve modelcilik atölyelerinde düz kesim, dilimleme ve kıvrımlı kesim için kullanılır. Karbon çeliği gövde ve sertleştirilmiş diş uçları, esnek yapı ile keskinliği bir arada sunar.',
      'Kıvrımlı kesimlerde dar bıçak, düz ve kalın dilimlemede (kereste biçme) geniş bıçak tercih edilir. Diş sayısı azaldıkça kesim hızlanır ve talaş daha iyi boşalır; diş sayısı arttıkça kesim yüzeyi daha pürüzsüz olur.',
    ],
    tipsTitle: 'Ahşap bıçağı seçerken',
    tips: [
      'Kesmek istediğiniz en dar kıvrım yarıçapı, kullanabileceğiniz en geniş bıçağı belirler; dar kıvrımlar için dar bıçak seçin.',
      'Kalın kereste biçmede seyrek diş, ince levha ve temiz yüzey isteyen işlerde sık diş kullanın.',
      'Reçineli ağaçlarda bıçağı düzenli temizlemek ısınmayı ve sapmayı azaltır.',
    ],
    faqs: [
      {
        q: 'Ahşap bıçağıyla metal kesebilir miyim?',
        a: 'Hayır. Ahşap bıçakları karbon çeliğidir ve metalde hızla körelir. Metal kesimi için bi-metal veya karbür uçlu bıçak kullanın.',
      },
      {
        q: 'Kıvrımlı kesim için hangi genişlik uygundur?',
        a: 'Bıçak daraldıkça daha küçük yarıçaplı kıvrımlar kesilebilir. Sık kıvrımlı işlerde dar bıçak, düz kesim ve dilimlemede ise makinenizin izin verdiği daha geniş bıçak daha düzgün sonuç verir.',
      },
      LENGTH_FAQ,
    ],
  },
  {
    slug: 'et-kemik-serit-testere',
    handles: ['meat-bone'],
    name: 'Et ve Kemik Kesim',
    h1: 'Et ve Kemik Kesim Şerit Testereleri',
    title: 'Et ve Kemik Şerit Testere Bıçağı — Kasap ve Gıda Sektörü',
    description:
      'Et, kemik ve dondurulmuş gıda kesimi için şerit testere bıçakları. Kasap, et entegre tesisi ve endüstriyel mutfaklar için özel boy.',
    intro: [
      'Et ve kemik şerit testere bıçakları; kasaplar, et entegre tesisleri, restoran ve otel mutfakları ile gıda üretiminde et, kemik ve dondurulmuş blokların kesiminde kullanılır.',
      'Gıda ile temas eden ekipmanda hijyen ve korozyona dayanım öne çıkar; bu nedenle paslanmaya dayanıklı alaşımlı gövdeli bıçaklar tercih edilir. Bıçağı makinenizin boyuna göre milimetrik olarak sipariş edebilirsiniz.',
    ],
    tipsTitle: 'Et-kemik bıçağı seçerken',
    tips: [
      'Bıçak genişliği ve boyu makinenizin modeline özeldir; makine etiketindeki ölçüyü esas alın.',
      'Kemikli ve donuk ette genellikle seyrek diş (yaklaşık 3–4 TPI) kullanılır.',
      'Kullanımdan sonra bıçağı temizleyip iyice kurulamak hem hijyeni hem bıçak ömrünü korur.',
    ],
    faqs: [
      {
        q: 'Et testeresi bıçağı nasıl temizlenir?',
        a: 'Kullanımdan sonra bıçağı makineden çıkarıp sıcak su ve gıdaya uygun bir deterjanla temizleyin, ardından iyice kurulayın. Bıçağı nemli bırakmamak hem hijyen hem de bıçak ömrü için önemlidir. Temizlik sırasında kesilmeye karşı koruyucu eldiven kullanın.',
      },
      LENGTH_FAQ,
    ],
  },
  {
    slug: 'sunger-tekstil-serit-testere',
    handles: ['sponge-textile'],
    name: 'Sünger ve Tekstil',
    h1: 'Sünger ve Tekstil Kesim Şerit Bıçakları',
    title: 'Sünger ve Tekstil Kesim Şerit Bıçağı — Köpük, Kumaş, Deri',
    description:
      'Sünger, köpük, kumaş, deri ve yalıtım malzemeleri için dişsiz, dalgalı ve tırtıklı ağızlı şerit bıçaklar. Makinenize uygun özel boy.',
    intro: [
      'Sünger, köpük, kumaş, deri ve yalıtım malzemeleri gibi yumuşak malzemeler dişli bıçakla kesildiğinde yırtılabilir veya lif bırakabilir. Bu malzemeler için dişsiz (bıçak ağızlı), dalgalı ya da tırtıklı ağızlı şerit bıçaklar kullanılır.',
      'Doğru ağız profili temiz, tozsuz ve ölçüsü sabit bir kesim yüzeyi sağlar; döşeme, yatak, ambalaj ve tekstil üretiminde yaygın olarak tercih edilir.',
    ],
    tipsTitle: 'Bıçak ağzı seçerken',
    tips: [
      'Yumuşak sünger ve köpükte düz veya dalgalı ağız, daha yoğun ve sert malzemelerde tırtıklı ağız tercih edilir.',
      'Bıçak ölçüsü (genişlik, kalınlık, boy) makinenizin modeline göre belirlenir.',
    ],
    faqs: [
      {
        q: 'Sünger kesiminde neden dişsiz bıçak kullanılır?',
        a: 'Dişli bıçaklar yumuşak malzemeyi yırtıp toz ve lif bırakabilir. Dişsiz, dalgalı veya tırtıklı ağızlı bıçaklar malzemeyi keserek ayırır; böylece daha temiz ve düzgün bir kesim yüzeyi elde edilir.',
      },
      LENGTH_FAQ,
    ],
  },
  {
    slug: 'karbur-uclu-serit-testere',
    handles: ['carbide-tipped'],
    name: 'Karbür Uçlu',
    h1: 'Karbür Uçlu Şerit Testereler',
    title: 'Karbür Uçlu (TCT) Şerit Testere Bıçağı — Zor Malzemeler',
    description:
      'Karbür uçlu (TCT) şerit testere bıçakları: sertleştirilmiş çelik, nikel ve titanyum alaşımları, dökme demir ve aşındırıcı malzemeler için.',
    intro: [
      'Karbür uçlu (TCT) şerit testerelerde her dişin ucuna sert metal (tungsten karbür) uç kaynatılır. Bu yapı, bi-metal bıçakların zorlandığı malzemelerde kullanılmalarını sağlar: sertleştirilmiş çelikler, nikel ve titanyum alaşımları, dökme demir, aşındırıcı kompozitler ve büyük kesitli paslanmaz parçalar.',
      'Karbür bıçaklar daha yüksek kesme hızlarına ve uzun bıçak ömrüne olanak tanır; buna karşılık titreşimsiz, sağlam ve doğru gerdirilmiş bir makine gerektirir.',
    ],
    tipsTitle: 'Karbür uçlu bıçak seçerken',
    tips: [
      'Makinenizin karbür bıçak için yeterli rijitliğe ve bıçak gerginliğine sahip olduğundan emin olun; üreticinin önerdiği bıçak ölçüsünü kullanın.',
      'Sertleştirilmiş ve aşındırıcı malzemelerde kesme parametrelerini malzeme üreticisinin önerilerine göre ayarlayın.',
    ],
    faqs: [
      {
        q: 'Karbür uçlu mu, bi-metal mi seçmeliyim?',
        a: 'Genel çelik, profil ve boru kesiminde bi-metal bıçaklar ekonomik ve yeterlidir. Sertleştirilmiş çelik, nikel/titanyum alaşımları veya aşındırıcı malzemeleri düzenli kesiyorsanız karbür uçlu bıçak daha uzun ömür ve daha yüksek kesme hızı sağlar.',
      },
      LENGTH_FAQ,
    ],
  },
];

export function getCategoryPage(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((c) => c.slug === slug);
}

/**
 * Bir ürünün kategori handle'larından en özel kategori sayfasını bulur
 * (ör. hem "bimetal" hem "bimetal-m42" ise M42 sayfası).
 */
export function categoryPageForHandles(handles: string[]): CategoryPage | undefined {
  const matches = CATEGORY_PAGES.filter((c) => c.handles.some((h) => handles.includes(h)));
  if (!matches.length) return undefined;
  return matches.sort((a, b) => a.handles.length - b.handles.length)[0];
}

export function categoryHref(page: CategoryPage): string {
  return `/kategori/${page.slug}`;
}

