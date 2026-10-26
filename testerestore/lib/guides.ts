/**
 * Teknik rehberler (/rehber/[slug]) — GEO/SEO içeriği.
 *
 * Kurallar: genel kabul görmüş, doğrulanabilir teknik bilgi; ürüne özgü
 * değerler ürün sayfalarında. TPI değerleri ürün sayfasındaki TPI
 * danışmanının kullandığı Starrett seçim tablolarıyla aynıdır
 * (app/components/BladeSpecVisualizer.tsx → VARIABLE_SOLID, CONSTANT_SOLID,
 * TUBE_TABLE); biri değişirse diğeri de güncellenmeli.
 * Süre/garanti/menşe vaadi, "en iyi/lider" gibi üstünlük iddiası ve
 * "X kat ömür" gibi çarpan YOK. Kaynakların ayrıştığı konularda (rodaj,
 * gerginlik, soğutma oranı, donuk et TPI, kasnak–kalınlık, demet TPI)
 * aralıklar tarafsız verilir ve makine/bıçak kılavuzu esas gösterilir.
 * Yalnızca kendi ürünlerimiz önerilir; üretici adları yalnızca kaynak olarak geçer.
 */

export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'formula'; text: string; note?: string }
  | { type: 'note'; text: string };

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  /** Kartlarda ve llms.txt'de kısa özet */
  summary: string;
  datePublished: string;
  dateModified: string;
  blocks: GuideBlock[];
  faqs: GuideFaq[];
  /** İlgili iç linkler (kategori / ürün / rehber) */
  related: { label: string; href: string }[];
}

const PUBLISHED = '2026-10-12';
const UPDATED = '2026-10-26';

/* Ürün ve rehber linkleri — tek yerden. */
const P_M42 = { label: 'Bi-Metal M42 Premium (ölçüye göre sipariş)', href: '/products/bimetal-premium' };
const P_M51 = { label: 'Bi-Metal M51 Endüstriyel (ölçüye göre sipariş)', href: '/products/bimetal-m51' };
const P_CARBIDE = { label: 'Karbür Uçlu şerit testere (ölçüye göre sipariş)', href: '/products/carbide-ultimate' };
const P_WOOD = { label: 'Ahşap Kesim şerit testere (ölçüye göre sipariş)', href: '/products/woodcut-classic' };
const P_MEAT = { label: 'Hijyenik Et-Kemik şerit testere (ölçüye göre sipariş)', href: '/products/hijyenik-et-kemik-pro' };
const P_FOAM = { label: 'Sünger-Tekstil kesim bıçağı (ölçüye göre sipariş)', href: '/products/sunger-tekstil-pro' };
const P_READY = { label: 'Hazır boy şerit testereler', href: '/hazir-urunler' };

const G_TPI = { label: 'TPI (diş adımı) nasıl seçilir?', href: '/rehber/serit-testere-tpi-secimi' };
const G_GRADE = { label: 'M42 mi, M51 mi, karbür mü?', href: '/rehber/m42-mi-m51-mi' };
const G_LENGTH = { label: 'Şerit testere boyu nasıl ölçülür?', href: '/rehber/serit-testere-boyu-nasil-olculur' };
const G_STEEL = { label: 'Çelik kalite eşdeğerleri ve bıçak seçimi', href: '/rehber/celik-kalite-esdegerleri-bicak-secimi' };
const G_FAULTS = { label: 'Şerit testere arızaları ve çözümleri', href: '/rehber/serit-testere-arizalari-ve-cozumleri' };
const G_BREAK = { label: 'Şerit testere neden kırılır?', href: '/rehber/serit-testere-kirilma-nedenleri' };
const G_SETUP = { label: 'Gerginlik, bant hızı ve soğutma sıvısı', href: '/rehber/serit-testere-gerginlik-hiz-sogutma' };
const G_BREAKIN = { label: 'Rodaj (alıştırma) ve bakım', href: '/rehber/serit-testere-rodaj-ve-bakim' };

