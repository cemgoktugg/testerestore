"""
═══════════════════════════════════════════════════════════════════════════
MAKİNE ARAMA MOTORU
═══════════════════════════════════════════════════════════════════════════
Özellikler:
- Türkçe karakter desteği (ş→s, ı→i, ğ→g)
- Büyük/küçük harf duyarsız
- Boşluk/tire/kesme işareti duyarsız (LPS-T = LPS T = LPST = LPS-T'nin)
- Doğal dil içinden model adı çıkarma ("elimde behringer lps-t var")
- Belirsizlik tespiti: aynı model adını birden çok üretici kullanıyorsa
  ve ölçüleri farklıysa TAHMİN ETMEZ, aday listesi döndürür
- Üretici alias desteği
- Önbellek sistemi

TASARIM NOTU — neden cümlenin tamamı skorlanmıyor:
    Eski sürüm SequenceMatcher'ı kullanıcının TÜM cümlesine karşı
    çalıştırıyordu. Cümleye kelime eklendikçe skor düşüyordu:
        "Behringer LPS-T"                  -> 1.00  ✓
        "Behringer LPS-T'nin bıçak ölçüsü" -> 0.35  ✗ (eşik 0.75)
    Yani soruyu düzgün sormak makineyi kaybettiriyordu; veritabanındaki
    4.516 makine pratikte yalnızca model adı yalın yazılırsa erişilebilirdi
    (bkz. data/unknown_questions.json — cevapsız soruların tamamı bu yüzden).
    Ayrıca uzun cümlelerde alakasız kelimeler yüzünden YANLIŞ makine
    seçilebiliyordu: "elimde behringer lps-t var" -> LPS-TA.

    Yeni sürüm cümlenin tamamını değil, cümle içindeki KAYAN PENCERELERİ
    sözlükte arıyor (uzun pencereden kısaya). Böylece dolgu kelimeleri
    skoru etkilemiyor ve eşleşme ya tamdır ya da yoktur.

TASARIM NOTU — neden belirsizlik ayrı bir durum:
    102 model adı birden çok üretici tarafından paylaşılıyor ve bunların
    61'inde bıçak ölçüleri FARKLI. Örnek "H-1300":
        AMADA     11800 x 67 x 1.6
        EVERISING 12300 x 80 x 1.6
    Eski sürüm bunlardan birini 0.95 skorla sessizce döndürüyordu; yanlış
    olanı seçerse müşteri makinesine takılmayan bıçak sipariş eder.
    Artık böyle durumlarda match yerine "ambiguous" dönüyor ki üst katman
    "hangi üretici?" diye sorabilsin.

TASARIM NOTU — marka alias'ları (data/machine_brand_aliases.json):
    Müşteri markayı duyduğu gibi yazıyor: "Bimak 270" (Beka-Mak),
    "beka makina", "uzay makine". Alias tablosu koddan ayrı bir veri
    dosyasında; kod okunamazsa gömülü asgari listeyle çalışır.
    "Belirsiz" alias'lar (gerçekte var olmayan "Bimak" gibi) tahmindir:
    birden çok markaya bakılır ve tam model kodu yazılmadıkça sonuç asla
    "match" olmaz — aday listesi döner, üst katman sorar.

TASARIM NOTU — kapasite sınıfı ("Kesmak 250"):
    Türk üreticilerinde model numarası çoğunlukla KESME KAPASİTESİDİR
    (KMY 280 = Ø280, BMSY 270DG = Ø270), tek bir makine değil. "Kesmak 250"
    diye bir model yok; KMY 280 (□250 keser), KMM 2DG 260, KMM DG 230 ve
    KDS 250*500*3000'in bıçakları birbirinden farklı. Marka + yalın sayı
    geldiğinde: sayıyı model adında (yapışık yazılmış "270DG" dahil) ya da
    doğrulanmış kapasite alanlarında taşıyan modeller aranır; hepsi aynı
    ölçüdeyse (ör. "uzay 320") sonuç kesindir, değilse komşu kapasite
    sınıflarıyla birlikte aday listesi döner. En yakın model asla "bulundu"
    diye sunulmaz.
═══════════════════════════════════════════════════════════════════════════
"""
import json
import logging
import os
import re
from typing import Optional, Dict, List, Tuple
from collections import defaultdict
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

# Cümle içinde model adı ararken denenecek en uzun pencere (kelime sayısı).
# Veritabanındaki en uzun tam ad 12 kelime:
#   "BOMAR Ergonomic 320.250 GAC F/ GAE-F/ GANC-F/ GAC-F"
# Sınır bunun altında kalırsa uzun adlı makineler tam adıyla hiç
# bulunamaz — ve daha kötüsü, adı onun ÖNEKİ olan daha kısa bir makine
# eşleşir: "BERG & SCHMID GBS 230 Super 60" sorusu 6 kelimelik pencereye
# sığmadığı için "GBS 230 Super"e düşüyordu (ölçüleri farklı).
_MAX_WINDOW = 12

