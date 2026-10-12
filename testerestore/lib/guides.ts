/**
 * Teknik rehberler (/rehber/[slug]) — GEO/SEO içeriği.
 *
 * Kurallar: genel kabul görmüş, doğrulanabilir teknik bilgi; ürüne özgü
 * değerler ürün sayfalarında. TPI aralıkları ürün sayfasındaki TPI
 * danışmanının kullandığı Starrett seçim tablosuyla aynıdır
 * (app/components/BladeSpecVisualizer.tsx → VARIABLE_SOLID); biri değişirse
 * diğeri de güncellenmeli. Süre/garanti/menşe vaadi YOK.
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

export const GUIDES: Guide[] = [
  {
    slug: 'serit-testere-tpi-secimi',
    title: 'Şerit Testere Diş Adımı (TPI) Nasıl Seçilir? Tablo ve Örnekler',
    h1: 'Şerit Testere Diş Adımı (TPI) Nasıl Seçilir?',
    description:
      'Şerit testerede doğru diş adımı (TPI) seçimi: kesitte en az üç diş kuralı, dolu malzeme için çapa göre TPI tablosu, boru ve profil seçimi, yanlış seçimin belirtileri.',
    summary:
      'Kesitte en az üç diş kuralı, dolu malzeme çapına göre TPI tablosu ve boru/profil için seçim ipuçları.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    blocks: [
      {
        type: 'p',
        text: 'TPI (teeth per inch), bıçağın bir inçlik (25,4 mm) boyunda kaç diş bulunduğunu gösterir. Diş adımı, kesim hızını, yüzey kalitesini ve bıçak ömrünü doğrudan belirler: kesilen malzemeye göre fazla seyrek diş kırılır, fazla sık diş talaşla tıkanır.',
      },
      { type: 'h2', text: 'Temel kural: kesitte en az üç diş' },
      {
        type: 'p',
        text: 'Kesim sırasında malzemenin içinde aynı anda en az üç diş çalışmalıdır; ideal aralık genellikle 6 ile 24 diş arasıdır. Üçten az diş çalışırsa her diş aşırı yük alır ve kırılır; çok fazla diş çalışırsa diş boşlukları talaşla dolar, kesim yavaşlar ve bıçak ısınır.',
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
        type: 'table',
        head: ['Kesit / çap (mm)', 'Önerilen değişken diş (TPI)'],
        rows: [
          ['10 – 25', '10/14'],
          ['25 – 50', '6/10'],
          ['40 – 70', '5/8'],
          ['50 – 100', '4/6'],
          ['70 – 130', '3/4'],
          ['100 – 180', '2/3'],
          ['180 – 300', '1,4/2'],
        ],
        caption:
          'Aralıklar Starrett dolu malzeme seçim tablosu esas alınarak hazırlanmıştır ve bilerek örtüşür; iki aralığın kesiştiği ölçülerde ince yüzey için sık, hızlı kesim için seyrek dişi seçin.',
      },
      { type: 'h2', text: 'Boru ve profillerde seçim' },
      {
        type: 'p',
        text: 'Boru ve profillerde belirleyici olan dış çaptan çok et (cidar) kalınlığıdır: diş, kesit boyunca en ince duvarda da üç diş kuralını sağlamalıdır. Bu yüzden aynı çaptaki ince cidarlı boru, dolu mile göre çok daha sık diş ister. Ürün sayfalarımızdaki "Diş Profili ve TPI Danışmanı", boru ve profil için çap ile et kalınlığını birlikte değerlendirerek öneri verir.',
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
        a: '50 mm çevresinde 6/10 ve 4/6 aralıkları kesişir. Daha düzgün yüzey için 6/10, daha hızlı kesim ve uzun talaş için 4/6 seçilebilir.',
      },
      {
        q: 'İnce cidarlı boru için neden sık diş gerekir?',
        a: 'Kesim sırasında boru duvarı içinde en az üç diş çalışmalıdır. Duvar inceldikçe bu koşul ancak dişler sıklaştıkça sağlanır; seyrek dişte dişler duvara takılıp kırılır.',
      },
    ],
    related: [
      { label: 'Bi-Metal Şerit Testere Bıçakları', href: '/kategori/bi-metal-serit-testere' },
      { label: 'M42 mi, M51 mi?', href: '/rehber/m42-mi-m51-mi' },
      { label: 'Bi-Metal M42 şerit testere (ölçüye göre sipariş)', href: '/products/bimetal-premium' },
    ],
  },
  {
    slug: 'm42-mi-m51-mi',
    title: 'M42 mi, M51 mi, Karbür mü? Şerit Testere Kalite Karşılaştırması',
    h1: 'M42 mi, M51 mi, Karbür mü? Doğru Şerit Testere Kalitesi',
    description:
      'Bi-metal M42, M51 ve karbür uçlu (TCT) şerit testereler arasındaki farklar: diş malzemesi, hangi malzemede hangisi, makine gereksinimi ve seçim için karar adımları.',
    summary:
      'M42, M51 ve karbür uçlu bıçakların farkları ve hangi malzemede hangisinin seçileceği.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
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
          ['Diş', 'Kobalt alaşımlı HSS (yaklaşık %8 Co)', 'M42\'den daha yüksek sertlik ve ısı direncine sahip HSS', 'Tungsten karbür uç'],
          ['Tipik kullanım', 'Yapı çeliği, profil, boru, genel atölye', 'Paslanmaz, alaşımlı ve takım çelikleri, büyük kesitler', 'Sertleştirilmiş çelik, nikel/titanyum alaşımları, aşındırıcı malzemeler'],
          ['Makine gereksinimi', 'Standart şerit testere makineleri', 'Standart şerit testere makineleri', 'Rijit, titreşimsiz ve yeterli gerginlik sağlayan makine'],
          ['Göreli bıçak maliyeti', 'Düşük', 'Orta', 'Yüksek'],
        ],
      },
      { type: 'h2', text: 'Hangisini seçmeliyim?' },
      {
        type: 'ol',
        items: [
          'Genel yapı çeliği, profil ve boru kesiyorsanız M42 ile başlayın; çoğu atölye için fiyat/performans dengesi en iyi seçimdir.',
          'Paslanmaz, alaşımlı veya takım çeliğini düzenli kesiyor ya da büyük kesitli dolu malzemeyle çalışıyorsanız M51 seçin; diş ağzı yüksek sıcaklıkta daha geç körelir.',
          'Sertleştirilmiş çelik, nikel ve titanyum alaşımları veya dökme demir gibi aşındırıcı malzemelerde bi-metal bıçaklar hızla körelir; makineniz uygunsa karbür uçlu bıçak kullanın.',
          'Hangi kaliteyi seçerseniz seçin, diş adımını (TPI) kesite göre belirleyin ve yeni bıçağı rodajla alıştırın.',
        ],
      },
      { type: 'h2', text: 'Ahşap, gıda ve sünger kesimi' },
      {
        type: 'p',
        text: 'Bu karşılaştırma metal kesimi içindir. Ahşapta karbon çeliği ahşap bıçakları, et ve kemikte paslanmaz gövdeli gıda bıçakları, sünger ve tekstilde dişsiz (dalgalı veya tırtıklı ağızlı) bıçaklar kullanılır. Metal bıçağını ahşapta veya ahşap bıçağını metalde kullanmak hem kesim kalitesini hem bıçak ömrünü düşürür.',
      },
    ],
    faqs: [
      {
        q: 'M51, M42\'den daha mı iyi?',
        a: 'M51 daha yüksek sertlik ve ısı direnci sunar; paslanmaz, alaşımlı çelik ve büyük kesitlerde daha uzun ömür verir. Genel yapı çeliği ve profil kesiminde ise M42 genellikle yeterli ve daha ekonomiktir.',
      },
      {
        q: 'Karbür uçlu bıçak her makinede kullanılabilir mi?',
        a: 'Hayır. Karbür uçlar darbe ve titreşime duyarlıdır; rijit, titreşimsiz ve yeterli bıçak gerginliği sağlayan bir makine gerekir. Makine üreticisinin önerdiği bıçak ölçüsünü kullanın.',
      },
      {
        q: 'Paslanmaz çelik için hangi bıçak?',
        a: 'Ara sıra paslanmaz kesiyorsanız M42 kullanılabilir; düzenli paslanmaz kesiminde M51 önerilir. Düşük kesme hızı, sabit ilerleme ve bol soğutma sıvısı paslanmazda bıçak ömrünü belirgin şekilde artırır.',
      },
    ],
    related: [
      { label: 'M42 Bi-Metal Şerit Testere', href: '/kategori/m42-serit-testere' },
      { label: 'M51 Bi-Metal Şerit Testere', href: '/kategori/m51-serit-testere' },
      { label: 'Karbür Uçlu Şerit Testereler', href: '/kategori/karbur-uclu-serit-testere' },
      { label: 'TPI nasıl seçilir?', href: '/rehber/serit-testere-tpi-secimi' },
    ],
  },
  {
    slug: 'serit-testere-boyu-nasil-olculur',
    title: 'Şerit Testere Boyu Nasıl Ölçülür? Formül ve Örnek Hesap',
    h1: 'Şerit Testere Boyu Nasıl Ölçülür?',
    description:
      'Şerit testere bıçak boyunu doğru ölçmenin üç yolu: makine etiketi, eski bıçağı ölçmek ve kasnak formülü (L = 2C + πD). Örnek hesap ve genişlik/kalınlık seçimi.',
    summary:
      'Bıçak boyunu makine etiketinden, eski bıçaktan veya kasnak formülüyle (L = 2C + πD) bulma.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    blocks: [
      {
        type: 'p',
        text: 'Şerit testere bıçakları kapalı halka olarak kaynaklanır; bu yüzden boy hatası sonradan düzeltilemez. Özel ölçüde üretilen bıçaklarda cayma hakkı da bulunmadığından, sipariş öncesi boyu doğru belirlemek önemlidir. Aşağıdaki yöntemleri güvenilirlik sırasına göre sıraladık.',
      },
      { type: 'h2', text: '1. Makine etiketi veya kullanım kılavuzu' },
      {
        type: 'p',
        text: 'En doğru kaynak, makinenin üzerindeki etiket veya kullanım kılavuzunda yazan bıçak ölçüsüdür. Genellikle "3660 × 27 × 0,9" gibi boy × genişlik × kalınlık (mm) şeklinde verilir.',
      },
      { type: 'h2', text: '2. Eski bıçağı ölçmek' },
      {
        type: 'ol',
        items: [
          'Eski bıçağı makineden çıkarın ve düz, temiz bir zemine yerleştirin.',
          'Dişlerin üzerinde bir noktaya tebeşir veya kalemle işaret koyun.',
          'Bıçağı işaretten başlayarak bir tam tur yuvarlayın ve işaretin zemine tekrar geldiği noktaya kadar olan mesafeyi ölçün.',
          'Alternatif olarak bıçağı bir noktadan açık kabul edip şerit metreyle dikkatlice çevresini ölçebilirsiniz.',
        ],
      },
      { type: 'h2', text: '3. Kasnak formülüyle hesaplamak' },
      {
        type: 'p',
        text: 'İki eşit çaplı kasnağı olan makinelerde bıçak boyu, kasnak merkezleri arasındaki mesafe ve kasnak çapından hesaplanabilir. Ölçümü gerdirme ayarı orta konumdayken yapın.',
      },
      {
        type: 'formula',
        text: 'L = 2 × C + π × D',
        note: 'L: bıçak boyu, C: kasnak merkezleri arası mesafe, D: kasnak çapı (hepsi mm).',
      },
      {
        type: 'p',
        text: 'Örnek: merkezler arası mesafe 1.200 mm, kasnak çapı 350 mm ise L = 2 × 1.200 + 3,1416 × 350 ≈ 2.400 + 1.099,6 ≈ 3.500 mm olur.',
      },
      {
        type: 'note',
        text: 'Üç veya daha fazla kasnaklı ya da farklı çaplı kasnakları olan makinelerde bu formül geçerli değildir; makine etiketini veya eski bıçağı esas alın.',
      },
      { type: 'h2', text: 'Genişlik ve kalınlık' },
      {
        type: 'p',
        text: 'Bıçak genişliği ve kalınlığı makinenizin bıçak kılavuzlarına ve kasnak çapına uygun olmalıdır. Kalın bıçaklar küçük çaplı kasnaklarda sürekli bükülmeye dayanamayıp çatlayabilir; makine üreticisinin önerdiği ölçünün dışına çıkmayın.',
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
    ],
    related: [
      { label: 'Hazır boy şerit testereler', href: '/hazir-urunler' },
      { label: 'TPI nasıl seçilir?', href: '/rehber/serit-testere-tpi-secimi' },
      { label: 'Sık sorulan sorular', href: '/sss' },
    ],
  },
  {
    slug: 'serit-testere-kirilma-nedenleri',
    title: 'Şerit Testere Neden Kırılır veya Çabuk Körelir? Nedenler ve Çözümler',
    h1: 'Şerit Testere Neden Kırılır veya Çabuk Körelir?',
    description:
      'Şerit testere bıçağının kırılma, diş dökülmesi, çabuk körelme ve eğri kesme nedenleri: gerginlik, TPI, kılavuz ayarı, rodaj, kesme hızı ve soğutma. Belirti–neden–çözüm tablosu.',
    summary:
      'Kırılma, diş dökülmesi, çabuk körelme ve eğri kesmenin en sık nedenleri ve çözümleri.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    blocks: [
      {
        type: 'p',
        text: 'Bir şerit testere bıçağının erken bozulmasının nedeni çoğu zaman bıçağın kendisi değil, makine ayarları ve kullanım koşullarıdır. Aşağıdaki tablo en sık görülen belirtileri, olası nedenlerini ve çözümlerini özetler.',
      },
      {
        type: 'table',
        head: ['Belirti', 'Olası neden', 'Çözüm'],
        rows: [
          ['Bıçak gövdeden çatlıyor veya kırılıyor', 'Aşırı gerginlik, kasnak çapına göre fazla kalın bıçak, aşınmış kasnak veya kılavuz', 'Gerginliği üretici değerine ayarlayın; makineye uygun kalınlık kullanın; kasnak ve kılavuzları kontrol edin'],
          ['Dişler kırılıyor veya dökülüyor', 'Diş çok seyrek, ince kesitte üçten az diş; parça sağlam bağlanmamış; rodaj yapılmamış', 'Daha sık diş seçin; parçayı sıkıca bağlayın; yeni bıçağı alıştırın'],
          ['Bıçak çabuk köreliyor', 'Kesme hızı çok yüksek, soğutma yetersiz, malzemeye göre yanlış kalite', 'Hızı düşürün; soğutma sıvısını kontrol edin; zor malzemede M51 veya karbür kullanın'],
          ['Kesim eğri gidiyor', 'Gerginlik düşük, kılavuzlar açık veya aşınmış, dişler bir tarafta körelmiş', 'Gerginliği artırın; kılavuzları ayarlayın; körelmiş bıçağı değiştirin'],
          ['Talaş dişlere yapışıyor', 'Diş çok sık, talaş fırçası çalışmıyor, soğutma yetersiz', 'Daha seyrek diş seçin; talaş fırçasını temizleyin veya değiştirin; soğutmayı artırın'],
          ['Kaynak yerinden kırılma', 'Kaynak veya kaynak sonrası işlem hatası', 'Bıçağı ve kırık bölgenin fotoğraflarını bize iletin; ayıplı ürün olarak değerlendirilir'],
        ],
      },
      { type: 'h2', text: 'En sık yapılan beş hata' },
      {
        type: 'ol',
        items: [
          'Yeni bıçağı rodaj yapmadan tam ilerlemeyle kullanmak: keskin diş uçları mikro çatlaklarla kırılır.',
          'Bıçağı kullanılmadığında gergin bırakmak: gövde gereksiz yere yorulur.',
          'Diş yönünü ters takmak: dişler kesme yönünün tersine bakarsa bıçak kesmez ve hızla bozulur.',
          'Kılavuzları bıçak genişliğine göre ayarlamamak: bıçak yanal yük alır, eğri keser ve çatlar.',
          'Malzemeye uygun olmayan diş adımı kullanmak: seyrek dişte kırılma, sık dişte tıkanma ve ısınma olur.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Şerit testere neden kaynak yerinden kırılır?',
        a: 'Kaynak yerinden kırılmanın en sık nedeni kaynak veya kaynak sonrası tavlama hatasıdır; aşırı gerginlik ve küçük kasnak da etkili olabilir. Kaynak yerinden kırılan bıçağın fotoğraflarını iletin; ayıplı ürün olarak değerlendirilir.',
      },
      {
        q: 'Bıçağım neden eğri kesiyor?',
        a: 'En sık nedenler düşük bıçak gerginliği, açık veya aşınmış kılavuzlar ve bir tarafı körelmiş dişlerdir. Gerginliği ve kılavuz ayarını kontrol edin; dişler körelmişse bıçağı değiştirin.',
      },
    ],
    related: [
      { label: 'Rodaj ve bakım rehberi', href: '/rehber/serit-testere-rodaj-ve-bakim' },
      { label: 'TPI nasıl seçilir?', href: '/rehber/serit-testere-tpi-secimi' },
      { label: 'M42 mi, M51 mi?', href: '/rehber/m42-mi-m51-mi' },
    ],
  },
  {
    slug: 'serit-testere-rodaj-ve-bakim',
    title: 'Yeni Şerit Testere Nasıl Alıştırılır? Rodaj ve Bakım Rehberi',
    h1: 'Yeni Şerit Testere Alıştırma (Rodaj) ve Bakım',
    description:
      'Yeni şerit testere bıçağının rodajı (alıştırma) nasıl yapılır, neden önemlidir? Gerginlik, kılavuz, talaş fırçası, soğutma ve saklama ile bıçak ömrünü uzatma.',
    summary:
      'Yeni bıçağın rodajı ve gerginlik, kılavuz, soğutma ve saklamayla bıçak ömrünü uzatma.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    blocks: [
      {
        type: 'p',
        text: 'Yeni bir şerit testere bıçağının diş uçları çok keskindir ve mikroskobik düzeyde kırılgandır. Rodaj (alıştırma), bu uçların ilk kesimlerde kontrollü şekilde yuvarlanmasını sağlar; doğru yapılan rodaj bıçak ömrünü belirgin şekilde uzatır.',
      },
      { type: 'h2', text: 'Rodaj nasıl yapılır?' },
      {
        type: 'ol',
        items: [
          'Bıçağı takın, gerginliği makine üreticisinin önerdiği değere ayarlayın ve kılavuzları bıçak genişliğine göre ayarlayın.',
          'Kesme hızını malzemeye uygun normal değerde bırakın.',
          'İlerlemeyi (kesme basıncını) normal değerin yaklaşık yarısına düşürün.',
          'İlk kesimleri bu düşük ilerlemeyle yapın; bi-metal bıçaklar için yaygın öneri yaklaşık 300–500 cm² kesit alanıdır.',
          'Sonraki kesimlerde ilerlemeyi kademeli olarak normal değere çıkarın. Titreşim veya gürültü olursa ilerlemeyi azaltın.',
        ],
      },
      { type: 'h2', text: 'Günlük bakım kontrol listesi' },
      {
        type: 'ul',
        items: [
          'Gerginlik: üretici değerinde olmalı; düşük gerginlik eğri kesime, yüksek gerginlik gövde çatlağına yol açar.',
          'Kılavuzlar ve rulmanlar: aşınmamış ve bıçağa doğru mesafede olmalı.',
          'Talaş fırçası: çalışır ve temiz olmalı; talaşın dişlere geri taşınmasını önler.',
          'Soğutma sıvısı: doğru konsantrasyonda ve kesim bölgesine yeterli miktarda gelmeli.',
          'Diş yönü: dişler kesme yönüne, yani parçaya doğru bakmalı.',
        ],
      },
      { type: 'h2', text: 'Saklama' },
      {
        type: 'p',
        text: 'Kullanılmayan bıçağı gevşetin. Yedek bıçakları kuru ortamda, nemden ve darbeden uzak saklayın; et ve gıda bıçaklarını temizleyip iyice kuruladıktan sonra kaldırın.',
      },
    ],
    faqs: [
      {
        q: 'Rodaj yapmazsam ne olur?',
        a: 'Keskin diş uçları ilk kesimlerde mikro çatlaklarla kırılabilir; bıçak beklenenden çok daha çabuk körelir veya diş dökebilir.',
      },
      {
        q: 'Bıçağı kullanmadığımda gevşetmeli miyim?',
        a: 'Evet. Gergin bırakılan bıçak sürekli yük altında kalır ve gövde yorulur; ayrıca kasnak lastiklerinde iz bırakabilir.',
      },
    ],
    related: [
      { label: 'Şerit testere neden kırılır?', href: '/rehber/serit-testere-kirilma-nedenleri' },
      { label: 'Bi-Metal Şerit Testere Bıçakları', href: '/kategori/bi-metal-serit-testere' },
      { label: 'Et ve Kemik Kesim Şerit Testereleri', href: '/kategori/et-kemik-serit-testere' },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Bir kategori sayfası için ilgili rehberler (slug eşlemesi). */
export const GUIDES_BY_CATEGORY: Record<string, string[]> = {
  'bi-metal-serit-testere': ['serit-testere-tpi-secimi', 'm42-mi-m51-mi', 'serit-testere-rodaj-ve-bakim'],
  'm42-serit-testere': ['m42-mi-m51-mi', 'serit-testere-tpi-secimi'],
  'm51-serit-testere': ['m42-mi-m51-mi', 'serit-testere-tpi-secimi'],
  'karbur-uclu-serit-testere': ['m42-mi-m51-mi', 'serit-testere-kirilma-nedenleri'],
  'ahsap-serit-testere': ['serit-testere-boyu-nasil-olculur', 'serit-testere-rodaj-ve-bakim'],
  'et-kemik-serit-testere': ['serit-testere-rodaj-ve-bakim', 'serit-testere-boyu-nasil-olculur'],
  'sunger-tekstil-serit-testere': ['serit-testere-boyu-nasil-olculur'],
};