export const GUIDES: Guide[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-tpi-secimi',
    title: 'Şerit Testere Diş Adımı (TPI) Nasıl Seçilir? Tablo ve Örnekler',
    h1: 'Şerit Testere Diş Adımı (TPI) Nasıl Seçilir?',
    description:
      'Şerit testerede doğru diş adımı (TPI): kesitte en az üç diş kuralı, dolu malzeme için çapa göre TPI tablosu, boru ve profilde et kalınlığına göre seçim, demet kesim.',
    summary:
      'Kesitte en az üç diş kuralı; dolu malzeme ve boru/profil için Starrett tablolarına dayanan TPI seçimi.',
    datePublished: PUBLISHED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'TPI (teeth per inch), bıçağın bir inçlik (25,4 mm) boyunda kaç diş bulunduğunu gösterir. Diş adımı, kesim hızını, yüzey kalitesini ve bıçak ömrünü doğrudan belirler: kesilen kesite göre fazla seyrek diş kırılır, fazla sık diş talaşla tıkanır.',
      },
      { type: 'h2', text: 'Temel kural: kesitte en az üç diş' },
      {
        type: 'p',
        text: 'Kesim sırasında malzemenin içinde aynı anda en az üç diş çalışmalıdır. Üçten az diş çalışırsa her diş aşırı yük alır ve kırılır. Diş sayısı arttıkça yüzey düzgünleşir; ancak aynı anda çok fazla diş çalışırsa diş boşlukları talaşla dolar, kesim yavaşlar ve bıçak ısınır. Üst sınır için kaynaklar farklı sayılar verir; pratikte talaşın diş boşluklarına sığıp sığmadığına bakın: talaş sıkışıyorsa diş fazla sıktır.',
      },
      {
        type: 'ul',
        items: [
          'İnce kesit (ince cidarlı boru, profil, sac): sık diş, yani yüksek TPI.',
          'Kalın kesit (büyük çaplı dolu mil, kütük): seyrek diş, yani düşük TPI.',
          'Yumuşak ve uzun talaşlı malzemeler (alüminyum, bakır) daha geniş diş boşluğu ister; aynı kesitte bir kademe seyrek diş seçilebilir.',
        ],
      },
      { type: 'h2', text: 'Değişken diş adımı (ör. 4/6) mı, sabit diş (ör. 6) mı?' },
      {
        type: 'p',
        text: 'Değişken diş adımlı bıçaklarda dişler arasındaki mesafe bıçak boyunca değişir; "4/6 TPI" inç başına 4 ile 6 arasında değişen diş anlamına gelir. Bu yapı titreşimi ve gürültüyü azaltır, farklı kesitleri aynı bıçakla kesmeyi kolaylaştırır. Atölyede farklı ölçüler kesiliyorsa değişken diş genellikle daha iyi sonuç verir; tek tip ve sürekli aynı kesitte sabit diş de kullanılabilir.',
      },
      { type: 'h2', text: 'Dolu malzeme için çapa göre TPI tablosu' },
      {
        type: 'p',
        text: 'Yuvarlak dolu milde çapı, kare ve dikdörtgen dolu malzemede ise bıçağın malzeme içinde temas ettiği uzunluğu (bıçak yönündeki genişliği) esas alın.',
      },
      {
        type: 'table',
        head: ['Kesit / çap (mm)', 'Önerilen değişken diş (TPI)'],
        rows: [
          ['3 – 25', '12/16'],
          ['10 – 25', '10/14'],
          ['15 – 40', '8/12'],
          ['25 – 50', '6/10'],
          ['40 – 70', '5/8'],
          ['50 – 100', '4/6'],
          ['70 – 130', '3/4'],
          ['100 – 180', '2/3'],
          ['180 – 300', '1,4/2'],
          ['220 – 400', '1,1/1,4'],
          ['400 – 550', '0,75/1,25'],
        ],
        caption:
          'Aralıklar Starrett dolu malzeme seçim tablosundan alınmıştır; ürün sayfalarımızdaki TPI danışmanı da aynı tabloyu kullanır. Aralıklar bilerek örtüşür: iki aralığın kesiştiği ölçülerde ince yüzey için sık, hızlı kesim için seyrek dişi seçin.',
      },
      {
        type: 'table',
        head: ['Kesit / çap (mm)', 'Önerilen sabit diş (TPI)'],
        rows: [
          ['3 – 10', '18'],
          ['3 – 25', '14'],
          ['10 – 40', '10'],
          ['25 – 70', '6'],
          ['50 – 90', '4'],
          ['80 – 130', '3'],
          ['130 – 180', '2'],
          ['150 – 300', '1,25'],
        ],
        caption: 'Sabit diş adımı için Starrett dolu malzeme tablosu. Tek tip kesiti sürekli kesen seri işlerde tercih edilebilir.',
      },
      { type: 'h2', text: 'Boru ve profillerde seçim: et kalınlığı belirleyicidir' },
      {
        type: 'p',
        text: 'Boru ve profillerde dış ölçüyle birlikte et (cidar) kalınlığı belirleyicidir: kesit boyunca en ince duvarda da üç diş kuralı sağlanmalıdır. Bu yüzden aynı çaptaki ince cidarlı boru, dolu mile göre çok daha sık diş ister. Aşağıdaki örnekler ürün sayfalarındaki danışmanın kullandığı Starrett boru ve profil tablosundandır; kare ve dikdörtgen profilde çap yerine bıçak yönündeki dış ölçüyü kullanın.',
      },
      {
        type: 'table',
        head: ['Et kalınlığı', 'Ø 25 mm', 'Ø 50 mm', 'Ø 100 mm', 'Ø 200 mm', 'Ø 300 mm'],
        rows: [
          ['2 mm', '18', '18', '18', '10/14', '8/11'],
          ['4 mm', '12/16', '12/16', '8/11', '6/9', '5/7'],
          ['6 mm', '12/16', '8/11', '6/9', '5/7', '4/6'],
          ['10 mm', '12/16', '5/7', '4/6', '4/6', '3/4'],
          ['15 mm', '—', '5/7', '4/6', '3/4', '3/4'],
          ['25 mm', '—', '—', '4/6', '3/4', '2/3'],
        ],
        caption:
          'Starrett boru ve profil diş seçim tablosundan örnekler (TPI). "—": bu ölçü kombinasyonu tabloda yer almaz. Ara ölçüler için ürün sayfasındaki Diş Profili ve TPI Danışmanı’nı kullanın.',
      },
      { type: 'h2', text: 'Demet (paket) halinde kesim' },
      {
        type: 'p',
        text: 'Birden fazla parçayı yan yana veya üst üste bağlayıp kesiyorsanız diş seçimi tek parçaya göre değişir; ancak kaynaklar farklı yöntemler önerir. Bazı bıçak üreticileri tek parça için bulunan diş adımının bir kademe seyreğini seçmeyi, bazıları demetteki çapları toplayıp toplam ölçüye göre seçmeyi önerir; hafif makinelerde ince cidarlı borular katlar halinde kesilirken et kalınlıklarının toplanması da önerilir. Makinenizin ve bıçak üreticinizin önerisini esas alın ve parçaları demet içinde dönmeyecek şekilde sıkıca bağlayın.',
      },
      { type: 'h2', text: 'Yanlış diş adımının belirtileri' },
      {
        type: 'table',
        head: ['Belirti', 'Olası neden', 'Ne yapmalı'],
        rows: [
          ['Dişler kırılıyor veya sökülüyor', 'Diş çok seyrek; ince kesitte üçten az diş çalışıyor', 'Daha sık (yüksek TPI) bıçak seçin'],
          ['Kesim yavaş, talaş sıkışıyor, bıçak ısınıyor', 'Diş çok sık; diş boşlukları talaşla doluyor', 'Daha seyrek (düşük TPI) bıçak seçin'],
          ['Gürültü ve titreşim', 'Sabit diş ile değişken kesitler', 'Değişken diş adımlı bıçağa geçin'],
          ['Kesim yüzeyi çok kaba', 'Diş seyrek veya ilerleme yüksek', 'Bir kademe sık diş seçin, ilerlemeyi azaltın'],
        ],
      },
    ],
    faqs: [
      {
        q: 'TPI ne demek?',
        a: 'TPI (teeth per inch), bıçağın bir inçlik (25,4 mm) boyundaki diş sayısıdır. 4/6 gibi iki sayılı gösterim, diş adımının bıçak boyunca 4 ile 6 arasında değiştiği değişken diş anlamına gelir.',
      },
      {
        q: '50 mm dolu mil için hangi TPI uygundur?',
        a: 'Starrett tablosunda 50 mm; 6/10, 5/8 ve 4/6 aralıklarının kesiştiği noktadır. Genel kullanım için 5/8 dengeli bir başlangıçtır; daha düzgün yüzey için 6/10, daha hızlı kesim ve kalın talaş için 4/6 seçilebilir.',
      },
      {
        q: 'İnce cidarlı boru için neden sık diş gerekir?',
        a: 'Kesim sırasında boru duvarı içinde en az üç diş çalışmalıdır. Duvar inceldikçe bu koşul ancak dişler sıklaştıkça sağlanır; seyrek dişte dişler duvara takılıp kırılır.',
      },
      {
        q: 'Kare veya dikdörtgen dolu malzemede hangi ölçüyü esas almalıyım?',
        a: 'Bıçağın malzeme içinde temas ettiği uzunluğu, yani bıçak yönündeki genişliği esas alın. Örneğin 40 × 80 mm lamayı 80 mm’lik kenarı bıçak yönünde olacak şekilde bağladıysanız tablonun 80 mm satırına bakın.',
      },
    ],
    related: [
      { label: 'Bi-Metal Şerit Testere Bıçakları', href: '/kategori/bi-metal-serit-testere' },
      P_M42,
      G_GRADE,
      G_STEEL,
      G_FAULTS,
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'm42-mi-m51-mi',
    title: 'M42 mi, M51 mi, Karbür mü? Şerit Testere Kalite Karşılaştırması',
    h1: 'M42 mi, M51 mi, Karbür mü? Doğru Şerit Testere Kalitesi',
    description:
      'Bi-metal M42, M51 ve karbür uçlu (TCT) şerit testereler arasındaki farklar: diş malzemesi, hangi malzemede hangisi, sertlik sınırı, makine gereksinimi ve seçim adımları.',
    summary:
      'M42, M51 ve karbür uçlu bıçakların farkları, sertlik sınırı ve hangi malzemede hangisinin seçileceği.',
    datePublished: PUBLISHED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Metal kesen şerit testerelerin büyük çoğunluğu bi-metal yapıdadır: esnek bir yay çeliği gövdeye yüksek hız çeliği (HSS) dişler kaynaklanır. M42 ve M51, bu dişlerde kullanılan HSS kalitesini gösterir. Karbür uçlu (TCT) bıçaklarda ise dişlerin ucuna sert metal (tungsten karbür) uç kaynatılır.',
      },
      { type: 'h2', text: 'Karşılaştırma tablosu' },
      {
        type: 'table',
        head: ['Özellik', 'Bi-metal M42', 'Bi-metal M51', 'Karbür uçlu (TCT)'],
        rows: [
          ['Diş', 'Kobalt alaşımlı HSS (yaklaşık %8 Co)', 'M42’ye göre daha yüksek sıcak sertlik ve aşınma direncine sahip HSS (bileşim üreticiye göre değişir)', 'Tungsten karbür uç'],
          ['Tipik kullanım', 'Yapı çeliği, profil, boru, dolu mil, genel atölye', 'Paslanmaz, alaşımlı ve takım çelikleri, büyük kesitler, seri kesim', 'Sertleştirilmiş çelik ve miller, nikel/titanyum alaşımlarında seri kesim, aşındırıcı malzemeler'],
          ['Malzeme sertliği (yaklaşık üst sınır)', '~45 HRC', '~45 HRC', 'Üretici verilerine göre sertleştirilmiş malzemede ~65 HRC'],
          ['Makine gereksinimi', 'Standart şerit testere makineleri', 'Standart şerit testere makineleri', 'Rijit, titreşimsiz ve yeterli gerginlik sağlayan makine'],
          ['Göreli bıçak maliyeti', 'Düşük', 'Orta', 'Yüksek'],
        ],
      },
      { type: 'h2', text: 'Hangisini seçmeliyim?' },
      {
        type: 'ol',
        items: [
          'Genel yapı çeliği (St37/S235, St52/S355), profil ve boru kesiyorsanız M42 ile başlayın; çoğu atölye için dengeli ve ekonomik bir seçimdir.',
          'Paslanmaz, alaşımlı veya takım çeliğini düzenli kesiyor ya da büyük kesitli dolu malzemeyle çalışıyorsanız M51 seçin; diş ağzı yüksek sıcaklıkta daha geç körelir.',
          'Malzeme yaklaşık 45 HRC’nin üzerinde sertleştirilmişse (ör. indüksiyonla sertleştirilmiş krom kaplı miller, sertleştirilmiş takım çelikleri, Hardox 500 ve üzeri aşınma plakaları) bi-metal dişler kısa sürede körelir; makineniz uygunsa karbür uçlu bıçak kullanın. Nikel ve titanyum alaşımlarını seri olarak kesiyorsanız da karbür uçlu bıçak avantaj sağlar.',
          'Dökme demir bi-metal bıçakla kesilebilir; kumlu veya sert kabuklu dökümlerde ve yoğun seri kesimde karbür uçlu bıçak daha uygun olabilir.',
          'Hangi kaliteyi seçerseniz seçin, diş adımını (TPI) kesite göre belirleyin ve yeni bıçağı rodajla alıştırın.',
        ],
      },
      { type: 'h2', text: 'Malzemenin sertliğini bilmiyorsanız' },
      {
        type: 'p',
        text: 'Bıçak seçiminde malzemenin adından çok sertliği belirleyicidir: aynı 42CrMo4 tavlı halde M42 ile rahatça kesilirken sertleştirilmiş halde karbür uçlu bıçak gerektirebilir. Parçanın sertliğini (HRC veya HB) tedarikçinizden, malzeme sertifikasından veya teknik resimden öğrenin. Yaygın çelik adlarının hangi bıçak ailesine karşılık geldiğini çelik kalite eşdeğerleri rehberimizde bulabilirsiniz.',
      },
      { type: 'h2', text: 'Ahşap, gıda ve sünger kesimi' },
      {
        type: 'p',
        text: 'Bu karşılaştırma metal kesimi içindir. Ahşapta karbon çeliği ahşap bıçakları, et ve kemikte paslanmaz gövdeli gıda bıçakları, sünger ve tekstilde dişsiz (düz), dalgalı veya tırtıklı ağızlı bıçaklar kullanılır. Metal bıçağını ahşapta veya ahşap bıçağını metalde kullanmak hem kesim kalitesini hem bıçak ömrünü düşürür.',
      },
    ],
    faqs: [
      {
        q: 'M51, M42’den daha mı iyi?',
        a: 'Daha iyi değil, farklı işe yöneliktir. M51 daha yüksek sıcak sertlik ve aşınma direnci sunar; paslanmaz, alaşımlı çelik ve büyük kesitlerde diş ağzını daha uzun süre korur. Genel yapı çeliği ve profil kesiminde ise M42 genellikle yeterli ve daha ekonomiktir.',
      },
      {
        q: 'Karbür uçlu bıçak her makinede kullanılabilir mi?',
        a: 'Hayır. Karbür uçlar darbe ve titreşime duyarlıdır; rijit, titreşimsiz ve yeterli bıçak gerginliği sağlayan bir makine gerekir. Makine üreticisinin önerdiği bıçak ölçüsünü kullanın.',
      },
      {
        q: 'Paslanmaz çelik için hangi bıçak?',
        a: 'Ara sıra paslanmaz kesiyorsanız M42 kullanılabilir; düzenli paslanmaz kesiminde M51 önerilir. Paslanmaz çelik kesim sırasında yüzeyde sertleşmeye eğilimlidir: düşük bant hızı kullanın ama ilerlemeyi dişin malzeme üzerinde sürteceği kadar azaltmayın; sabit ilerleme, bol soğutma sıvısı ve pozitif talaş açılı diş iyi sonuç verir.',
      },
      {
        q: 'Bi-metal bıçakla hangi sertliğe kadar kesilebilir?',
        a: 'Bi-metal (M42, M51) bıçaklar yaklaşık 45 HRC’ye kadar olan malzemeler için uygundur. Daha sert, sertleştirilmiş malzemelerde karbür uçlu bıçak kullanın; karbür uçlu bıçak üreticileri sertleştirilmiş malzemede yaklaşık 65 HRC’ye kadar kesim önerir.',
      },
    ],
    related: [P_M42, P_M51, P_CARBIDE, G_STEEL, G_TPI],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-boyu-nasil-olculur',
    title: 'Şerit Testere Boyu Nasıl Ölçülür? Formül ve Örnek Hesap',
    h1: 'Şerit Testere Boyu Nasıl Ölçülür?',
    description:
      'Şerit testere bıçak boyunu bulmanın yolları: makine etiketi, eski bıçağı ölçmek ve kasnak formülü (L = 2C + πD). Farklı çaplı ve üç kasnaklı makineler, genişlik ve kalınlık ölçümü.',
    summary:
      'Bıçak boyunu etiketten, eski bıçaktan veya kasnak formülüyle (L = 2C + πD) bulma; genişlik ve kalınlık ölçümü.',
    datePublished: PUBLISHED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Şerit testere bıçakları kapalı halka olarak kaynaklanır; bu yüzden boy hatası sonradan düzeltilemez. Ölçünüze göre kaynaklanan bıçaklarda cayma hakkı bulunmadığından (hazır boy ürünlerde teslimden itibaren 14 gün cayma hakkı vardır), sipariş öncesi boyu doğru belirlemek önemlidir. Aşağıdaki yöntemleri güvenilirlik sırasına göre sıraladık.',
      },
      { type: 'h2', text: '1. Makine etiketi, kullanım kılavuzu veya eski bıçağın üzerindeki yazı' },
      {
        type: 'p',
        text: 'En doğru kaynak, makinenin üzerindeki etiket veya kullanım kılavuzunda yazan bıçak ölçüsüdür. Genellikle "3660 × 27 × 0,9" gibi boy × genişlik × kalınlık (mm) şeklinde verilir; bazen sonuna kalite ve diş adımı da eklenir ("2720 × 27 × 0,9 M42 6/10" gibi). Eski bıçağın sırtında da çoğu zaman aynı bilgi basılıdır. Makinenizin marka ve modelini biliyorsanız sitedeki sohbet danışmanına yazarak kayıtlı ölçüleri sorabilirsiniz; aynı modelin farklı yıl veya donanımlarında farklı bıçak ölçüleri olabildiğinden sonucu etiketle karşılaştırın.',
      },
      { type: 'h2', text: '2. Eski bıçağı ölçmek' },
      {
        type: 'ol',
        items: [
          'Gerginliği gevşetin, bıçağı makineden çıkarın ve düz, temiz bir zemine yerleştirin. Bıçağı açarken kesilmeye dayanıklı eldiven ve koruyucu gözlük kullanın.',
          'Kaynak yerini veya dişlerin üzerindeki bir noktayı boya kalemi ya da bantla işaretleyin; aynı noktayı zemine de işaretleyin.',
          'Bıçağı işaretten başlayarak düz bir çizgi boyunca bir tam tur yuvarlayın ve işaretin zemine tekrar değdiği noktaya kadar olan mesafeyi ölçün. Ölçümü iki kez tekrarlayın.',
          'Bıçak kırıksa iki ucu uç uca getirerek düz zeminde boyunu ölçün; kırık bölgede eksik parça olmadığından emin olun.',
        ],
      },
      { type: 'h2', text: '3. Kasnak formülüyle hesaplamak' },
      {
        type: 'p',
        text: 'Etiket ve eski bıçak yoksa boy, kasnak merkezleri arasındaki mesafe ve kasnak çapından hesaplanabilir. Ölçümden önce gerdirme ayarını orta konuma getirin (bazı kaynaklar tam gerginliğe yaklaşık üçte bir pay kalacak konumu önerir); böylece bıçağı takarken ve gererken pay kalır. Kasnak çapını bıçağın üzerinde çalıştığı yüzeyden (varsa kasnak lastiği dahil) ölçün.',
      },
      {
        type: 'formula',
        text: 'L = 2 × C + π × D',
        note: 'İki eşit çaplı kasnak için. L: bıçak boyu, C: kasnak merkezleri arası mesafe, D: kasnak çapı (hepsi mm).',
      },
      {
        type: 'p',
        text: 'Örnek: merkezler arası mesafe 1.200 mm, kasnak çapı 350 mm ise L = 2 × 1.200 + 3,1416 × 350 ≈ 2.400 + 1.099,6 ≈ 3.500 mm olur.',
      },
      { type: 'h2', text: 'Farklı çaplı veya üç kasnaklı makineler' },
      {
        type: 'ul',
        items: [
          'Kasnak çapları farklıysa ortalama çapı kullanın: L ≈ π × (D1 + D2) / 2 + 2 × C. Sonuç yaklaşıktır; makine etiketiyle doğrulayın.',
          'Üç veya daha fazla eşit çaplı kasnağı olan makinelerde boy, bir kasnak çevresi ile bıçağın dolaştığı kasnak merkezleri arasındaki mesafelerin toplamıdır: L = π × D + (C1 + C2 + C3).',
        ],
      },
      {
        type: 'note',
        text: 'Hesapla bulunan boy bir başlangıç değeridir. Ölçünüze göre kaynaklanan bıçak iade edilemediğinden, mümkünse sonucu makine etiketi, kılavuz veya eski bıçakla karşılaştırın.',
      },
      { type: 'h2', text: 'Genişlik ve kalınlık nasıl ölçülür?' },
      {
        type: 'ul',
        items: [
          'Genişlik: bıçağın sırtından diş ucuna kadar ölçülür.',
          'Kalınlık: kumpas veya mikrometreyle, dişlerden ve kaynak yerinden uzakta, gövde üzerinden ölçülür.',
          'Metal kesim makinelerinde 27 × 0,9, 34 × 1,1 ve 41 × 1,3 mm gibi standart genişlik–kalınlık çiftleri yaygındır; ölçtüğünüz değer bunlardan birine çok yakınsa makine kılavuzuyla doğrulayın.',
        ],
      },
      { type: 'h2', text: 'Kasnak çapı ve bıçak kalınlığı' },
      {
        type: 'p',
        text: 'Bıçak genişliği ve kalınlığı makinenizin bıçak kılavuzlarına ve kasnak çapına uygun olmalıdır; kalın bıçaklar küçük çaplı kasnaklarda sürekli bükülmeye dayanamayıp çatlayabilir. Ahşap ve gıda makineleri için kaynaklar farklı sınırlar verir: yaygın bir pratik kural kalınlığın kasnak çapının yaklaşık binde biri olmasıdır (ör. 400 mm kasnak için yaklaşık 0,4 mm); bazı ahşap makinesi üreticilerinin tabloları ise aynı kasnakta daha kalın bıçaklara izin verir. Metal kesim makinelerinde genişlik ve kalınlık makine üreticisince belirlenir. Her durumda makine kılavuzundaki ölçünün dışına çıkmayın.',
      },
    ],
    faqs: [
      {
        q: 'Şerit testere boyu hangi birimle sipariş edilir?',
        a: 'Milimetre ile. Bıçak, girdiğiniz boyda kesilip uçları alın kaynağıyla birleştirilerek hazırlanır.',
      },
      {
        q: 'Boyu birkaç milimetre yanlış girersem ne olur?',
        a: 'Makinenin gerdirme payı küçük farkları tolere edebilir, ancak pay aşılırsa bıçak takılamaz veya yeterince gerilemez. Özel ölçüde üretilen bıçaklar iade edilemediği için ölçüyü etiket veya eski bıçaktan doğrulayın.',
      },
      {
        q: 'Eski bıçağım ve makine etiketim yok, ne yapmalıyım?',
        a: 'Kasnak merkezleri arasındaki mesafeyi (gerdirme orta konumdayken) ve kasnak çapını ölçüp L = 2 × C + π × D formülüyle hesaplayın. Makinenin marka ve modelini sohbet danışmanına veya iletişim sayfasından bize iletirseniz kayıtlı ölçülerle karşılaştırmanıza yardımcı oluruz.',
      },
    ],
    related: [P_READY, G_TPI, G_GRADE, { label: 'Sık sorulan sorular', href: '/sss' }],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'celik-kalite-esdegerleri-bicak-secimi',
    title: 'Çelik Kalite Eşdeğerleri Tablosu ve Malzemeye Göre Şerit Testere Seçimi',
    h1: 'Çelik Kalite Eşdeğerleri ve Malzemeye Göre Bıçak Seçimi',
    description:
      'St37 (S235JR), St52 (S355), Ck45 (C45), 4140 (42CrMo4), 304, 316, 1.2379 (D2), Hardox, alüminyum, dökme demir, pirinç ve titanyum için eşdeğer adlar ve uygun şerit testere.',
    summary:
      'Atölyede kullanılan çelik ve metal adlarının EN/AISI karşılıkları ve her malzeme için uygun bıçak ailesi (M42, M51, karbür).',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Atölyede malzemeler çoğu zaman eski DIN adlarıyla (St37, St52, Ck45) anılır; teknik resimlerde ve ithal malzemede ise EN adı, Werkstoff numarası veya AISI adı kullanılır. Aşağıdaki tablolar bu adları eşleştirir ve her malzeme grubu için ürünlerimizden hangi bıçak ailesinin uygun olduğunu gösterir. Diş adımını (TPI) ise malzemeden bağımsız olarak kesitin ölçüsüne göre seçersiniz.',
      },
      {
        type: 'note',
        text: 'Eşdeğerler yaklaşıktır: farklı standartlardaki kaliteler kimyasal bileşim ve mekanik değerlerde birebir aynı değildir. Örneğin St52-3 bazı tablolarda S355JR, bazılarında S355J2 (1.0577) ile eşleştirilir; 1.2379 ile Japon SKD11 arasında vanadyum oranı farklıdır. Kritik işlerde malzeme sertifikasını esas alın.',
      },
      { type: 'h2', text: 'Yapı, karbon ve alaşımlı çelikler' },
      {
        type: 'table',
        head: ['Atölyede söylenen', 'EN / Werkstoff No', 'AISI / ASTM (yaklaşık)', 'Önerilen bıçak'],
        rows: [
          ['St37, St37-2', 'S235JR, 1.0038', 'A36', 'Bi-Metal M42'],
          ['St52, St52-3', 'S355JR veya S355J2 (1.0577)', 'A572 Gr.50', 'Bi-Metal M42'],
          ['Ck45, C45', 'C45E 1.1191 (C45: 1.0503)', '1045', 'Bi-Metal M42; büyük kesit ve seri kesimde M51'],
          ['42CrMo4, "4140"', '42CrMo4, 1.7225', '4140', 'Tavlı veya ıslah halinde M42, büyük kesitte M51; sertleştirilmiş halde karbür uçlu'],
          ['Rulman çeliği', '100Cr6, 1.3505', '52100', 'Tavlı halde M42 veya M51; sertleştirilmiş halde karbür uçlu'],
        ],
        caption: 'S235 tipik olarak yaklaşık 100–155 HB, S355 yaklaşık 150–210 HB sertliktedir (tedarikçi verisi).',
      },
      { type: 'h2', text: 'Paslanmaz çelikler' },
      {
        type: 'table',
        head: ['Atölyede söylenen', 'EN / Werkstoff No', 'AISI / UNS (yaklaşık)', 'Önerilen bıçak'],
        rows: [
          ['304, "18/8"', 'X5CrNi18-10, 1.4301', '304', 'Bi-Metal M51 (ara sıra kesimde M42)'],
          ['316, 316L, 316Ti', '1.4401, 1.4404, 1.4571', '316, 316L, 316Ti', 'Bi-Metal M51'],
          ['321', '1.4541', '321', 'Bi-Metal M51'],
          ['Dubleks', '1.4462', 'UNS S31803', 'Bi-Metal M51; seri kesimde karbür uçlu'],
          ['17-4PH', '1.4542', '17-4PH (630)', 'Bi-Metal M51; sertleştirilmiş halde karbür uçlu'],
        ],
      },
      {
        type: 'p',
        text: 'Paslanmaz çelik kesim sırasında yüzeyde sertleşmeye eğilimlidir. Düşük bant hızı, sabit ve yeterli ilerleme (dişin malzeme üzerinde sürtmesine izin vermeyin), bol soğutma ve pozitif talaş açılı diş en önemli kurallardır.',
      },
      { type: 'h2', text: 'Takım çelikleri' },
      {
        type: 'table',
        head: ['Atölyede söylenen', 'EN adı', 'AISI (yaklaşık)', 'Önerilen bıçak'],
        rows: [
          ['1.2379 (soğuk iş)', 'X153CrMoV12', 'D2', 'Tavlı halde Bi-Metal M51; sertleştirilmiş halde karbür uçlu'],
          ['1.2344 (sıcak iş)', 'X40CrMoV5-1', 'H13', 'Tavlı halde Bi-Metal M51; sertleştirilmiş halde karbür uçlu'],
          ['1.2510', '100MnCrW4', 'O1', 'Tavlı halde Bi-Metal M51; sertleştirilmiş halde karbür uçlu'],
          ['1.3343 (HSS)', 'HS6-5-2', 'M2', 'Tavlı halde Bi-Metal M51; sertleştirilmiş halde karbür uçlu'],
        ],
        caption: 'Takım çelikleri genellikle tavlı (yumuşatılmış) halde satılır; ısıl işlem görmüş parçada sertliği mutlaka öğrenin.',
      },
      { type: 'h2', text: 'Aşınma plakaları ve sertleştirilmiş parçalar: sertlik belirleyicidir' },
      {
        type: 'p',
        text: 'Bi-metal bıçaklar yaklaşık 45 HRC’ye kadar olan malzemeler için uygundur. Bunun üzerindeki sertliklerde diş ağzı kısa sürede körelir; karbür uçlu bıçak üreticileri sertleştirilmiş malzemede yaklaşık 65 HRC’ye kadar kesim önerir.',
      },
      {
        type: 'table',
        head: ['Malzeme', 'Nominal sertlik', 'Yaklaşık HRC', 'Önerilen bıçak'],
        rows: [
          ['Hardox 400', '370–430 HBW', '≈ 40–46', 'Sınır bölgesi: düzenli kesimde karbür uçlu; ara sıra kısa kesimde düşük hızla M51 denenebilir, diş aşınması hızlı olur'],
          ['Hardox 450', '390–475 HBW', '≈ 42–50', 'Karbür uçlu önerilir'],
          ['Hardox 500', '450–540 HBW', '≈ 47–54', 'Karbür uçlu'],
          ['Hardox 550 / 600', '525–575 / 550–640 HBW', '≈ 53–56 / 55–59', 'Karbür uçlu (makine ve bıçak sınırlarını kontrol edin)'],
          ['İndüksiyonla sertleştirilmiş krom kaplı mil (piston mili)', 'Yüzey sertleştirilmiş', 'Üreticisinden öğrenin', 'Karbür uçlu'],
        ],
        caption:
          'Nominal sertlikler SSAB Hardox ürün verilerinden alınmıştır; HRC karşılıkları standart dönüşüm tablolarına göre yaklaşık değerlerdir.',
      },
      { type: 'h2', text: 'Demir dışı metaller, dökme demir ve özel alaşımlar' },
      {
        type: 'table',
        head: ['Malzeme', 'Yaygın adlar', 'Önerilen bıçak', 'Dikkat edilecekler'],
        rows: [
          ['Alüminyum', '6061 (EN AW-6061), 7075 (EN AW-7075)', 'Bi-Metal M42', 'Uzun ve yapışkan talaş: geniş diş boşluğu (bir kademe seyrek diş), pozitif talaş açısı ve yağlama; talaş kaynağına dikkat'],
          ['Pirinç ve bronz', 'Ms58 ve benzeri kurşunlu pirinçler, alüminyum bronzu', 'Bi-Metal M42', 'Pirinç kısa talaş verir ve yüksek hızda kesilir; bronzlarda hızı düşürün'],
          ['Bakır', 'Elektrolitik bakır', 'Bi-Metal M42', 'Yumuşak ve yapışkan: seyrek diş ve bol yağlama'],
          ['Dökme demir', 'Gri döküm (EN-GJL), sfero döküm (EN-GJS)', 'Bi-Metal M42; kumlu, sert kabuklu veya seri kesimde karbür uçlu', 'Döküm kabuğu ve kum kalıntısı dişleri aşındırır'],
          ['Titanyum', 'Grade 2 (saf), Grade 5 (Ti-6Al-4V)', 'Bi-Metal M51; seri kesimde karbür uçlu', 'Düşük hız, sabit ilerleme, bol soğutma'],
          ['Nikel alaşımları', 'Inconel 600/625/718, Monel, Hastelloy', 'Bi-Metal M51; seri kesimde karbür uçlu', 'Çok düşük hız; ısı birikmesine dikkat'],
        ],
      },
      { type: 'h2', text: 'Seçim adımları' },
      {
        type: 'ol',
        items: [
          'Malzemenin adını ve durumunu (tavlı, ıslah, sertleştirilmiş) öğrenin; sertleştirilmiş parçalarda sertlik değerini (HB veya HRC) sorun.',
          'Bıçak ailesini seçin: genel çelikler için Bi-Metal M42; paslanmaz, takım çeliği ve büyük kesit için Bi-Metal M51; yaklaşık 45 HRC üzeri ve aşındırıcı malzeme için karbür uçlu.',
          'Diş adımını kesitin ölçüsüne göre TPI rehberimizden veya ürün sayfasındaki TPI danışmanından belirleyin.',
          'Bant hızını malzeme grubuna göre ayarlayın ve yeni bıçağı alıştırın (rodaj).',
        ],
      },
    ],
    faqs: [
      {
        q: 'St37 ve St52 için hangi şerit testere bıçağı kullanılır?',
        a: 'St37 (S235JR) ve St52 (S355) alaşımsız yapı çelikleridir; Bi-Metal M42 bu malzemeler için uygundur. Diş adımını malzemenin kesitine (dolu malzemede çap, boru ve profilde et kalınlığı) göre seçin.',
      },
      {
        q: 'Hardox kesmek için hangi bıçak gerekir?',
        a: 'Hardox 500 yaklaşık 47–54 HRC sertliktedir, daha yüksek sınıflar daha serttir; bu malzemeler karbür uçlu bıçak gerektirir. Hardox 400 ve 450 bi-metal bıçakların yaklaşık 45 HRC sınırına yakın veya üzerindedir; düzenli kesimde karbür uçlu bıçak önerilir. Karbür uçlu bıçak rijit ve yeterli gerginlik sağlayan bir makine ister.',
      },
      {
        q: 'Ck45 ile C45 aynı malzeme mi?',
        a: 'Yakın karşılıklardır. Ck45 eski DIN adıdır ve bugünkü C45E (1.1191) kalitesine karşılık gelir; C45 (1.0503) ile kimyasal sınırlarda küçük farklar vardır. Şerit testere seçimi açısından ikisi aynı gruptadır: Bi-Metal M42 uygundur.',
      },
      {
        q: '42CrMo4 hangi bıçakla kesilir?',
        a: 'Tavlı veya ıslah edilmiş 42CrMo4 Bi-Metal M42 ile kesilir; büyük kesitlerde ve seri kesimde M51 daha uygundur. Parça yaklaşık 45 HRC’nin üzerinde sertleştirilmişse karbür uçlu bıçak kullanın.',
      },
    ],
    related: [P_M42, P_M51, P_CARBIDE, G_GRADE, G_TPI, G_SETUP],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-arizalari-ve-cozumleri',
    title: 'Şerit Testere Arızaları ve Çözümleri: 18 Belirti, Neden ve Yapılacaklar',
    h1: 'Şerit Testere Arızaları ve Çözümleri',
    description:
      'Şerit testerede kopma, kaynak yerinden kırılma, diş dökülmesi, erken körelme, eğri ve dalgalı kesim, titreşim, talaş sıkışması, mavi talaş ve tek taraflı aşınmanın nedenleri ve çözümleri.',
    summary: '18 yaygın belirti için en olası nedenden başlayan kontrol listesi ve çözüm önerileri.',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Şerit testerede görülen sorunların çoğu bıçağın kendisinden değil; gerginlik, kılavuz ayarı, ilerleme, diş adımı ve soğutma gibi kullanım koşullarından kaynaklanır. Aynı belirtinin birden fazla nedeni olabilir. Aşağıdaki tabloda her belirtinin olası nedenlerini, en sık görülen ve kontrolü en kolay olandan başlayarak sıraladık.',
      },
      { type: 'h2', text: 'Önce bu beş noktayı kontrol edin' },
      {
        type: 'ol',
        items: [
          'Diş yönü: dişler kesme yönüne, yani parçaya doğru bakıyor mu?',
          'Gerginlik: makine veya bıçak üreticisinin önerdiği değerde mi?',
          'Kılavuzlar: kılavuz kolları parçaya olabildiğince yakın mı, kılavuz rulmanları ve plakaları aşınmamış mı?',
          'Diş adımı: kesitte en az üç diş çalışıyor mu, talaş diş boşluklarına sığıyor mu?',
          'Soğutma ve talaş fırçası: sıvı doğru oranda ve kesim noktasına geliyor mu, fırça diş boşluklarını temizliyor mu?',
        ],
      },
      { type: 'h2', text: 'Belirti, olası nedenler ve yapılacaklar' },
      {
        type: 'table',
        head: ['Belirti', 'Olası nedenler (en olasıdan başlayarak)', 'Ne yapmalı?'],
        rows: [
          [
            'Bıçak gövdeden kopuyor veya çatlıyor',
            '1) Aşırı gerginlik 2) Kasnak çapına göre fazla kalın bıçak 3) Bıçak sırtının kasnak flanşına sürtmesi veya arka kılavuzun fazla bastırması 4) Aşınmış kasnak ya da kılavuz 5) Yüksek ilerleme',
            'Gerginliği üretici değerine getirin; makine kılavuzundaki kalınlığı kullanın; kasnak eğimini ve arka kılavuzu ayarlayın; aşınmış parçaları değiştirin; ilerlemeyi azaltın.',
          ],
          [
            'Kaynak yerinden kopma',
            '1) Gövdeyi kıran nedenlerin aynısı: aşırı gerginlik, küçük kasnak, kılavuz sorunları 2) Kaynak veya tavlama kusuru',
            'Bıçağın ve kırık yüzeyinin fotoğraflarıyla bize ulaşın; gerginliği, kasnakları ve kılavuzları da kontrol edin. Ayıplı ürün söz konusuysa yasal haklarınız çerçevesinde değerlendirilir.',
          ],
          [
            'Çatlaklar diş diplerinden başlıyor',
            '1) Körelmiş bıçakla çalışmaya devam etmek 2) Aşırı gerginlik 3) Kılavuz kollarının fazla açık olması 4) Yan kılavuzların sıkı olması',
            'Körelen bıçağı zamanında değiştirin; gerginliği kontrol edin; kılavuz kollarını parçaya yaklaştırın; yan kılavuz boşluğunu ayarlayın.',
          ],
          [
            'Dişler kırılıyor veya sıyrılıyor (diş dökülmesi)',
            '1) Diş çok seyrek, kesitte üçten az diş 2) Rodaj yapılmamış 3) Parça mengenede oynuyor 4) İlerleme çok yüksek 5) Talaş diş boşluğunda sıkışıyor 6) Malzemede sert nokta veya tufal 7) Yeni bıçak eski kesiğe sokulmuş',
            'Daha sık diş seçin; yeni bıçağı alıştırın; parçayı sıkıca bağlayın; ilerlemeyi azaltın; talaş fırçasını ve soğutmayı kontrol edin; yeni bıçakla her zaman yeni bir kesime başlayın.',
          ],
          [
            'Dişler erken köreliyor',
            '1) Rodaj yapılmamış 2) Bıçak ters takılmış 3) Bant hızı çok yüksek 4) İlerleme çok düşük: diş kesmek yerine sürtüyor (paslanmazda yüzey sertleşmesine yol açar) 5) Soğutma yetersiz veya oran yanlış 6) Sert yüzey, tufal veya alevle kesilmiş kenar 7) Malzemeye göre yanlış kalite',
            'Diş yönünü kontrol edin; hızı malzemeye göre düşürün; ilerlemeyi talaş oluşacak düzeye getirin; soğutma oranını ölçün; zor malzemede M51, sertleştirilmiş malzemede karbür uçlu bıçağa geçin.',
          ],
          [
            'Kesim eğri gidiyor veya yana kaçıyor',
            '1) İlerleme çok yüksek 2) Gerginlik düşük 3) Kılavuz kolları parçadan uzak, kılavuzlar gevşek veya aşınmış 4) Diş çaprazı bir tarafta hasarlı veya körelmiş 5) Yanlış diş adımı',
            'İlerlemeyi azaltın; gerginliği üretici değerine getirin; kılavuzları ayarlayın; körelmiş veya hasarlı bıçağı değiştirin.',
          ],
          [
            'Dalgalı (çamaşır tahtası gibi) kesim yüzeyi',
            '1) Bıçak kör veya hasarlı 2) İlerleme veya bant hızı uygun değil 3) Gerginlik düşük 4) Kılavuz kolları uzakta 5) Yanlış diş adımı veya bıçak türü',
            'Bıçağı değiştirin; hız ve ilerlemeyi birlikte ayarlayın; gerginliği ve kılavuzları kontrol edin; diş adımını kesite göre yeniden seçin.',
          ],
          [
            'Titreşim ve yüksek ses (ötme, çınlama)',
            '1) Parça sağlam bağlanmamış 2) Sabit diş adımıyla profil veya boru gibi değişken kesitler kesiliyor 3) Hız ve ilerleme uyumsuz 4) Kılavuz kolları uzakta 5) Gerginlik düşük 6) Bıçak körelmiş',
            'Parçayı sıkıca bağlayın; değişken diş adımlı bıçak kullanın; hızı veya ilerlemeyi değiştirerek titreşimin kaybolduğu noktayı bulun; kılavuzları yaklaştırın.',
          ],
          [
            'Talaş diş boşluklarında sıkışıyor',
            '1) Diş kesite göre çok sık 2) Talaş fırçası çalışmıyor veya aşınmış 3) İlerleme çok yüksek 4) Soğutma yetersiz',
            'Daha seyrek diş seçin; talaş fırçasını diş dibine yakın çalışacak şekilde ayarlayın veya değiştirin; ilerlemeyi azaltın; soğutma debisini artırın.',
          ],
          [
            'Talaş diş uçlarına kaynıyor (talaş kaynağı)',
            '1) Soğutma yetersiz veya oran düşük 2) Talaş fırçası çalışmıyor 3) Bant hızı veya ilerleme yüksek 4) Alüminyum gibi yumuşak malzemede uygun olmayan diş geometrisi',
            'Soğutma oranını ve akışını kontrol edin; talaş fırçasını ayarlayın; hızı ve ilerlemeyi düşürün; yumuşak malzemelerde pozitif talaş açılı, geniş boşluklu diş kullanın.',
          ],
          [
            'Mavi veya yanık renkli talaş, diş uçlarında renk değişimi',
            '1) İlerleme veya bant hızı yüksek 2) Soğutma yetersiz 3) Bıçak ters takılmış',
            'Önce ilerlemeyi, gerekirse hızı azaltın; soğutmayı ve diş yönünü kontrol edin. Talaş rengini okumayı gerginlik ve soğutma rehberimizde anlattık.',
          ],
          [
            'Bıçak sırtında aşınma, ezilme veya çapak',
            '1) İlerleme çok yüksek 2) Arka kılavuz (baskı rulmanı) fazla bastırıyor veya aşınmış 3) Bıçak sırtı kasnak flanşına sürtüyor 4) Gerginlik düşük',
            'İlerlemeyi azaltın; arka kılavuzu ayarlayın veya değiştirin; kasnak eğimini sırt flanşa değmeyecek şekilde ayarlayın; gerginliği kontrol edin.',
          ],
          [
            'Dişler tek tarafta aşınıyor',
            '1) Yan kılavuzlardan biri gevşek veya diş çaprazına baskı yapıyor 2) Kasnak flanşı aşınmış veya bıçak izden çıkmış 3) Bıçak tablaya dik değil 4) Kirli veya düzensiz parça yüzeyi',
            'Yan kılavuzları ayarlayın; kasnak hizasını ve aşınmasını kontrol edin; bıçağın tablaya dikliğini kontrol edin.',
          ],
          [
            'Bıçak gövdesinin iki yanında çizik veya aşınma',
            '1) Yan kılavuzlar fazla sıkı veya hasarlı 2) Kılavuzların arasına talaş dolmuş 3) Kılavuz kolları en geniş açıklıkta 4) Soğutma kılavuzlara ulaşmıyor',
            'Yan kılavuz boşluğunu ayarlayın, hasarlı kılavuzu değiştirin; kılavuzları talaştan temizleyin; kılavuz kollarını parçaya yaklaştırın.',
          ],
          [
            'Bıçak burulmuş veya açılı (eğik) kırılıyor',
            '1) Kılavuzlar hizasız veya fazla sıkı 2) Kılavuz kolları çok açık 3) Aşırı gerginlik 4) Parça mengenede oynuyor 5) Dikey makinede dar kıvrım için fazla geniş bıçak',
            'Kılavuz hizasını ve boşluğunu ayarlayın; kılavuz kollarını parçaya yaklaştırın; gerginliği kontrol edin; parçayı sıkıca bağlayın; kıvrımlı kesimde daha dar bıçak kullanın.',
          ],
          [
            'Kesim ölçü veya gönye tutmuyor',
            '1) Kılavuz kolları parçadan uzak 2) Bıçak aşınmış 3) İlerleme çok yüksek veya çok düşük 4) Kılavuzlar gevşek 5) Yanlış diş adımı 6) Mengene veya tezgâh gönyesi bozuk',
            'Kılavuzları yaklaştırıp sıkın; bıçağı değiştirin; ilerlemeyi ayarlayın; mengene ve tezgâh gönyesini kontrol edin.',
          ],
          [
            'Kesim çok yavaş veya bıçak kesmiyor',
            '1) Bıçak ters takılmış 2) Dişler körelmiş 3) Diş kesite göre çok sık 4) İlerleme çok düşük 5) Malzeme bıçak türüne göre fazla sert',
            'Diş yönünü kontrol edin; bıçağı değiştirin; daha seyrek diş seçin; ilerlemeyi talaş oluşacak düzeye çıkarın; sertleştirilmiş malzemede karbür uçlu bıçak kullanın.',
          ],
          [
            'Bıçak kasnaktan çıkıyor veya izde durmuyor',
            '1) Gerginlik düşük 2) Kasnak eğim (iz) ayarı yanlış 3) Kasnak yüzeyi veya lastiği aşınmış 4) Kılavuzlar hizasız',
            'Gerginliği kontrol edin; kasnak eğimini makine kılavuzuna göre ayarlayın (dişler kasnağa basmamalı, sırt flanşa sürtmemeli); aşınmış lastik veya kasnağı değiştirin.',
          ],
        ],
        caption:
          'Tablo, bıçak üreticilerinin (LENOX, RÖNTGEN, WIKUS, Starrett) arıza kılavuzlarında yer alan genel kabul görmüş tespitlerin kendi ifadelerimizle özetidir. Sıralama genel bir yol göstericidir; makinenize özgü ayarlar için makine kılavuzunu esas alın.',
      },
      { type: 'h2', text: 'Bıçağı ne zaman değiştirmelisiniz?' },
      {
        type: 'ul',
        items: [
          'Kesim yüzeyi istediğiniz kaliteyi artık sağlamıyor veya kesim belirgin şekilde yavaşladıysa.',
          'Dişlerde kırılma, sıyrılma veya belirgin körelme görüyorsanız.',
          'Gövdede, sırtta veya diş diplerinde çatlak varsa: çatlak bıçakla kesime devam etmeyin.',
          'Ayarlar doğru olduğu hâlde kesim eğri veya dalgalı gidiyorsa.',
        ],
      },
      { type: 'h2', text: 'Güvenlik' },
      {
        type: 'note',
        text: 'Kılavuz, gerginlik veya kasnak ayarı yapmadan, talaş temizlemeden ve bıçağı incelemeden önce makineyi durdurun ve enerjisini kesin. Kapaklar açıkken makineyi çalıştırmayın. Bıçakla çalışırken kesilmeye dayanıklı eldiven ve koruyucu gözlük kullanın. Çatlak görülen bıçakla kesime devam etmeyin; kopan bıçak savrularak yaralanmaya yol açabilir.',
      },
      {
        type: 'p',
        text: 'Sorunu çözemediyseniz makinenizin marka ve modelini, bıçak ölçüsünü, kestiğiniz malzeme ve kesiti, bıçağın ve talaşın fotoğraflarını iletişim sayfamızdan bize iletin.',
      },
    ],
    faqs: [
      {
        q: 'Şerit testere neden sürekli kırılıyor?',
        a: 'Sık kırılmanın en yaygın nedenleri aşırı gerginlik, kasnak çapına göre fazla kalın bıçak, kılavuz kollarının parçadan uzak olması ve yüksek ilerlemedir. Kırığın nereden başladığına bakın: sırttan başlayan kırık arka kılavuz veya kasnak sorununu, diş dibinden başlayan kırık gerginlik veya körelmiş bıçakla çalışmayı, açılı kırık ise burulmayı gösterir.',
      },
      {
        q: 'Şerit testere neden dişlerini döker?',
        a: 'En sık nedenler kesite göre fazla seyrek diş (kesitte üçten az diş), rodaj yapılmaması, parçanın mengenede oynaması, yüksek ilerleme ve diş boşluğunda sıkışan talaştır. Daha sık diş seçin, parçayı sıkıca bağlayın ve yeni bıçağı alıştırın.',
      },
      {
        q: 'Bıçak neden çabuk köreliyor?',
        a: 'Rodaj yapılmaması, bıçağın ters takılması, yüksek bant hızı, dişin sürtmesine yol açan çok düşük ilerleme, yetersiz soğutma ve malzemeye uygun olmayan bıçak kalitesi en sık nedenlerdir. Talaş rengine bakarak hız ve ilerlemeyi ayarlayın; zor malzemede M51 veya karbür uçlu bıçak kullanın.',
      },
    ],
    related: [G_BREAK, G_SETUP, G_BREAKIN, G_TPI, G_GRADE],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-kirilma-nedenleri',
    title: 'Şerit Testere Neden Kırılır veya Çabuk Körelir? Nedenler ve Çözümler',
    h1: 'Şerit Testere Neden Kırılır veya Çabuk Körelir?',
    description:
      'Şerit testere bıçağının kırılma, kaynak yerinden kopma, diş dökülmesi ve çabuk körelme nedenleri: kırığın başladığı yere göre teşhis, gerginlik, TPI, kılavuz, rodaj, hız ve soğutma.',
    summary:
      'Kırılma, kaynak yerinden kopma, diş dökülmesi ve çabuk körelmenin nedenleri; kırığın başladığı yere göre teşhis.',
    datePublished: PUBLISHED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Bir şerit testere bıçağının erken bozulmasının nedeni çoğu zaman bıçağın kendisi değil, makine ayarları ve kullanım koşullarıdır. Bu rehber kırılma ve körelmeye odaklanır; eğri kesim, titreşim ve talaş sorunları dahil tüm belirtiler için arızalar ve çözümleri rehberimize bakın.',
      },
      { type: 'h2', text: 'Kırık yüzeyi ne söylüyor?' },
      {
        type: 'p',
        text: 'Kopan bıçakta kırık yüzeyine yakından bakın: çatlağın başladığı nokta genellikle düz ve pürüzsüz bir bölge olarak görünür, kırığın geri kalanı daha pürüzlüdür. Başlangıç noktası nedeni büyük ölçüde gösterir.',
      },
      {
        type: 'table',
        head: ['Kırığın başladığı yer', 'Olası nedenler', 'Kontrol edin'],
        rows: [
          ['Bıçak sırtı', 'Arka (baskı) kılavuzunun bıçağı fazla bastırması, sırtın kasnak flanşına sürtmesi, taşıma sırasında sırtta oluşmuş çentik, yüksek ilerleme', 'Arka kılavuz ayarını ve kasnak eğimini kontrol edin; ilerlemeyi azaltın; bıçağı taşırken sırtı darbeden koruyun'],
          ['Diş dibi', 'Aşırı gerginlik, kılavuz kollarının fazla açık olması, yan kılavuzların sıkı olması, körelmiş bıçakla çalışmaya devam etmek', 'Gerginliği üretici değerine getirin; kılavuz kollarını parçaya yaklaştırın; körelen bıçağı zamanında değiştirin'],
          ['Açılı (eğik) kırık', 'Burulma zorlanması: kılavuz kolları çok açık, kılavuz hizası bozuk, dar kıvrımda geniş bıçak', 'Kılavuz kollarını parça ölçüsüne göre ayarlayın; kılavuz hizasını kontrol edin'],
          ['Kaynak bölgesi (taşlama izli bölge)', 'Kaynak veya tavlama kusuru; ayrıca gövdeyi kıran tüm nedenler (aşırı gerginlik, küçük kasnak, kılavuz sorunları) kaynaktan da koparabilir', 'Bıçağın ve kırık yüzeyinin fotoğraflarıyla bize ulaşın; makine tarafını da kontrol edin'],
        ],
        caption: 'Teşhis, bıçak üreticilerinin arıza kılavuzlarındaki genel kabul görmüş tespitlere dayanır.',
      },
      { type: 'h2', text: 'Belirti, neden ve çözüm' },
      {
        type: 'table',
        head: ['Belirti', 'Olası neden', 'Çözüm'],
        rows: [
          ['Bıçak gövdeden çatlıyor veya kırılıyor', 'Aşırı gerginlik, kasnak çapına göre fazla kalın bıçak, aşınmış kasnak veya kılavuz, yüksek ilerleme', 'Gerginliği üretici değerine ayarlayın; makineye uygun kalınlık kullanın; kasnak ve kılavuzları kontrol edin; ilerlemeyi azaltın'],
          ['Dişler kırılıyor veya dökülüyor', 'Diş çok seyrek (ince kesitte üçten az diş); parça sağlam bağlanmamış; rodaj yapılmamış; ilerleme yüksek; talaş diş boşluğunda sıkışıyor', 'Daha sık diş seçin; parçayı sıkıca bağlayın; yeni bıçağı alıştırın; ilerlemeyi azaltın; talaş fırçasını kontrol edin'],
          ['Bıçak çabuk köreliyor', 'Rodaj yapılmamış; kesme hızı yüksek; ilerleme çok düşük (diş kesmek yerine sürtüyor); soğutma yetersiz; malzemeye göre yanlış kalite; bıçak ters takılmış', 'Rodaj yapın; hızı malzemeye göre düşürün; ilerlemeyi talaş oluşacak düzeye getirin; soğutmayı kontrol edin; zor malzemede M51 veya karbür kullanın'],
          ['Kesim eğri gidiyor', 'İlerleme çok yüksek; gerginlik düşük; kılavuzlar açık veya aşınmış; dişler bir tarafta körelmiş veya hasarlı', 'İlerlemeyi azaltın; gerginliği kontrol edin; kılavuzları ayarlayın; körelmiş bıçağı değiştirin'],
          ['Talaş dişlere yapışıyor', 'Diş çok sık, talaş fırçası çalışmıyor, soğutma yetersiz', 'Daha seyrek diş seçin; talaş fırçasını temizleyin veya değiştirin; soğutmayı artırın'],
          ['Kaynak yerinden kopma', 'Kaynak veya tavlama kusuru ya da gövdeyi zorlayan nedenler (aşırı gerginlik, küçük kasnak, kılavuz sorunları)', 'Fotoğraflarla bize ulaşın; ayıplı ürün söz konusuysa yasal haklarınız çerçevesinde değerlendirilir'],
        ],
      },
      { type: 'h2', text: 'En sık yapılan beş hata' },
      {
        type: 'ol',
        items: [
          'Yeni bıçağı rodaj yapmadan tam ilerlemeyle kullanmak: keskin diş uçlarında mikro çatlaklar oluşur, dişler kırılır veya çabuk körelir.',
          'Bıçağı kullanılmadığında gergin bırakmak: gövde gereksiz yere yorulur.',
          'Diş yönünü ters takmak: dişler kesme yönünün tersine bakarsa bıçak kesmez ve hızla bozulur.',
          'Kılavuzları parça ölçüsüne göre ayarlamamak: kılavuz kolları parçadan uzakta kalırsa bıçak yanal yük alır, eğri keser ve çatlar.',
          'Malzemeye uygun olmayan diş adımı kullanmak: seyrek dişte kırılma, sık dişte tıkanma ve ısınma olur.',
        ],
      },
      {
        type: 'note',
        text: 'Güvenlik: kopan bir bıçak savrularak yaralanmaya yol açabilir. Kırık bıçağı çıkarırken makineyi durdurup enerjisini kesin; kesilmeye dayanıklı eldiven ve koruyucu gözlük kullanın.',
      },
    ],
    faqs: [
      {
        q: 'Şerit testere neden kaynak yerinden kırılır?',
        a: 'Kaynak yerinden kopmanın iki ana nedeni vardır: kaynak veya kaynak sonrası tavlama kusuru ya da gövdeyi de kırabilecek zorlanmalar (aşırı gerginlik, kasnak çapına göre kalın bıçak, kılavuz sorunları). Kaynak bölgesi, kırığa yakın taşlama izlerinden tanınır. Bıçağın, kırık yüzeyinin ve makine etiketinin fotoğraflarıyla bize ulaşın; inceleme sonucunda ayıplı ürün söz konusuysa yasal haklarınız çerçevesinde işlem yapılır.',
      },
      {
        q: 'Bıçağım neden eğri kesiyor?',
        a: 'En sık nedenler yüksek ilerleme, düşük bıçak gerginliği, açık veya aşınmış kılavuzlar ve bir tarafı körelmiş dişlerdir. Önce ilerlemeyi azaltıp gerginliği ve kılavuz ayarını kontrol edin; dişler körelmişse bıçağı değiştirin.',
      },
      {
        q: 'Yeni bıçağın dişleri neden ilk gün döküldü?',
        a: 'En sık nedenler rodaj yapılmaması, kesite göre fazla seyrek diş (kesitte üçten az diş), parçanın mengenede oynaması ve yeni bıçağın eski bıçağın bıraktığı kesiğe sokulmasıdır. Yeni bıçakla her zaman yeni bir kesime başlayın ve ilk kesimleri düşük ilerlemeyle yapın.',
      },
    ],
    related: [G_FAULTS, G_BREAKIN, G_SETUP, G_TPI, G_GRADE],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-gerginlik-hiz-sogutma',
    title: 'Şerit Testere Gerginliği, Bant Hızı ve Soğutma Sıvısı (Bor Yağı) Ayarı',
    h1: 'Şerit Testere Gerginliği, Bant Hızı ve Soğutma Sıvısı',
    description:
      'Şerit testere bıçak gerginliği, malzemeye göre bant hızı, ilerleme, bor yağı (soğutma sıvısı) oranı ve kılavuz ayarı. Talaş rengine göre ayar tablosu ve kaynaklara göre değer aralıkları.',
    summary:
      'Gerginlik, malzemeye göre başlangıç bant hızı, ilerleme, soğutma sıvısı oranı ve talaş rengine göre ayar.',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Bıçak gerginliği, bant hızı, ilerleme ve soğutma birbirini etkiler; biri yanlışsa diğerleri ne kadar doğru olursa olsun bıçak erken bozulur. Bu rehberdeki değerler bıçak üreticilerinin yayımladığı aralıklardan derlenmiş başlangıç değerleridir. Kaynakların birbirinden ayrıldığı yerlerde aralıkları birlikte veriyoruz; her durumda makinenizin ve bıçak üreticisinin kılavuzu esastır.',
      },
      { type: 'h2', text: 'Bıçak gerginliği' },
      {
        type: 'p',
        text: 'Düşük gerginlik eğri ve dalgalı kesime, yüksek gerginlik ise gövde çatlaklarına, kaynak yerinden kopmaya ve bıçağın burulmasına yol açar. Bi-metal bıçaklar için yayımlanan değerler kaynaklara göre farklıdır:',
      },
      {
        type: 'table',
        head: ['Kaynak', 'Önerilen gerginlik (bi-metal)'],
        rows: [
          ['Alman bıçak üreticilerinin teknik kılavuzları', '250–300 N/mm²'],
          ['ABD’de yaygın uygulama (bayi ve kullanıcı kaynakları)', 'yaklaşık 25.000–30.000 psi (≈ 170–210 N/mm²); 35.000 psi (≈ 240 N/mm²) üzerine çıkılmaması önerilir'],
        ],
        caption: '1 N/mm² ≈ 145 psi. Bu konuda tek bir doğru değer yoktur; bıçak ve makine üreticinizin değerini uygulayın.',
      },
      {
        type: 'ul',
        items: [
          'Gerçek değeri bıçağa takılan bir gerginlik ölçerle ölçebilirsiniz; makinenin gerdirme göstergesi yaklaşık bir değer verir.',
          'Gerginlik ölçeriniz yoksa makine kılavuzundaki gerdirme konumunu uygulayın. Kılavuzlar doğru olduğu hâlde kesim eğri gidiyorsa gerginlik düşük olabilir.',
          'Bıçak ilk dakikalarda ısınıp çok az uzayabilir; bir süre çalıştıktan sonra gerginliği tekrar kontrol edin.',
          'İş bitince bıçağı gevşetin; sürekli gergin bırakmak gövdeyi yorar.',
        ],
      },
      { type: 'h2', text: 'Bant hızı: malzemeye göre başlangıç değerleri' },
      {
        type: 'p',
        text: 'Bant hızı (kesme hızı) malzeme sertleştikçe ve alaşım oranı arttıkça düşer. Aşağıdaki değerler bi-metal bıçak, yaklaşık 100 mm kesit, tavlı malzeme ve bol soğutma sıvısı için başlangıç değerleridir.',
      },
      {
        type: 'table',
        head: ['Malzeme grubu', 'Örnek', 'Başlangıç bant hızı (m/dk, yaklaşık)'],
        rows: [
          ['Yapı ve düşük karbonlu çelikler', 'St37 (S235JR), St52 (S355), 1018', '75 – 85'],
          ['Orta karbonlu ve ıslah çelikleri', 'C45 (1045), 42CrMo4 (4140)', '60 – 70'],
          ['Yüksek karbonlu ve rulman çelikleri', '1095, 100Cr6 (52100)', '50 – 55'],
          ['Takım çelikleri (tavlı)', '1.2344 (H13), 1.2510 (O1), 1.2379 (D2)', '25 – 45'],
          ['Östenitik paslanmaz', '1.4301 (304), 1.4401 (316)', '25 – 35'],
          ['Martensitik ve çökelme sertleşmeli paslanmaz', '440C, 17-4PH', 'yaklaşık 20'],
          ['Titanyum ve nikel alaşımları', 'Ti-6Al-4V, Inconel 718', '18 – 25'],
          ['Pirinç ve bronz', 'Kurşunlu pirinçler, alüminyum bronzu', '45 – 90'],
          ['Dökme demir', 'Gri ve sfero döküm', '35 – 70'],
          ['Alüminyum alaşımları (metal kesim makinesinde)', '6061, 7075', '85 – 105'],
        ],
        caption:
          'Değerler LENOX bi-metal hız tablosundan m/dk’ya çevrilip yuvarlanmıştır; diğer üreticilerin çelik tabloları da benzer aralıktadır. Karbür uçlu bıçaklar için bıçak üreticisinin tablosunu kullanın.',
      },
      {
        type: 'ul',
        items: [
          'Kesit küçüldükçe hız biraz artırılabilir (çok küçük kesitlerde yaklaşık %15’e kadar), büyüdükçe düşürülür (200 mm civarında yaklaşık %12).',
          'Püskürtme (sprey) yağlamada hızı yaklaşık %15, soğutmasız kesimde %30–50 düşürün.',
          'Islah edilmiş veya sertleştirilmiş malzemede hız ayrıca düşürülür; yaklaşık 45 HRC üzerindeki malzemeler bi-metal bıçak için uygun değildir.',
          'Makinenizin hız kademeleri sınırlıysa tablodaki değere en yakın düşük kademeyi seçin.',
        ],
      },
      {
        type: 'formula',
        text: 'v = π × D × n',
        note: 'Makineniz devir gösteriyorsa: v bant hızı (m/dk), D kasnak çapı (m), n kasnak devri (d/dk). Örnek: 0,4 m kasnak ve 60 d/dk → v ≈ 75 m/dk.',
      },
      { type: 'h2', text: 'İlerleme (kesme basıncı)' },
      {
        type: 'p',
        text: 'İlerleme, dişin her geçişte malzemeden aldığı talaşın kalınlığını belirler. Fazla ilerleme dişleri kırar, bıçağı eğri kestirir ve sırtı aşındırır. Çok düşük ilerlemede ise diş kesmek yerine malzeme üzerinde sürtünür, ısınır ve çabuk körelir; paslanmaz gibi malzemelerde bu sürtünme yüzeyi sertleştirir ve kesimi daha da zorlaştırır. Sayısal ilerleme değerleri makineye ve kesite özeldir; doğru ilerlemeyi bulmanın en pratik yolu talaşa bakmaktır.',
      },
      { type: 'h2', text: 'Talaş rengine ve şekline göre ayar' },
      {
        type: 'table',
        head: ['Talaşın görünümü', 'Ne anlama gelir?', 'Ne yapmalı?'],
        rows: [
          ['İnce, sıkı kıvrılmış, gümüş renkli ve ılık', 'Hız ve ilerleme uygun', 'Ayarı koruyun'],
          ['Çok ince, toz veya iğne gibi', 'İlerleme çok düşük; diş sürtüyor', 'İlerlemeyi kademeli olarak artırın'],
          ['Altın sarısı veya kahverengi', 'Kesim zorlanıyor, ısı artıyor', 'İlerlemeyi biraz azaltın, soğutmayı kontrol edin'],
          ['Gümüşten hafif maviye dönüyor', 'Bant hızı muhtemelen yüksek', 'Hızı bir kademe düşürün'],
          ['Kalın, sert ve mavi', 'Aşırı ısı: ilerleme ve/veya hız çok yüksek', 'Önce ilerlemeyi azaltın, gerekirse hızı düşürün; soğutmayı kontrol edin'],
          ['Talaş diş uçlarına yapışıyor', 'Soğutma yetersiz veya talaş fırçası çalışmıyor', 'Soğutma oranını ve akışını, talaş fırçasını kontrol edin'],
        ],
        caption: 'Bu değerlendirme kaplamasız bi-metal bıçaklar içindir.',
      },
      { type: 'h2', text: 'Soğutma sıvısı (bor yağı) oranı' },
      {
        type: 'p',
        text: 'Atölyede "bor yağı" denen su bazlı kesme sıvısı (emülsiyon) dişi soğutur, talaşın dişe yapışmasını önler ve kesim yüzeyini iyileştirir. Doğru oran malzemeye ve sıvıya göre değişir; kaynaklar burada da farklı değerler verir:',
      },
      {
        type: 'table',
        head: ['Kaynak / uygulama', 'Önerilen konsantrasyon'],
        rows: [
          ['Türkiye’de yaygın atölye uygulaması', 'yaklaşık %4–5'],
          ['Bir Alman bıçak üreticisinin önerisi, genel çelikler', '%8–12'],
          ['Aynı kaynak, paslanmaz ve takım çelikleri', '%15 ve üzeri veya kesme yağı'],
        ],
        caption: 'Kullandığınız sıvının üreticisinin önerdiği oranı ve makine kılavuzunu esas alın.',
      },
      {
        type: 'ul',
        items: [
          'Oranı göz kararı değil refraktometreyle ölçün; okunan değer, sıvı üreticisinin verdiği katsayıyla çarpılarak gerçek konsantrasyon bulunur.',
          'Karışım hazırlarken önce suyu, sonra konsantreyi ekleyin.',
          'Depo azaldığında yalnızca su eklemeyin: oran düşer ve dişler hızla aşınır. Hazırlanmış karışımla tamamlayın.',
          'Sıvıyı doğrudan kesim noktasına yöneltin ve tüm nozulların açık olduğunu kontrol edin.',
          'Minimum miktarda yağlama (mikro yağlama) sistemleri yapı çeliğinden boru, profil ve orta çaplı dolu malzemede kullanılabilir; zor malzemelerde bol soğutma tercih edilir.',
          'Soğutmasız kesim yapıyorsanız bant hızını belirgin şekilde düşürün.',
        ],
      },
      { type: 'h2', text: 'Kılavuz ayarı' },
      {
        type: 'ul',
        items: [
          'Kılavuz kollarını parçaya olabildiğince yaklaştırın; kollar açıldıkça bıçak sapmaya ve burulmaya başlar.',
          'Yan kılavuz boşluğu çok küçük olmalıdır (bir bıçak üreticisi 0,02–0,05 mm önerir); fazla sıkı kılavuz gövdeyi aşındırır ve ısıtır.',
          'Dişler kılavuzlardan dışarıda kalmalı (yaklaşık 1–2 mm); kılavuz diş çaprazına baskı yapmamalıdır.',
          'Talaş fırçası diş dibine yakın çalışmalıdır; aşınan fırçayı değiştirin.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Şerit testere gerginliği ne kadar olmalı?',
        a: 'Kaynaklar farklı değerler verir: bi-metal bıçaklar için Alman bıçak üreticileri 250–300 N/mm², ABD’deki yaygın uygulama yaklaşık 170–210 N/mm² (25.000–30.000 psi) önerir. Makinenizin ve bıçak üreticinizin değerini esas alın, mümkünse gerginlik ölçerle ölçün ve iş bitince bıçağı gevşetin.',
      },
      {
        q: 'Bor yağı oranı kaç olmalı?',
        a: 'Türkiye’de atölyelerde %4–5 yaygınken bazı bıçak üreticileri genel çelikler için %8–12, paslanmaz ve takım çelikleri için %15 ve üzerini veya kesme yağını önerir. Sıvının ve makinenin üreticisinin değerini esas alın; oranı refraktometreyle ölçün ve depoya yalnızca su eklemeyin.',
      },
      {
        q: 'Bant hızını nasıl hesaplarım?',
        a: 'Makineniz kasnak devrini gösteriyorsa bant hızı v = π × D × n formülüyle bulunur (D: kasnak çapı metre, n: devir/dakika). Örneğin 0,4 m kasnak 60 d/dk dönüyorsa bant hızı yaklaşık 75 m/dk’dır.',
      },
      {
        q: 'Mavi talaş ne demek?',
        a: 'Kalın ve mavi talaş aşırı ısıyı gösterir: ilerleme ve/veya bant hızı yüksek ya da soğutma yetersizdir. Önce ilerlemeyi azaltın, gerekirse hızı düşürün ve soğutmayı kontrol edin. İdeal talaş ince, kıvrılmış, gümüş renkli ve ılıktır.',
      },
    ],
    related: [G_FAULTS, G_BREAKIN, G_STEEL, G_BREAK, P_M51],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'serit-testere-rodaj-ve-bakim',
    title: 'Yeni Şerit Testere Nasıl Alıştırılır? Rodaj ve Bakım Rehberi',
    h1: 'Yeni Şerit Testere Alıştırma (Rodaj) ve Bakım',
    description:
      'Yeni şerit testere bıçağının rodajı (alıştırma) nasıl yapılır? Üreticilere göre ilerleme ve hız azaltma oranları, alıştırma alanı, günlük bakım, bıçağı güvenli açma ve saklama.',
    summary:
      'Yeni bıçağın rodajı, üreticilere göre alıştırma önerileri ve gerginlik, kılavuz, soğutma ve saklamayla bıçak bakımı.',
    datePublished: PUBLISHED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Yeni bir şerit testere bıçağının diş uçları çok keskindir ve mikroskobik düzeyde kırılgandır. Rodaj (alıştırma), bu uçların ilk kesimlerde kontrollü şekilde yuvarlanmasını sağlar; doğru yapılan rodaj bıçak ömrünü belirgin şekilde uzatır.',
      },
      { type: 'h2', text: 'Rodaj nasıl yapılır?' },
      {
        type: 'ol',
        items: [
          'Bıçağı dişler kesme yönüne bakacak şekilde takın, gerginliği makine veya bıçak üreticisinin önerdiği değere ayarlayın ve kılavuzları parça ölçüsüne göre yaklaştırın.',
          'Bant hızını malzemeye göre seçin. Bazı bıçak üreticileri rodajda normal hızı korumayı, bazıları normal hızın yaklaşık %70–75’ine düşürmeyi önerir; makinenizin ve bıçağınızın kılavuzunu esas alın.',
          'İlerlemeyi (kesme basıncını) belirgin şekilde azaltın. Önerilen değerler üreticiye göre normal kesme performansının yaklaşık %20’si ile %75’i arasında değişir; çoğu kaynak yaklaşık yarısını önerir. Yumuşak malzemelerde daha fazla azaltma önerilir.',
          'Bu düşük ilerlemeyle toplam yaklaşık 150–500 cm² kesit alanı kesin (bazı üreticiler bunun yerine yaklaşık 15 dakikalık kesim önerir). Talaş oluştuğundan emin olun; diş malzemeyi kesmeden sürtmemelidir.',
          'Sonraki kesimlerde ilerlemeyi ve (düşürdüyseniz) hızı kademeli olarak normal değere çıkarın. Titreşim veya gürültü olursa ilerlemeyi azaltın.',
        ],
      },
      {
        type: 'table',
        head: ['Parça', 'Bir kesimin alanı (yaklaşık)', '300 cm² için kesim sayısı'],
        rows: [
          ['Ø 30 mm dolu mil', '7 cm²', '~42'],
          ['Ø 50 mm dolu mil', '20 cm²', '~15'],
          ['Ø 100 mm dolu mil', '79 cm²', '~4'],
          ['100 × 100 × 5 mm kutu profil', '19 cm²', '~16'],
        ],
        caption: '300 cm² örnek olarak alınmıştır; bıçak ve makine kılavuzunuzdaki değeri kullanın.',
      },
      {
        type: 'note',
        text: 'Rodaj değerleri bıçak üreticilerine göre farklıdır. Bu sayfadaki aralıklar genel bir çerçevedir; makinenizin veya bıçağınızın kılavuzunda farklı bir değer varsa onu uygulayın. Karbür uçlu bıçaklar da alıştırılmalıdır; uçlar darbeye duyarlı olduğundan ilk kesimlerde titreşimden özellikle kaçının.',
      },
      { type: 'h2', text: 'Günlük bakım kontrol listesi' },
      {
        type: 'ul',
        items: [
          'Gerginlik: üretici değerinde olmalı; düşük gerginlik eğri kesime, yüksek gerginlik gövde çatlağına yol açar.',
          'Kılavuzlar ve rulmanlar: aşınmamış, bıçağa doğru mesafede ve parçaya yakın olmalı.',
          'Talaş fırçası: çalışır ve temiz olmalı; talaşın dişlerle tekrar kesime taşınmasını önler.',
          'Soğutma sıvısı: doğru konsantrasyonda olmalı (refraktometreyle ölçün), depoya yalnızca su eklenmemeli ve sıvı kesim noktasına gelmeli.',
          'Kasnaklar: üzerinde talaş birikmemeli; bıçak sırtı kasnak flanşına sürtmemeli.',
          'Diş yönü: dişler kesme yönüne, yani parçaya doğru bakmalı.',
        ],
      },
      { type: 'h2', text: 'Bıçağı güvenli açma ve saklama' },
      {
        type: 'p',
        text: 'Sarılı bıçak gerilim altındadır ve bağı çözüldüğünde aniden açılabilir. Açarken bıçağı vücudunuzdan uzak tutun; kesilmeye dayanıklı eldiven, koruyucu gözlük, uzun kollu iş kıyafeti ve iş ayakkabısı kullanın. Bıçağı yanlış açmak dişlere zarar verebilir; sırta alınan darbeler de ileride çatlak başlatabilecek çentikler bırakır.',
      },
      {
        type: 'p',
        text: 'Kullanılmayan bıçağı gevşetin. Yedek bıçakları kuru ortamda, nemden ve darbeden uzak, bir bıçağın dişleri diğerinin sırtını çizmeyecek şekilde saklayın; diş koruyucusunu bıçak makineye takıldıktan sonra çıkarın. Et ve gıda bıçaklarını temizleyip iyice kuruladıktan sonra kaldırın.',
      },
    ],
    faqs: [
      {
        q: 'Rodaj yapmazsam ne olur?',
        a: 'Keskin diş uçları ilk kesimlerde mikro çatlaklarla kırılabilir; bıçak beklenenden çok daha çabuk körelir veya diş dökebilir.',
      },
      {
        q: 'Rodajda bant hızını da düşürmeli miyim?',
        a: 'Kaynaklar bu konuda ayrışır: bazı bıçak üreticileri normal bant hızını koruyup yalnızca ilerlemeyi azaltmayı, bazıları hızı da yaklaşık %70–75’e düşürmeyi önerir. İki yöntemin ortak noktası ilerlemenin belirgin şekilde azaltılmasıdır. Makine veya bıçak kılavuzunuzdaki yöntemi uygulayın.',
      },
      {
        q: 'Bıçağı kullanmadığımda gevşetmeli miyim?',
        a: 'Evet. Gergin bırakılan bıçak sürekli yük altında kalır ve gövde yorulur; ayrıca kasnak lastiklerinde iz bırakabilir.',
      },
    ],
    related: [
      G_BREAK,
      G_SETUP,
      { label: 'Bi-Metal Şerit Testere Bıçakları', href: '/kategori/bi-metal-serit-testere' },
      { label: 'Et ve Kemik Kesim Şerit Testereleri', href: '/kategori/et-kemik-serit-testere' },
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'ahsap-serit-testere-secimi',
    title: 'Ahşap Şerit Testere Bıçağı Seçimi: Genişlik, Diş Sayısı (TPI) ve Diş Tipi',
    h1: 'Ahşap Şerit Testere Bıçağı Nasıl Seçilir?',
    description:
      'Marangoz ve mobilya atölyeleri için ahşap şerit testere seçimi: kıvrım yarıçapına göre bıçak genişliği, malzeme kalınlığına göre TPI, kanca ve atlamalı diş, kasnak çapına göre kalınlık.',
    summary: 'Kıvrım yarıçapına göre genişlik, malzeme kalınlığına göre TPI, kanca/atlamalı diş ve kalınlık seçimi.',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Ahşap şerit testerede doğru bıçak üç soruyla belirlenir: Ne kadar dar kıvrım keseceksiniz (genişlik)? Malzeme ne kadar kalın (diş sayısı)? Hız mı, temiz yüzey mi öncelikli (diş tipi)? Ahşap Kesim bıçağımız karbon çeliği gövde ve sertleştirilmiş dişlerle bu işler için üretilir; ölçüsünü makinenize göre milimetrik sipariş edebilirsiniz.',
      },
      { type: 'h2', text: 'Kıvrım yarıçapına göre bıçak genişliği' },
      {
        type: 'p',
        text: 'Bıçak daraldıkça daha küçük yarıçaplı kıvrımlar kesilebilir, ancak dar bıçak düz kesimde daha kolay sapar. Kural şudur: keseceğiniz en dar kıvrımın izin verdiği en geniş bıçağı seçin.',
      },
      {
        type: 'table',
        head: ['Bıçak genişliği (mm)', 'Kesilebilecek en küçük yarıçap (yaklaşık, mm)'],
        rows: [
          ['3', '4'],
          ['6', '16'],
          ['10', '40'],
          ['13', '65'],
          ['16', '100'],
          ['20', '140'],
          ['25', '180'],
        ],
        caption:
          'Bıçak üreticilerinin (LENOX, RÖNTGEN, Olson) tablolarında birbirine yakın verilen değerlerin yuvarlanmış özetidir. Daha dar yarıçaplarda bıçak burulur ve kıvrımı takip edemez.',
      },
      {
        type: 'ul',
        items: [
          'Düz kesim ve dilimleme (kalın keresteyi ince dilimlere ayırma) için makinenizin taşıyabildiği en geniş bıçağı kullanın; düz kesimde en az 10 mm genişlik yaygın bir öneridir.',
          'Genel kıvrımlı işlerde 6 mm, çok dar kıvrımlarda 3 mm gibi dar bıçaklar tercih edilir.',
          'Küçük ve hafif makineler geniş bıçağı yeterince geremeyebilir; makine kılavuzundaki en büyük genişliği aşmayın.',
        ],
      },
      { type: 'h2', text: 'Malzeme kalınlığına göre diş sayısı (TPI)' },
      {
        type: 'p',
        text: 'Ahşapta da kesitte en az üç diş kuralı geçerlidir. Bazı üreticiler üst sınır olarak kesitte yaklaşık 12 dişi önerir; daha fazlasında talaş boşalamaz ve bıçak ısınır. Bir dişin adımı 25,4 / TPI mm olduğundan, bir TPI değeriyle kesilebilecek en ince malzeme yaklaşık şöyle bulunur:',
      },
      {
        type: 'formula',
        text: 'En ince malzeme ≈ 3 × 25,4 / TPI',
        note: 'Örnek: 6 TPI için 3 × 25,4 / 6 ≈ 13 mm. Değişken dişli bıçaklarda ortalama TPI ile hesaplayın.',
      },
      {
        type: 'table',
        head: ['TPI', 'Diş adımı (mm)', 'En ince malzeme (yaklaşık)', 'Tipik kullanım'],
        rows: [
          ['2–3', '12,7–8,5', '25–38 mm', 'Kalın kereste, dilimleme, yaş ağaç'],
          ['4', '6,4', '19 mm', 'Genel marangozluk, hızlı kesim'],
          ['6', '4,2', '13 mm', 'Genel amaçlı ve kıvrımlı kesim'],
          ['10', '2,5', '8 mm', 'İnce levha, temiz yüzey'],
          ['14', '1,8', '5,5 mm', 'İnce kontrplak, hassas ve temiz kesim'],
        ],
        caption:
          'Hesap "kesitte en az üç diş" kuralına dayanır. Aynı kalınlıkta seyrek diş hızlı ama kaba, sık diş yavaş ama pürüzsüz keser: örneğin 19 mm ahşapta 4 TPI hızlı, 14 TPI yavaş ve temiz keser.',
      },
      { type: 'h2', text: 'Diş tipi: kanca, atlamalı ve düz diş' },
      {
        type: 'table',
        head: ['Diş tipi', 'Özelliği', 'Ne zaman?'],
        rows: [
          ['Kanca diş (hook)', 'Pozitif açılı, agresif diş; talaşı hızlı alır', 'Kalın ve yaş ağaç, dilimleme, yüzey kalitesinin ikinci planda olduğu hızlı kesim'],
          ['Atlamalı diş (skip)', 'Dişler seyrek, diş boşluğu geniş', 'Yumuşak ve reçineli ağaç, çok talaş çıkan kesimler, plastik ve mantar gibi malzemeler'],
          ['Düz diş (regular)', 'Sık diş, düz kesme açısı', 'İnce malzeme, temiz yüzey ve hassas kıvrımlı kesim'],
        ],
      },
      { type: 'h2', text: 'Kasnak çapı ve bıçak kalınlığı' },
      {
        type: 'p',
        text: 'Kalın bıçak küçük kasnakta her turda fazla bükülür ve kısa sürede diş diplerinden veya kaynak yerinden çatlar. Kaynaklar farklı sınırlar verir: yaygın pratik kural kalınlığın kasnak çapının yaklaşık binde biri olmasıdır (ör. 400 mm kasnak için 0,4 mm civarı); bazı ahşap makinesi üreticilerinin tabloları aynı kasnakta daha kalın bıçağa izin verir. Makine kılavuzundaki kalınlığı esas alın.',
      },
      { type: 'h2', text: 'Ahşap kesiminde sık sorunlar' },
      {
        type: 'ul',
        items: [
          'Kesim bir yana kaçıyor (sapma): en sık neden körelmiş veya bir tarafında çaprazı bozulmuş bıçaktır; önce bıçağı kontrol edin, sonra gerginliği ve kılavuzları ayarlayın. Keskin bıçakla da sapma sürüyorsa paralel cetveli bıçağın sapma açısına göre hizalayın.',
          'Kesim yüzeyi yanıyor: diş körelmiş, kesite göre fazla sık ya da ilerleme çok yavaş olabilir; reçine birikmiş bıçağı temizleyin.',
          'Bıçak kasnağın ortasında dönmüyor: iz ayarını üst kasnağın eğim ayarıyla, makine kılavuzundaki sırayla yapın; kapaklar açıkken motoru çalıştırmayın.',
          'Bıçak çabuk kopuyor: bıçak kasnak çapına göre kalın olabilir, gerginlik fazla olabilir veya bıçak kullanılmadığında gergin bırakılıyor olabilir.',
        ],
      },
      {
        type: 'note',
        text: 'Ahşap bıçağını metal kesiminde kullanmayın; karbon çeliği dişler metalde hızla körelir. Geniş bantlı tomruk biçme makineleri farklı bir bıçak sınıfı kullanır; bu tür makineler için ölçüyü ve diş profilini bize sorun.',
      },
    ],
    faqs: [
      {
        q: 'Ahşap şerit testerede kaç TPI kullanmalıyım?',
        a: 'Kesitte en az üç diş bulunacak şekilde seçin: kesilebilecek en ince malzeme yaklaşık 3 × 25,4 / TPI mm’dir. Kalın kereste ve dilimlemede 2–3 TPI, genel marangozlukta 4–6 TPI, ince levha ve temiz yüzeyde 10–14 TPI yaygındır.',
      },
      {
        q: 'Kıvrımlı kesim için kaç mm bıçak gerekir?',
        a: 'Keseceğiniz en dar kıvrımın izin verdiği en geniş bıçağı seçin. Yaklaşık olarak 6 mm bıçak 16 mm, 10 mm bıçak 40 mm, 13 mm bıçak 65 mm yarıçapa kadar kıvrım keser; çok dar kıvrımlarda 3 mm bıçak kullanılır.',
      },
      {
        q: 'Kalın kereste dilimlemek için hangi bıçak?',
        a: 'Makinenizin taşıyabildiği en geniş bıçak, seyrek diş (2–3 TPI) ve kanca veya atlamalı diş tercih edilir. Bıçak keskin, gerginlik doğru olmalı; besleme hızını bıçağın talaşı boşaltabileceği düzeyde tutun.',
      },
    ],
    related: [
      P_WOOD,
      { label: 'Ahşap Kesim Şerit Testereleri', href: '/kategori/ahsap-serit-testere' },
      G_LENGTH,
      G_FAULTS,
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'et-kemik-serit-testere-secimi',
    title: 'Et ve Kemik Şerit Testere Bıçağı Seçimi: Diş Adımı, Ölçü ve Hijyen',
    h1: 'Et ve Kemik Şerit Testere Bıçağı Nasıl Seçilir?',
    description:
      'Kasap ve et işleme tesisleri için şerit testere bıçağı seçimi: taze, donuk ve kemikli ürün için diş adımı (TPI), bıçak ölçüsü, paslanmaz gövde, temizlik ve güvenli kullanım.',
    summary: 'Taze, donuk ve kemikli ürün için diş adımı, bıçak ölçüsü, paslanmaz gövde ve temizlik.',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Et ve kemik testerelerinde bıçak dar ve incedir; kesim kalitesi kadar hijyen ve kolay temizlenebilirlik de önemlidir. Hijyenik Et-Kemik bıçağımız paslanmaz çelik gövdelidir ve makinenizin ölçüsüne göre milimetrik sipariş edilir.',
      },
      { type: 'h2', text: 'Bıçak ölçüsü: makinenizin etiketine bakın' },
      {
        type: 'ul',
        items: [
          'Boy, genişlik ve kalınlık makine modeline özeldir; makine etiketindeki veya kullanım kılavuzundaki ölçüyü esas alın.',
          'Kasap testerelerinde en yaygın genişlik 16 mm civarıdır; büyük makinelerde daha geniş bıçaklar kullanılır.',
          'Bıçak kalınlığı kasnak çapına uygun olmalıdır; kalın bıçak küçük kasnakta çatlar. Gıda makinelerinde sık kullanılan pratik kural, kalınlığın kasnak çapının yaklaşık binde biri olmasıdır; makine kılavuzundaki değer her zaman önceliklidir.',
        ],
      },
      { type: 'h2', text: 'Diş adımı: taze, donuk ve kemikli ürün' },
      {
        type: 'p',
        text: 'Et testerelerinde diş adımı genellikle 3–4 TPI arasındadır; ince ve hassas işler için daha sık dişli bıçaklar da kullanılır. Kaynakların çoğu şu ayrımı yapar:',
      },
      {
        type: 'table',
        head: ['Ürün', 'Yaygın öneri', 'Neden?'],
        rows: [
          ['Donuk et, büyük kemikli parçalar, donuk bloklar', '3 TPI', 'Geniş diş boşluğu talaşı ve kemik tozunu daha iyi boşaltır'],
          ['Taze veya soğutulmuş et, görünümün önemli olduğu porsiyonlar', '4 TPI', 'Daha düzgün kesim yüzeyi'],
          ['Balık ve ince, hassas kesimler', 'Daha sık diş (ör. 6 TPI)', 'İnce ve temiz kesim'],
        ],
      },
      {
        type: 'note',
        text: 'Bu konuda kaynaklar tam olarak örtüşmüyor: bazı satıcılar donuk et için sık, taze et ve balık için seyrek diş önerir. Kullandığınız makinenin üreticisinin önerisini esas alın; emin değilseniz makine modelinizi ve kestiğiniz ürünü bize yazın.',
      },
      { type: 'h2', text: 'Paslanmaz gövde ve hijyen' },
      {
        type: 'p',
        text: 'Gıda ile temas eden bıçakta korozyon hem hijyen hem bıçak ömrü için sorundur. Paslanmaz gövdeli bıçak nemli ve sık yıkanan ortamda paslanmaya karşı dayanıklıdır ve kolay temizlenir. Gıda testere makinelerinin güvenlik ve hijyen gereklilikleri makine standartlarında (EN 12268, EN 1672-2) tanımlanır; bu standartlar makineyle ilgilidir ve makinenin uygunluğu makine üreticisinin sorumluluğundadır.',
      },
      { type: 'h2', text: 'Temizlik ve saklama' },
      {
        type: 'ol',
        items: [
          'Temizlikten önce makineyi kapatın ve fişini çekin.',
          'Bıçağı gevşetip çıkarın; kesilmeye dayanıklı eldiven kullanın.',
          'Sıcak su ve gıdaya uygun bir deterjanla yağ, kemik tozu ve et artıklarını temizleyin, ardından durulayın.',
          'Bıçağı iyice kurulayın ve kuru bir yerde saklayın; nemli bırakmayın.',
          'Kasnakları ve kılavuzları da düzenli temizleyin; birikmiş artıklar hem hijyeni hem bıçağın düzgün çalışmasını etkiler.',
        ],
      },
      { type: 'h2', text: 'Güvenli kullanım' },
      {
        type: 'ul',
        items: [
          'Kapaklar ve bıçak koruyucusu takılı olmadan makineyi çalıştırmayın; koruyucuyu kesilen parçanın yüksekliğine göre ayarlayın.',
          'Küçük parçaları elle bıçağa doğru itmeyin; makinenin itme aparatını veya sürgülü tablasını kullanın.',
          'Donuk ve büyük kemikli bloklar bıçağı daha fazla zorlar; parçayı zorlamadan, sabit hızla ilerletin.',
          'Körelen bıçak ürünü ezer ve daha fazla kuvvet ister; kesim kalitesi düştüğünde bıçağı değiştirin.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Donmuş et için kaç TPI bıçak kullanılır?',
        a: 'Kaynakların çoğu donuk ve kemikli ürün için 3 TPI, taze ve görünümün önemli olduğu kesimler için 4 TPI önerir; bazı satıcılar ise donuk ette daha sık dişi önerir. Makine üreticinizin önerisini esas alın; emin değilseniz makine modelinizi ve kestiğiniz ürünü bize yazın.',
      },
      {
        q: 'Et testeresi bıçağı paslanmaz olmak zorunda mı?',
        a: 'Zorunlu değildir; piyasada yüksek karbonlu çelikten et bıçakları da vardır. Ancak paslanmaz gövde nemli ve sık yıkanan ortamda korozyona dayanıklıdır ve hijyenik temizliği kolaylaştırır. Karbon çeliği bıçak kullanıyorsanız temizlikten sonra hemen kurulamak daha da önemlidir.',
      },
      {
        q: 'Et testeresi bıçağının ölçüsünü nasıl bulurum?',
        a: 'Makine etiketindeki veya kullanım kılavuzundaki bıçak ölçüsünü (boy × genişlik × kalınlık) esas alın. Etiket yoksa eski bıçağı düz zeminde bir tam tur yuvarlayarak boyunu ölçün; genişliği sırttan diş ucuna, kalınlığı kumpasla gövdeden ölçün.',
      },
    ],
    related: [
      P_MEAT,
      { label: 'Et ve Kemik Kesim Şerit Testereleri', href: '/kategori/et-kemik-serit-testere' },
      G_LENGTH,
      G_BREAKIN,
    ],
  },
  /* ------------------------------------------------------------------ */
  {
    slug: 'sunger-kesim-bicagi-secimi',
    title: 'Sünger ve Köpük Kesim Bıçağı Seçimi: Düz, Dalgalı veya Tırtıklı Ağız',
    h1: 'Sünger, Köpük ve Tekstil İçin Şerit Bıçak Nasıl Seçilir?',
    description:
      'Sünger, köpük, kumaş ve yalıtım malzemesi kesimi için şerit bıçak seçimi: düz (bıçak ağızlı), dalgalı ve tırtıklı ağız farkı, malzemeye göre seçim, ölçü ve bakım.',
    summary: 'Düz, dalgalı ve tırtıklı ağız farkı; malzemeye göre ağız seçimi, ölçü ve bıçak bakımı.',
    datePublished: UPDATED,
    dateModified: UPDATED,
    blocks: [
      {
        type: 'p',
        text: 'Sünger, köpük ve kumaş gibi yumuşak malzemeler talaş kaldırılarak değil, dilimlenerek kesilir. Dişli bir testere bu malzemeleri yırtar, toz ve lif bırakır; bu yüzden dişsiz veya özel ağızlı şerit bıçaklar kullanılır. Sünger-Tekstil bıçağımızı makinenizin ölçüsüne göre sipariş edebilir, ağız tipini ürün sayfasında seçebilirsiniz.',
      },
      { type: 'h2', text: 'Ağız tipleri' },
      {
        type: 'table',
        head: ['Ağız tipi', 'Nasıl keser?', 'Uygun malzemeler'],
        rows: [
          ['Düz (bıçak ağızlı)', 'Saf dilimleme; toz çıkarmaz, en pürüzsüz yüzeyi verir', 'Yumuşak ve esnek sünger, viskoelastik (hafızalı) köpük; ağzın düzenli bilenmesi gerekir'],
          ['Dalgalı ağız', 'Keskin dalga tepeleri malzemeye önce girer, malzemeyi çekmeden keser', 'Düşük ve orta yoğunluklu sünger, kumaş, keçe ve lifli malzemeler'],
          ['Tırtıklı (yarım ay) ağız', 'Dilimlemeyi delici uçlarla birleştirir; az toz, düzgün yüzey', 'Esnek köpüklerin geneli, daha yoğun sünger ve yalıtım köpükleri'],
        ],
        caption:
          'Sınıflandırma bant bıçak üreticilerinin yayımladığı genel kullanım bilgilerine dayanır; malzemenizin yoğunluğu ve makinenizin tipi seçimi değiştirebilir.',
      },
      { type: 'h2', text: 'Malzemeye göre hızlı seçim' },
      {
        type: 'ul',
        items: [
          'Yatak ve döşeme süngeri, hafızalı köpük ve en temiz yüzey istenen işler: düz ağız.',
          'Karışık yoğunlukta sünger, kumaş katları, keçe: dalgalı ağız.',
          'Daha yoğun veya sert sünger, yalıtım köpükleri: tırtıklı ağız.',
          'Sert köpük levhalar (XPS, PIR gibi), dolgulu kauçuk ve kompozitler farklı ağız tipleri veya dişli bıçak gerektirebilir; malzemenizi ve makinenizi bize yazın.',
        ],
      },
      { type: 'h2', text: 'Genişlik, kalınlık ve boy' },
      {
        type: 'ul',
        items: [
          'Kıvrımlı ve şablonlu kesimlerde dar bıçak, düz ve büyük blok kesimlerinde makinenizin izin verdiği geniş bıçak kullanın.',
          'Boy, genişlik ve kalınlık makine modeline özeldir; makine etiketini veya eski bıçağı esas alın.',
          'Yatay blok dilimleme makineleri çoğu zaman makineye özel bıçak ölçüsü ve ağız tipi kullanır; bazı makineler tek taraflı, bazıları çift taraflı bilenmiş ağız ister. Eski bıçağın ölçüsünü ve ağız tipini makine kılavuzuyla karşılaştırın.',
        ],
      },
      { type: 'h2', text: 'Bakım ve kullanım' },
      {
        type: 'ul',
        items: [
          'Körelmiş ağız malzemeyi keseceğine iter ve yırtar; düz ağızlı bıçaklar düzenli bilenmelidir (bileme ünitesi olan makinelerde makine üreticisinin talimatına uyun).',
          'Yapışkan ve tutkal artıkları ağzı köreltir ve sürtünmeyi artırır; bıçağı düzenli temizleyin.',
          'Gerginliği makine kılavuzuna göre ayarlayın; düşük gerginlik dalgalı ve eğri kesime yol açar.',
          'Ağız çok keskin olduğundan bıçağı takarken ve temizlerken kesilmeye dayanıklı eldiven kullanın.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Sünger kesiminde neden dişsiz bıçak kullanılır?',
        a: 'Dişli bıçaklar yumuşak malzemeyi yırtıp toz ve lif bırakabilir. Düz, dalgalı veya tırtıklı ağızlı bıçaklar malzemeyi dilimleyerek ayırır; böylece daha temiz ve düzgün bir kesim yüzeyi elde edilir.',
      },
      {
        q: 'Dalgalı ağız ile tırtıklı ağız arasındaki fark nedir?',
        a: 'Dalgalı ağızda keskin dalga tepeleri malzemeye önce girer ve malzemeyi çekmeden keser; düşük ve orta yoğunluklu sünger ile kumaş ve keçe gibi lifli malzemelerde kullanılır. Tırtıklı (yarım ay) ağız dilimlemeyi delici uçlarla birleştirir; esnek köpüklerin genelinde ve daha yoğun süngerde tercih edilir.',
      },
      {
        q: 'Sünger bıçağını ne zaman bilemeli veya değiştirmeliyim?',
        a: 'Kesim yüzeyi pürüzlenmeye, malzeme yırtılmaya veya bıçak malzemeyi itmeye başladığında ağız körelmiştir. Düz ağızlı bıçağı bileyin; ağız profili bozulmuş veya gövde çatlamış bıçağı değiştirin.',
      },
    ],
    related: [
      P_FOAM,
      { label: 'Sünger ve Tekstil Kesim Şerit Bıçakları', href: '/kategori/sunger-tekstil-serit-testere' },
      G_LENGTH,
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Bir kategori sayfası için ilgili rehberler (slug eşlemesi). */
export const GUIDES_BY_CATEGORY: Record<string, string[]> = {
  'bi-metal-serit-testere': [
    'serit-testere-tpi-secimi',
    'm42-mi-m51-mi',
    'celik-kalite-esdegerleri-bicak-secimi',
    'serit-testere-arizalari-ve-cozumleri',
  ],
  'm42-serit-testere': ['m42-mi-m51-mi', 'serit-testere-tpi-secimi', 'celik-kalite-esdegerleri-bicak-secimi'],
  'm51-serit-testere': ['m42-mi-m51-mi', 'celik-kalite-esdegerleri-bicak-secimi', 'serit-testere-gerginlik-hiz-sogutma'],
  'karbur-uclu-serit-testere': ['m42-mi-m51-mi', 'celik-kalite-esdegerleri-bicak-secimi', 'serit-testere-kirilma-nedenleri'],
  'ahsap-serit-testere': ['ahsap-serit-testere-secimi', 'serit-testere-boyu-nasil-olculur', 'serit-testere-arizalari-ve-cozumleri'],
  'et-kemik-serit-testere': ['et-kemik-serit-testere-secimi', 'serit-testere-boyu-nasil-olculur', 'serit-testere-rodaj-ve-bakim'],
  'sunger-tekstil-serit-testere': ['sunger-kesim-bicagi-secimi', 'serit-testere-boyu-nasil-olculur'],
};