# Üretici belirtilmeden tek başına kabul edilecek en kısa model anahtarı.
# Bunun altındakiler ("25", "15", "320") ayırt edici değil: veritabanında
# saf sayısal 68 model var, "50 mm kesiyorum" gibi cümleler bunlara çarpar.
_MIN_STANDALONE_KEY = 4

# Alias dosyası makine veritabanıyla aynı klasörde aranır.
_ALIAS_FILE_NAME = "machine_brand_aliases.json"

# Alias dosyası okunamazsa kullanılan asgari liste (dosyadan önceki gömülü
# liste). Dosya bunun üzerine eklenir; dosyanın kaybolması eski davranışa
# döndürür, aramayı bozmaz.
_FALLBACK_ALIASES = {
    'UZAY': 'UZAY MAKINA', 'UZAY MAK': 'UZAY MAKINA',
    'BEHRİNGER': 'BEHRINGER', 'BERINGER': 'BEHRINGER',
    'B&S': 'BERG & SCHMID', 'BS': 'BERG & SCHMID',
    'AMADDA': 'AMADA', 'DOALL': 'DoALL',
}

# Kapasite sınıfı olarak yorumlanacak sayı aralığı (mm). Altındakiler
# ("40 mm mil", "H-12") kapasite değil; üstündekiler bıçak boyu olabilir.
_CAPACITY_MIN = 100
_CAPACITY_MAX = 3000

# Sayıdan hemen sonra gelirse sayıyı ÖLÇÜ yapan kelimeler: "300 mm boru"
# makinenin değil malzemenin ölçüsüdür, model numarası sanılmamalı.
# Not: tek harf "M" bilerek yok — "dg metal 250 m" model adının parçası.
_UNIT_TOKENS = {
    'MM', 'CM', 'MT', 'METRE', 'MILIM', 'MILIMETRE', 'SANTIM', 'SANTIMETRE',
    'INC', 'INCH', 'KG', 'TL', 'LIRA', 'ADET',
    'CAP', 'CAPI', 'CAPINDA', 'CAPLI', 'KALINLIK', 'KALINLIGINDA',
}

# Doğrulanmış satırlarda bulunabilen ek alanlar; varsa sonuca aynen taşınır.
_OPTIONAL_FIELDS = (
    'verified', 'verification_status', 'source_url', 'last_checked',
    'capacity_round_mm', 'capacity_square_mm', 'capacity_rect_mm',
    'note', 'conflict',
)

# Komşu kapasite sınıfı toleransı: sayının %10'u, en az 20 mm.
# "Kesmak 250" -> 225–275: KMM DG 230 ve KMM 2DG 260 aday olur.
_NEIGHBOR_RATIO = 0.10
_NEIGHBOR_MIN_MM = 20

# Kapasite numarasının tek bir bıçak ölçüsüne çıktığı kesin sonucun skoru
# (rules_engine/engine.py makine aramasını 0.80 eşikle yapıyor).
_CAPACITY_MATCH_SCORE = 0.9


