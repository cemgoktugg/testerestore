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
═══════════════════════════════════════════════════════════════════════════
"""
import json
import re
from typing import Optional, Dict, List, Tuple
from collections import defaultdict
from difflib import SequenceMatcher

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


class AdvancedMachineDatabase:
    """Makine arama motoru — doğal dil içinden model çıkarır."""

    def __init__(self, db_path: str = "data/machines_list.json"):
        self.db_path = db_path
        self.data = self._load_database()
        self.cache = {}
        self.is_flat_format = 'machines' in self.data

        # Üretici alias'ları
        self.manufacturer_aliases = {
            'UZAY': 'UZAY MAKINA', 'UZAY MAK': 'UZAY MAKINA',
            'BEHRİNGER': 'BEHRINGER', 'BERINGER': 'BEHRINGER',
            'B&S': 'BERG & SCHMID', 'BS': 'BERG & SCHMID',
            'AMADDA': 'AMADA', 'DOALL': 'DoALL',
        }

        self._build_index()

    def _load_database(self) -> dict:
        """Database yükle"""
        with open(self.db_path, 'r', encoding='utf-8') as f:
            return json.load(f)

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

        for idx, machine in enumerate(self._machines):
            mfr = machine.get('manufacturer', '') or ''
            model = machine.get('model', '') or ''

            model_agg = self._aggressive_normalize(model)
            full_agg = self._aggressive_normalize(f"{mfr} {model}")

            self._model_tokens.append(set(self._normalize_text(model).split()))

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

        for alias, real in self.manufacturer_aliases.items():
            alias_agg = self._aggressive_normalize(alias)
            if alias_agg:
                self._mfr_keys[alias_agg] = real

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

    def _detect_manufacturer(self, tokens: List[str]) -> Tuple[Optional[str], int, int]:
        """Cümlede geçen üreticiyi bul. Dönüş: (üretici, başlangıç, uzunluk)."""
        for i, size, window in self._windows(tokens, max_len=4):
            real = self._mfr_keys.get(window)
            if real:
                return real, i, size
        return None, -1, 0

    # ------------------------------------------------------------------ #
    # Sonuç üretimi
    # ------------------------------------------------------------------ #

    def _format_result(self, machine: Dict, score: float = 1.0) -> Dict:
        """Sonucu formatla"""
        fallback_name = f"{machine.get('manufacturer', '')} {machine.get('model', '')}"
        return {
            'manufacturer': machine.get('manufacturer', 'UNKNOWN'),
            'model': machine.get('model', 'UNKNOWN'),
            'display_name': machine.get('display_name') or fallback_name.strip(),
            'blade_length_mm': machine.get('blade_length_mm'),
            'blade_width_mm': machine.get('blade_width_mm'),
            'blade_thickness_mm': machine.get('blade_thickness_mm'),
            'machine_class': machine.get('machine_class', 'M2'),
            'match_score': round(score, 3),
        }

    def _same_manufacturer(self, idxs: List[int], manufacturer: str) -> List[int]:
        """Adayları cümlede geçen üreticiye daralt (boş dönebilir)."""
        return [i for i in idxs
                if (self._machines[i].get('manufacturer') or '') == manufacturer]

    def _resolve(self, idxs: List[int], score: float,
                 manufacturer: Optional[str]) -> Dict:
        """
        Aday listesini nihai sonuca çevir.

        Buraya gelen liste ÜRETİCİYE GÖRE DARALTILMIŞ olmalıdır; burada
        yalnızca ölçü çakışması bakılır. Birden çok aday kaldıysa: ölçüler
        AYNI ise hangisini döndürdüğümüz önemsizdir (LPS-T / LPS-TA gibi),
        FARKLI ise tahmin etmek yanlış bıçak siparişi demektir — belirsiz
        olarak işaretlenir.
        """
        specs = {(
            self._machines[i].get('blade_length_mm'),
            self._machines[i].get('blade_width_mm'),
            self._machines[i].get('blade_thickness_mm'),
        ) for i in idxs}

        candidates = [self._format_result(self._machines[i], score) for i in idxs]

        if len(idxs) == 1 or len(specs) == 1:
            return {
                'status': 'match',
                'machine': self._format_result(self._machines[idxs[0]], score),
                'candidates': candidates,
                'manufacturer': manufacturer,
            }

        return {
            'status': 'ambiguous',
            'machine': None,
            'candidates': candidates,
            'manufacturer': manufacturer,
        }

    @staticmethod
    def _none_result(manufacturer: Optional[str] = None) -> Dict:
        return {'status': 'none', 'machine': None,
                'candidates': [], 'manufacturer': manufacturer}

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

        mfr, mfr_start, mfr_size = self._detect_manufacturer(tokens)
        mfr_span = set(range(mfr_start, mfr_start + mfr_size)) if mfr else set()

        # 1) TAM AD — "üretici + model" bitişik geçiyor mu?
        #    En güvenilir sinyal: hem üretici hem model doğrulanmış olur.
        for _, _, window in self._windows(tokens, _MAX_WINDOW):
            idxs = self._by_full.get(window)
            if idxs:
                # Üreticiyi eşleşen kayıttan al, cümleden tanınandan değil:
                # pencere zaten "üretici + model" olduğu için kaydınki kesin,
                # cümlede ise başka bir marka da geçiyor olabilir.
                return self._resolve(
                    idxs, 1.0, self._machines[idxs[0]].get('manufacturer')
                )

        # 2) YALNIZ MODEL — üreticiye ait pencereleri atlayarak ara.
        for start, size, window in self._windows(tokens, _MAX_WINDOW):
            if mfr and not mfr_span.isdisjoint(range(start, start + size)):
                continue  # üretici adını model sanma
            idxs = self._by_model.get(window)
            if not idxs:
                continue
            if mfr:
                # Cümlede üretici geçiyorsa model o üreticiye ait OLMALI.
                # Filtreleyip boş kalırsa listesiz devam etmek yanlış makine
                # döndürür: "uzay 320" -> model adı "320" olan BTM makinesi.
                idxs = self._same_manufacturer(idxs, mfr)
                if not idxs:
                    continue
            # Ayırt edici olmayan anahtar (kısa ya da saf sayı) tek başına
            # kabul edilmez; "50 mm" gibi ölçüler modele çarpmasın.
            elif len(window) < _MIN_STANDALONE_KEY or window.isdigit():
                continue
            return self._resolve(idxs, 0.95, mfr)

        # 3) ÜRETİCİ + KISMİ MODEL — "kasto 460"
        if mfr:
            rest = [t for i, t in enumerate(tokens) if i not in mfr_span]
            hit = self._search_within_manufacturer(mfr, rest, threshold)
            if hit is not None:
                return hit
            # Üretici tanındı ama model çözülemedi → üst katman modeli sorabilir
            return self._none_result(mfr)

        # 4) KISA SORGU FUZZY — kullanıcı sadece makine adı yazmış ve
        #    yazım hatası yapmış olabilir. Uzun cümlelerde çalıştırmıyoruz:
        #    orada dolgu kelimeleri yanlış eşleşme üretir.
        if len(tokens) <= 3:
            return self._fuzzy_fallback(''.join(tokens), threshold)

        return self._none_result()

    def _search_within_manufacturer(self, manufacturer: str, rest: List[str],
                                    threshold: float) -> Optional[Dict]:
        """
        Üretici bilindiğinde, cümlenin kalanından modeli çöz.

        Skorlama TOKEN EŞLEŞMESİ üzerinden: kullanıcının yazdığı bir kelime
        model adının bir kelimesine birebir eşitse sayılır. Alt dize
        araması bilerek kullanılmadı — "125" sorgusu "PBA 1250" modelinin
        içinde geçer ve yanlış makineyi getirirdi.
        """
        pool = self._by_manufacturer.get(self._aggressive_normalize(manufacturer), [])
        if not pool or not rest:
            return None

        # Ayırt edici kelimeler: 3+ karakter ya da rakam içerenler.
        # "ile", "mm", "bir" gibi dolgu kelimeleri model eşleştirmesine girmez.
        probes = {t for t in rest if len(t) >= 3 or any(c.isdigit() for c in t)}
        if not probes:
            return None

        best_score = 0.0
        best: List[int] = []

        for idx in pool:
            matched = probes & self._model_tokens[idx]
            if not matched:
                continue
            # Eşleşen her ek kelime güveni artırır ("pba 460 u au" > "460")
            score = min(0.98, 0.85 + 0.04 * len(matched))
            if score > best_score:
                best_score, best = score, [idx]
            elif score == best_score:
                best.append(idx)

        if not best or best_score < threshold:
            return None

        return self._resolve(best, best_score, manufacturer)

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

        return self._resolve(list(dict.fromkeys(best_idxs)), best_score, None)

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