class AdvancedMachineDatabase:
    """Makine arama motoru — doğal dil içinden model çıkarır."""

    def __init__(self, db_path: str = "data/machines_list.json",
                 aliases_path: Optional[str] = None):
        self.db_path = db_path
        self.data = self._load_database()
        self.cache = {}
        self.is_flat_format = 'machines' in self.data

        # Üretici alias'ları: gömülü asgari liste + data/machine_brand_aliases.json
        self.manufacturer_aliases = dict(_FALLBACK_ALIASES)
        # Belirsiz alias'lar: anahtar -> {'brands': [...], 'note': str}
        self.uncertain_aliases: Dict[str, Dict] = {}
        # Yaygın kelime olan üretici adları (agresif normalize edilmiş)
        self.generic_word_brands: set = set()
        if aliases_path is None:
            aliases_path = os.path.join(
                os.path.dirname(db_path) or '.', _ALIAS_FILE_NAME)
        self.aliases_path = aliases_path
        self._load_aliases(aliases_path)

        self._build_index()

    def _load_database(self) -> dict:
        """Database yükle"""
        with open(self.db_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_aliases(self, path: str) -> None:
        """
        Marka alias dosyasını oku. Hata aramayı durdurmaz: dosya yoksa ya da
        bozuksa gömülü asgari listeyle devam edilir.
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                raw = json.load(f)
        except FileNotFoundError:
            logger.info(f"Marka alias dosyası yok, gömülü liste kullanılıyor: {path}")
            return
        except (OSError, ValueError) as exc:
            logger.warning(f"Marka alias dosyası okunamadı ({path}): {exc}")
            return

        for brand, aliases in (raw.get('brands') or {}).items():
            if brand.startswith('_') or not isinstance(aliases, list):
                continue
            for alias in aliases:
                if isinstance(alias, str) and alias.strip():
                    self.manufacturer_aliases[alias] = brand

        for entry in raw.get('uncertain') or []:
            if not isinstance(entry, dict):
                continue
            brands = [b for b in entry.get('brands') or [] if isinstance(b, str)]
            if not brands:
                continue
            for alias in entry.get('aliases') or []:
                if isinstance(alias, str) and alias.strip():
                    self.uncertain_aliases[alias] = {
                        'brands': brands,
                        'note': entry.get('note'),
                    }

        self.generic_word_brands = {
            self._aggressive_normalize(b)
            for b in raw.get('generic_word_brands') or [] if isinstance(b, str)
        }

    # ------------------------------------------------------------------ #
    # Normalizasyon
    # ------------------------------------------------------------------ #

    def _normalize_text(self, text: str) -> str:
        """
        ULTRA NORMALIZASYON
        - Türkçe → İngilizce (ş→s, ı→i, ğ→g, ü→u, ö→o, ç→c)
        - Büyük harf
        - Özel karakterler → boşluk

        Kesme işareti de ayırıcıdır: Türkçede model adına ek gelir
        ("LPS-T'nin", "CTB-400'ün"). Ayrılmazsa "LPST'NIN" diye tek parça
        kalır ve sözlükte hiçbir zaman bulunmaz.
        """
        if not text:
            return ""

        normalized = text.upper().strip()

        # Türkçe karakterler
        tr_map = {'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C', 'İ': 'I', 'I': 'I'}
        for tr, en in tr_map.items():
            normalized = normalized.replace(tr, en)

        # Özel karakterler → boşluk
        normalized = re.sub(
            r"[-_.,:;/\\()\[\]'\"?!‘’“”]+", ' ', normalized
        )
        normalized = re.sub(r'\s+', ' ', normalized)

        return normalized.strip()

    def _aggressive_normalize(self, text: str) -> str:
        """Süper agresif - tüm boşlukları kaldır"""
        return self._normalize_text(text).replace(' ', '')

    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Benzerlik hesapla (0.0 - 1.0)"""
        return SequenceMatcher(None, str1.upper(), str2.upper()).ratio()

    # ------------------------------------------------------------------ #
    # İndeks — bir kez kurulur, her sorguda 4.516 makineyi taramamak için
    # ------------------------------------------------------------------ #

    def _build_index(self):
        """
        Sözlük indeksleri kur.

        Eski sürüm her sorguda 4.516 makine için 3 ayrı SequenceMatcher
        çalıştırıyordu (~13.500 karşılaştırma). Burada anahtarlar bir kez
        hesaplanıyor; sorgu çoğunlukla O(pencere sayısı) sözlük aramasına
        iniyor.
        """
        self._machines: List[Dict] = (
            self.data.get('machines', []) if self.is_flat_format else []
        )

        self._by_full: Dict[str, List[int]] = defaultdict(list)
        self._by_model: Dict[str, List[int]] = defaultdict(list)
        self._model_tokens: List[set] = []
        self._by_manufacturer: Dict[str, List[int]] = defaultdict(list)
        self._mfr_keys: Dict[str, str] = {}
        # Kapasite sınıfı için: model adındaki sayılar ("BMSY 270DG" -> {270}),
        # ilk sayı (birincil kapasite) ve doğrulanmış kapasite alanları.
        self._model_numbers: List[set] = []
        self._primary_number: List[Optional[int]] = []
        self._capacity_values: List[set] = []

        for idx, machine in enumerate(self._machines):
            mfr = machine.get('manufacturer', '') or ''
            model = machine.get('model', '') or ''

            model_agg = self._aggressive_normalize(model)
            full_agg = self._aggressive_normalize(f"{mfr} {model}")

            self._model_tokens.append(set(self._normalize_text(model).split()))

            numbers = [int(n) for n in re.findall(r'\d+', model)
                       if _CAPACITY_MIN <= int(n) <= 9999]
            self._model_numbers.append(set(numbers))
            self._primary_number.append(numbers[0] if numbers else None)
            self._capacity_values.append(self._capacity_fields(machine))

            if full_agg:
                self._by_full[full_agg].append(idx)
            if model_agg:
                self._by_model[model_agg].append(idx)

            mfr_agg = self._aggressive_normalize(mfr)
            if mfr_agg:
                self._by_manufacturer[mfr_agg].append(idx)
                self._mfr_keys[mfr_agg] = mfr
                # "BERG & SCHMID" -> kullanıcı "berg schmid" yazabilir
                stripped = mfr_agg.replace('&', '')
                if stripped and stripped != mfr_agg:
                    self._mfr_keys[stripped] = mfr

        # Alias'lar yalnızca veritabanında GERÇEKTEN bulunan üreticiye
        # bağlanır; yoksa "X markasını tanıdım" deyip hiç model gösteremeyiz.
        known = set(self._mfr_keys.values())
        for alias, real in self.manufacturer_aliases.items():
            alias_agg = self._aggressive_normalize(alias)
            if not alias_agg:
                continue
            if real not in known:
                logger.warning(f"Alias '{alias}' bilinmeyen üreticiye bağlı: {real}")
                continue
            self._mfr_keys[alias_agg] = real

        # Belirsiz alias'lar gerçek bir üretici adını EZMEZ.
        self._uncertain_keys: Dict[str, Dict] = {}
        for alias, entry in self.uncertain_aliases.items():
            alias_agg = self._aggressive_normalize(alias)
            brands = [b for b in entry['brands'] if b in known]
            if not alias_agg or not brands or alias_agg in self._mfr_keys:
                continue
            self._uncertain_keys[alias_agg] = {'brands': brands,
                                               'note': entry.get('note')}

    @staticmethod
    def _capacity_fields(machine: Dict) -> set:
        """Doğrulanmış kapasite alanlarını (Ø ve □, mm) sayı kümesine çevir."""
        values = set()
        for key in ('capacity_round_mm', 'capacity_square_mm'):
            raw = machine.get(key)
            items = raw if isinstance(raw, list) else [raw]
            for item in items:
                if isinstance(item, (int, float)) and not isinstance(item, bool):
                    values.add(int(item))
        return values

    # ------------------------------------------------------------------ #
    # Pencere üretimi
    # ------------------------------------------------------------------ #

    @staticmethod
    def _windows(tokens: List[str], max_len: int = _MAX_WINDOW):
        """
        Kelime pencerelerini UZUNDAN KISAYA üret.

        Uzundan kısaya olması şart: "BEHRINGER LPS T" penceresi tam ada
        çarpar ve LPS-T döner. Kısadan başlasaydık önce "LPS T" model
        anahtarına çarpardık ve üretici bilgisini boşa harcardık.
        """
        n = len(tokens)
        for size in range(min(max_len, n), 0, -1):
            for i in range(n - size + 1):
                yield i, size, ''.join(tokens[i:i + size])

    def _detect_brand(self, tokens: List[str]) -> Optional[Dict]:
        """
        Cümlede geçen üreticiyi bul.

        Dönüş: {'brands': [üretici, ...], 'start', 'size', 'certain',
        'note', 'weak'} ya da None. 'certain' False ise alias bir tahmindir
        ("Bimak" -> Beka-Mak); 'weak' True ise üretici adı aynı zamanda
        yaygın bir kelimedir ("kamu") ve tek başına marka sayılmaz.
        """
        for i, size, window in self._windows(tokens, max_len=4):
            real = self._mfr_keys.get(window)
            if real:
                return {
                    'brands': [real], 'start': i, 'size': size,
                    'certain': True, 'note': None,
                    'weak': self._aggressive_normalize(real) in self.generic_word_brands,
                }
            guess = self._uncertain_keys.get(window)
            if guess:
                return {
                    'brands': list(guess['brands']), 'start': i, 'size': size,
                    'certain': False, 'note': guess.get('note'), 'weak': False,
                }
        return None

    def _detect_manufacturer(self, tokens: List[str]) -> Tuple[Optional[str], int, int]:
        """Cümlede geçen üreticiyi bul. Dönüş: (üretici, başlangıç, uzunluk)."""
        brand = self._detect_brand(tokens)
        if not brand:
            return None, -1, 0
        return brand['brands'][0], brand['start'], brand['size']

    # ------------------------------------------------------------------ #
    # Sonuç üretimi
    # ------------------------------------------------------------------ #

    def _format_result(self, machine: Dict, score: float = 1.0) -> Dict:
        """Sonucu formatla"""
        fallback_name = f"{machine.get('manufacturer', '')} {machine.get('model', '')}"
        result = {
            'manufacturer': machine.get('manufacturer', 'UNKNOWN'),
            'model': machine.get('model', 'UNKNOWN'),
            'display_name': machine.get('display_name') or fallback_name.strip(),
            'blade_length_mm': machine.get('blade_length_mm'),
            'blade_width_mm': machine.get('blade_width_mm'),
            'blade_thickness_mm': machine.get('blade_thickness_mm'),
            'machine_class': machine.get('machine_class', 'M2'),
            'match_score': round(score, 3),
        }
        # Doğrulama/kaynak/çelişki bilgisi yalnızca satırda varsa eklenir
        for key in _OPTIONAL_FIELDS:
            if key in machine:
                result[key] = machine[key]
        return result

    def _spec(self, idx: int) -> Tuple:
        m = self._machines[idx]
        return (m.get('blade_length_mm'), m.get('blade_width_mm'),
                m.get('blade_thickness_mm'))

    def _common_manufacturer(self, idxs: List[int]) -> Optional[str]:
        """Adayların tek ortak üreticisi; farklı üreticilerdense None."""
        names = {self._machines[i].get('manufacturer') for i in idxs}
        return names.pop() if len(names) == 1 else None

    def _same_manufacturer(self, idxs: List[int], manufacturer) -> List[int]:
        """Adayları cümlede geçen üreticiye/üreticilere daralt (boş dönebilir)."""
        allowed = {manufacturer} if isinstance(manufacturer, str) else set(manufacturer)
        return [i for i in idxs
                if (self._machines[i].get('manufacturer') or '') in allowed]

    @staticmethod
    def _with_extra(result: Dict, match_type: Optional[str] = None,
                    brand_note: Optional[str] = None) -> Dict:
        if match_type:
            result['match_type'] = match_type
        if brand_note:
            result['brand_note'] = brand_note
        return result

    def _resolve(self, idxs: List[int], score: float,
                 manufacturer: Optional[str], allow_match: bool = True,
                 match_type: Optional[str] = None,
                 brand_note: Optional[str] = None) -> Dict:
        """
        Aday listesini nihai sonuca çevir.

        Buraya gelen liste ÜRETİCİYE GÖRE DARALTILMIŞ olmalıdır; burada
        yalnızca ölçü çakışması bakılır. Birden çok aday kaldıysa: ölçüler
        AYNI ise hangisini döndürdüğümüz önemsizdir (LPS-T / LPS-TA gibi),
        FARKLI ise tahmin etmek yanlış bıçak siparişi demektir — belirsiz
        olarak işaretlenir.

        allow_match=False: marka bir tahmindir ("Bimak"); ölçüler aynı olsa
        bile sonuç kesin sayılmaz, aday olarak sorulur.
        """
        specs = {self._spec(i) for i in idxs}

        candidates = [self._format_result(self._machines[i], score) for i in idxs]

        if allow_match and (len(idxs) == 1 or len(specs) == 1):
            return self._with_extra({
                'status': 'match',
                'machine': self._format_result(self._machines[idxs[0]], score),
                'candidates': candidates,
                'manufacturer': manufacturer,
            }, match_type, brand_note)

        return self._with_extra({
            'status': 'ambiguous',
            'machine': None,
            'candidates': candidates,
            'manufacturer': manufacturer,
        }, match_type, brand_note)

    def _none_result(self, manufacturer: Optional[str] = None,
                     brand_note: Optional[str] = None) -> Dict:
        return self._with_extra({'status': 'none', 'machine': None,
                                 'candidates': [], 'manufacturer': manufacturer},
                                None, brand_note)

    # ------------------------------------------------------------------ #
    # Ana arama
    # ------------------------------------------------------------------ #

    def search_detailed(self, query: str, threshold: float = 0.75) -> Dict:
        """
        Ayrıntılı arama.

        Returns:
            {
              'status': 'match' | 'ambiguous' | 'none',
              'machine': Dict | None,      # yalnızca status == 'match'
              'candidates': List[Dict],    # belirsizlikte sorulacak adaylar
              'manufacturer': str | None,  # cümlede tanınan üretici
              # isteğe bağlı:
              'match_type': 'full' | 'model' | 'partial' | 'capacity_class' | 'fuzzy',
              'brand_note': str,           # marka tahmin edildiyse açıklama
            }
        """
        if not query or not query.strip():
            return self._none_result()

        cache_key = f"{self._aggressive_normalize(query)}|{threshold}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = self._search_impl(query, threshold)
        self.cache[cache_key] = result
        return result

    def _search_impl(self, query: str, threshold: float) -> Dict:
        tokens = self._normalize_text(query).split()
        if not tokens:
            return self._none_result()

        brand = self._detect_brand(tokens)
        mfr = brand['brands'][0] if brand else None
        mfr_span = (set(range(brand['start'], brand['start'] + brand['size']))
                    if brand else set())
        note = brand['note'] if brand else None

        # 1) TAM AD — "üretici + model" bitişik geçiyor mu?
        #    En güvenilir sinyal: hem üretici hem model doğrulanmış olur.
        for _, _, window in self._windows(tokens, _MAX_WINDOW):
            idxs = self._by_full.get(window)
            if idxs:
                # Üreticiyi eşleşen kayıttan al, cümleden tanınandan değil:
                # pencere zaten "üretici + model" olduğu için kaydınki kesin,
                # cümlede ise başka bir marka da geçiyor olabilir.
                return self._resolve(
                    idxs, 1.0, self._machines[idxs[0]].get('manufacturer'),
                    match_type='full',
                )

        # 2) YALNIZ MODEL — üreticiye ait pencereleri atlayarak ara.
        for start, size, window in self._windows(tokens, _MAX_WINDOW):
            if brand and not mfr_span.isdisjoint(range(start, start + size)):
                continue  # üretici adını model sanma
            idxs = self._by_model.get(window)
            if not idxs:
                continue
            if brand:
                # Cümlede üretici geçiyorsa model o üreticiye ait OLMALI.
                # Filtreleyip boş kalırsa listesiz devam etmek yanlış makine
                # döndürür: "uzay 320" -> model adı "320" olan BTM makinesi.
                idxs = self._same_manufacturer(idxs, brand['brands'])
                if not idxs:
                    continue
                # Tam model kodu belirsiz markayı da doğrular:
                # "bimak bmsy 270dg" -> yalnız Beka-Mak'ta var.
                return self._resolve(
                    idxs, 0.95, self._common_manufacturer(idxs) or mfr,
                    match_type='model', brand_note=note,
                )
            # Ayırt edici olmayan anahtar (kısa ya da saf sayı) tek başına
            # kabul edilmez; "50 mm" gibi ölçüler modele çarpmasın.
            if len(window) < _MIN_STANDALONE_KEY or window.isdigit():
                continue
            return self._resolve(idxs, 0.95, None, match_type='model')

        # 2b) MARKA ADI MODELİN ÖNEKİ — "KMT 280 OSA" (Karmetal modeli; KMT
        #     aynı zamanda ayrı bir üretici), "BS-250 A" (BS = Berg & Schmid
        #     alias'ı). Pencere marka kelimesini içerip ötesine uzanıyorsa ve
        #     birebir bir model adıysa o makinedir.
        if brand:
            for start, size, window in self._windows(tokens, _MAX_WINDOW):
                rng = set(range(start, start + size))
                if mfr_span.isdisjoint(rng) or rng <= mfr_span:
                    continue
                if len(window) < _MIN_STANDALONE_KEY or window.isdigit():
                    continue
                idxs = self._by_model.get(window)
                if idxs:
                    return self._resolve(
                        idxs, 0.95, self._common_manufacturer(idxs),
                        match_type='model',
                    )

        # 3) ÜRETİCİ + KISMİ MODEL — "kasto 460", "kesmak 250"
        if brand:
            rest = [t for i, t in enumerate(tokens) if i not in mfr_span]
            hit = self._search_within_manufacturer(brand, rest, threshold)
            if hit is not None:
                return hit
            if brand['weak']:
                # "kamu ihalesi..." — marka değil, sıradan kelime
                return self._none_result()
            # Üretici tanındı ama model çözülemedi → üst katman modeli sorabilir
            return self._none_result(mfr, note)

        # 4) KISA SORGU FUZZY — kullanıcı sadece makine adı yazmış ve
        #    yazım hatası yapmış olabilir. Uzun cümlelerde çalıştırmıyoruz:
        #    orada dolgu kelimeleri yanlış eşleşme üretir.
        if len(tokens) <= 3:
            return self._fuzzy_fallback(''.join(tokens), threshold)

        return self._none_result()

    @staticmethod
    def _measure_positions(rest: List[str]) -> set:
        """Ardından birim gelen sayıların konumları ("300 mm boru")."""
        return {j for j, t in enumerate(rest[:-1])
                if t.isdigit() and rest[j + 1] in _UNIT_TOKENS}

    def _search_within_manufacturer(self, manufacturer, rest: List[str],
                                    threshold: float) -> Optional[Dict]:
        """
        Üretici bilindiğinde, cümlenin kalanından modeli çöz.

        Skorlama TOKEN EŞLEŞMESİ üzerinden: kullanıcının yazdığı bir kelime
        model adının bir kelimesine birebir eşitse sayılır. Alt dize
        araması bilerek kullanılmadı — "125" sorgusu "PBA 1250" modelinin
        içinde geçer ve yanlış makineyi getirirdi.

        Kullanıcı modeli değil yalnızca bir SAYI yazdıysa ("kesmak 250")
        kapasite sınıfı aramasına geçilir (bkz. _capacity_class_result).

        manufacturer: üretici adı (str) ya da _detect_brand() sonucu.
        """
        if isinstance(manufacturer, str):
            brand = {'brands': [manufacturer], 'certain': True,
                     'note': None, 'weak': False}
        else:
            brand = manufacturer
        brands = brand['brands']
        primary = brands[0]
        certain = brand['certain']
        note = brand.get('note')

        pool: List[int] = []
        for b in brands:
            pool.extend(self._by_manufacturer.get(self._aggressive_normalize(b), []))
        if not pool or not rest:
            return None

        # "300 mm boru" -> 300 malzeme ölçüsü, model numarası değil
        measures = self._measure_positions(rest)
        usable = [t for j, t in enumerate(rest) if j not in measures]

        # Ayırt edici kelimeler: 3+ karakter ya da rakam içerenler.
        # "ile", "mm", "bir" gibi dolgu kelimeleri model eşleştirmesine girmez.
        probes = {t for t in usable if len(t) >= 3 or any(c.isdigit() for c in t)}
        if not probes:
            return None

        best_score = 0.0
        best: List[int] = []
        numeric_only = True

        for idx in pool:
            matched = probes & self._model_tokens[idx]
            if not matched:
                continue
            # Eşleşen her ek kelime güveni artırır ("pba 460 u au" > "460")
            score = min(0.98, 0.85 + 0.04 * len(matched))
            all_digits = all(t.isdigit() for t in matched)
            if score > best_score:
                best_score, best, numeric_only = score, [idx], all_digits
            elif score == best_score:
                best.append(idx)
                numeric_only = numeric_only and all_digits

        # Kapasite sınıfı adayı olabilecek yalın sayılar
        numbers = [int(t) for t in usable
                   if t.isdigit() and _CAPACITY_MIN <= int(t) <= _CAPACITY_MAX]

        token_hit = bool(best) and best_score >= threshold
        if token_hit and (not numeric_only or not numbers or brand.get('weak')):
            # Harf içeren model kelimesi eşleşti ("pba 460") ya da kapasite
            # yorumu uygulanmıyor: eski token davranışı.
            return self._resolve(best, best_score, primary, allow_match=certain,
                                 match_type='partial', brand_note=note)

        if numbers and not brand.get('weak'):
            hit = self._capacity_class_result(pool, numbers, primary,
                                              certain, note, threshold)
            if hit is not None:
                return hit

        if token_hit:
            return self._resolve(best, best_score, primary, allow_match=certain,
                                 match_type='partial', brand_note=note)
        return None

    def _capacity_class_result(self, pool: List[int], numbers: List[int],
                               manufacturer: str, certain: bool,
                               brand_note: Optional[str],
                               threshold: float = 0.75) -> Optional[Dict]:
        """
        "Marka + sayı" için kapasite sınıfı araması.

        A grubu: sayıyı model adında (yapışık "270DG" dahil) ya da doğrulanmış
            kapasite alanında (KMY 280 -> □250) taşıyan modeller. Birden çok
            sayı yazıldıysa ("300 x 400") en çok sayıyı karşılayanlar kalır.
        B grubu: birincil numarası ilk sayıya yakın (±%10, en az 20 mm) olan
            komşu sınıflar — müşteri numarayı yaklaşık söylemiş ya da eski
            bir model kastediyor olabilir. Yalnızca sorulacaksa eklenir.

        A grubunun hepsi aynı bıçağı kullanıyorsa ve marka kesinse sonuç
        kesindir ("uzay 320"); aksi halde aday listesi döner.
        """
        query_numbers = list(dict.fromkeys(numbers))
        first = query_numbers[0]

        scored = []
        for idx in pool:
            have = self._model_numbers[idx] | self._capacity_values[idx]
            count = sum(1 for n in query_numbers if n in have)
            if count:
                scored.append((count, idx))

        group_a: List[int] = []
        top = 0
        if scored:
            top = max(c for c, _ in scored)
            group_a = [idx for c, idx in scored if c == top]
            # Doğrulanmış kapasite alanı tutanlar önce (KMY 280 -> □250),
            # sonra birincil numarası sayıya eşit olanlar, sonra sayıyı
            # ikincil ölçü olarak taşıyanlar (KDS 250*500*3000 -> 500).
            group_a.sort(key=lambda i: (
                0 if first in self._capacity_values[i] else
                1 if self._primary_number[i] == first else 2,
                pool.index(i),
            ))

        # Kesin sonuç için sayı en az bir adayın ASIL kapasitesi olmalı (ilk
        # numarası ya da doğrulanmış kapasite alanı) veya birden çok sayı
        # tutmalı ("300 x 400"). Sayı yalnızca ikincil ölçüyse ("kesmak 500"
        # -> KDS 250*500*3000) tek aday bile tahmindir, sorulur.
        strong = top >= 2 or any(
            self._primary_number[i] == first or first in self._capacity_values[i]
            for i in group_a)
        if (group_a and certain and strong and _CAPACITY_MATCH_SCORE >= threshold
                and len({self._spec(i) for i in group_a}) == 1):
            return self._resolve(group_a, _CAPACITY_MATCH_SCORE, manufacturer,
                                 match_type='capacity_class')

        tolerance = max(_NEIGHBOR_MIN_MM, round(first * _NEIGHBOR_RATIO))
        in_a = set(group_a)
        group_b = [i for i in pool
                   if i not in in_a and self._primary_number[i] is not None
                   and abs(self._primary_number[i] - first) <= tolerance]
        group_b.sort(key=lambda i: (abs(self._primary_number[i] - first),
                                    pool.index(i)))

        if not group_a and not group_b:
            return None

        candidates = ([self._format_result(self._machines[i], 0.85) for i in group_a]
                      + [self._format_result(self._machines[i], 0.7) for i in group_b])
        return self._with_extra({
            'status': 'ambiguous',
            'machine': None,
            'candidates': candidates,
            'manufacturer': manufacturer,
        }, 'capacity_class', brand_note)

    def _fuzzy_fallback(self, query_agg: str, threshold: float) -> Dict:
        """
        Yazım hatası toleransı — yalnızca kısa sorgular için.

        Aday havuzu ön filtreyle daraltılıyor (ilk karakter + benzer uzunluk),
        yoksa her sorguda 9.000 SequenceMatcher çalışır.
        """
        if len(query_agg) < _MIN_STANDALONE_KEY:
            return self._none_result()

        qlen = len(query_agg)
        first = query_agg[0]
        best_score, best_idxs = 0.0, []

        for table in (self._by_full, self._by_model):
            for key, idxs in table.items():
                if not key or key[0] != first:
                    continue
                if not (qlen * 0.6 <= len(key) <= qlen * 1.6):
                    continue
                score = self._calculate_similarity(query_agg, key)
                if score < threshold or score < best_score:
                    continue
                if score > best_score:
                    best_score, best_idxs = score, list(idxs)
                else:
                    best_idxs.extend(idxs)

        if not best_idxs:
            return self._none_result()

        return self._resolve(list(dict.fromkeys(best_idxs)), best_score, None,
                             match_type='fuzzy')

    def search(self, query: str, threshold: float = 0.75) -> Optional[Dict]:
        """
        Geriye dönük uyumlu arama.

        Belirsiz sonuçlarda bilerek None döner: eskiden burada bir tahmin
        yapılıyordu ve tahmin yanlış olduğunda kullanıcıya makinesine
        uymayan bıçak ölçüsü söyleniyordu. Aday listesine ihtiyaç duyan
        çağıranlar search_detailed() kullanmalı.
        """
        detailed = self.search_detailed(query, threshold)
        return detailed['machine'] if detailed['status'] == 'match' else None

    def search_candidates(self, query: str, limit: int = 5,
                          threshold: float = 0.75) -> List[Dict]:
        """Belirsiz sorgular için aday makine listesi."""
        return self.search_detailed(query, threshold)['candidates'][:limit]

    # ------------------------------------------------------------------ #

    @property
    def machines(self) -> List[Dict]:
        """Düz makine listesi (web/app.py istatistik uçları bunu kullanıyor)."""
        return self._machines

    def get_stats(self) -> Dict:
        """İstatistikler"""
        return {
            'total_machines': self.data.get('total_machines', len(self._machines)),
            'total_manufacturers': len(self._by_manufacturer),
            'cache_size': len(self.cache),
        }

    def clear_cache(self):
        """Önbelleği temizle"""
        self.cache.clear()


# Backward compatibility
class MachineDatabase(AdvancedMachineDatabase):
    """Eski API uyumluluğu için"""

    def search_machine_auto(self, machine_input: str) -> Optional[Dict]:
        """Eski API"""
        return self.search(machine_input)

    def search_machine(self, manufacturer: str, model: str = "") -> Optional[Dict]:
        """
        Eski API.

        model opsiyonel: web/app.py:57 bu metodu tek argümanla ("uzay 320"
        gibi serbest metinle) çağırıyor ve iki zorunlu parametreli eski
        imzada TypeError alıyordu.
        """
        return self.search(f"{manufacturer} {model}".strip())
