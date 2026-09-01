# -*- coding: utf-8 -*-
"""
Malzeme kalitesi normalizasyonu.

Kesim tablosu AISI/SAE gösterimini kullanıyor ("301-305", "4140",
"Inconel 625, 718"). Türkiye'de kullanıcılar aynı malzemeyi çoğunlukla
EN/DIN gösterimiyle yazar ("1.4301", "X5CrNi18-10", "S235"). Bu modül
ikisi arasında köprü kurar.

Neden ayrı modül: eşleştirme kuralları veriden değil standartlardan
geliyor; ansiklopedide alias tablosu yok. Burada tutulursa hem test
edilebilir hem de yeni kaynak geldiğinde tek yerden büyütülebilir.

ÖNEMLİ: "çelik", "paslanmaz", "alüminyum" gibi AİLE adları kalite
DEĞİLDİR. Bunlar sayısal hız/Q vermeye yetmez; RequiredInputValidator
kaliteyi ayrıca sorar (REQ-001, REQ-003).
"""
from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Optional, Tuple

# --------------------------------------------------------------------- #
# EN/DIN -> AISI/SAE karşılıkları
#
# Yalnızca standart, tartışmasız denklikler. Her satır "malzeme numarası
# veya EN adı" -> "kesim tablosundaki AISI gösterimi".
# --------------------------------------------------------------------- #
_EN_TO_AISI: Dict[str, str] = {
    # Östenitik paslanmaz
    "1.4301": "304", "X5CRNI18-10": "304", "X5CRNI1810": "304",
    "1.4307": "304", "X2CRNI18-9": "304",
    "1.4306": "304", "X2CRNI19-11": "304",
    "1.4541": "321", "X6CRNITI18-10": "321",
    "1.4401": "316", "X5CRNIMO17-12-2": "316",
    "1.4404": "316", "X2CRNIMO17-12-2": "316",
    "1.4571": "316", "X6CRNIMOTI17-12-2": "316",
    "1.4845": "310", "X8CRNI25-21": "310",
    "1.4833": "309",
    # Ferritik / martenzitik paslanmaz
    "1.4016": "430", "X6CR17": "430",
    "1.4021": "420", "X20CR13": "420",
    "1.4006": "410", "X12CR13": "410",
    "1.4005": "416",
    "1.4057": "431",
    "1.4112": "440", "1.4125": "440",
    # Çökelme sertleşmeli
    "1.4542": "17-4PH", "X5CRNICUNB16-4": "17-4PH",
    "1.4568": "17-7PH",
    # Yapı ve karbon çelikleri
    "1.0038": "A36", "S235": "A36", "S235JR": "A36", "ST37": "A36",
    "1.0570": "A36", "S355": "A36", "S355J2": "A36", "ST52": "A36",
    "1.0503": "1045", "C45": "1045", "CK45": "1045", "1.1191": "1045",
    "1.0402": "1020", "C22": "1020",
    "1.1221": "1050", "CK50": "1050",
    "1.0601": "1060", "C60": "1060",
    # Alaşımlı yapı çelikleri
    "1.7225": "4140", "42CRMO4": "4140", "42CRMOS4": "4140",
    "1.6582": "4340", "34CRNIMO6": "4340",
    "1.7218": "4130", "25CRMO4": "4130",
    "1.7131": "5115", "16MNCR5": "5115",
    "1.7147": "5120", "20MNCR5": "5120",
    "1.6511": "4340", "36CRNIMO4": "4340",
    # Takım çelikleri
    "1.2379": "D2", "X153CRMOV12": "D2",
    "1.2080": "D3", "X210CR12": "D3",
    "1.2842": "O2", "90MNCRV8": "O2",
    "1.2510": "O1", "100MNCRW4": "O1",
    "1.2344": "H13", "X40CRMOV5-1": "H13",
    "1.2343": "H11", "X38CRMOV5-1": "H11",
    "1.2312": "P20", "40CRMNMOS8-6": "P20",
    "1.2311": "P20", "40CRMNMO7": "P20",
    # Yüksek hız çelikleri
    "1.3343": "M2", "HS6-5-2": "M2",
    "1.3243": "M35", "HS6-5-2-5": "M35",
    # Alüminyum (EN AW gösterimi)
    "ENAW-6060": "6061", "ENAW-6082": "6061", "6082": "6061",
    "ENAW-2007": "2024", "ENAW-2024": "2024",
    "ENAW-5754": "5052", "ENAW-5083": "5052",
    "ENAW-7075": "7075",
    "ENAW-1050": "1200", "1050": "1200", "1060A": "1200",
}

# YAKLAŞIK eşdeğerler — farklı standartlara ait, aynı sınıf malzemeler.
#
# Yukarıdaki eşlemelerin çoğu TAM denkliktir: 1.4301 ile AISI 304 aynı
# çeliğin iki gösterimidir. Ancak bazıları mühendislik yakınsamasıdır:
# S235 (EN 10025) ile A36 (ASTM) aynı çelik DEĞİL, benzer sınıf yapı
# çelikleridir; akma dayanımı ve kimyasal aralıkları farklıdır.
#
# Bu eşlemeler tek başına KESİN sayısal değerin dayanağı olamaz; kullanan
# katman güveni düşürür ve varsayımı açıkça yazar.
APPROXIMATE_EQUIVALENTS = {
    "S235", "S235JR", "ST37", "1.0038",
    "S355", "S355J2", "ST52", "1.0570",
    "6082", "ENAW-6082", "ENAW-6060",
    "ENAW-5754", "ENAW-5083",
    "ENAW-1050", "1050", "1060A",
    "ENAW-2007",
}

# Kullanıcı bunları yazdığında kalite BELİRTMEMİŞ sayılır; aile adıdır.
_FAMILY_ONLY_WORDS = {
    "celik", "steel", "paslanmaz", "stainless", "inox", "aluminyum",
    "aluminium", "aluminum", "aluminyumu", "demir", "iron", "metal",
    "dokme", "dokum", "cast", "bakir", "copper", "pirinc", "brass",
    "bronz", "bronze", "titanyum", "titanium", "nikel", "nickel",
    "takim", "aliminyum", "krom", "aleaj", "alasim",
}

# Aile adı -> kesim tablosundaki family_tr önekleri (kalite sorulurken
# kullanıcıya doğru örnek verebilmek için).
FAMILY_HINTS: Dict[str, str] = {
    "paslanmaz": "304, 316, 430 gibi tam kalite",
    "celik": "S235, 1.0038, C45, 4140 gibi tam kalite",
    "aluminyum": "6061, 5052, 7075 gibi tam alaşım",
    "dokme": "GG20, GG25 gibi tam kalite",
    "bakir": "alaşım adı (ör. CuZn37, fosfor bronzu)",
    "titanyum": "Ti-6Al-4V gibi tam alaşım",
    "nikel": "Inconel 718, Monel 400 gibi tam alaşım",
}


# Çap sembolleri. ASCII'ye indirgeme bunları SESSİZCE SİLER (Ø'nun unicode
# ayrışımı yok), böylece "Ø100" düpedüz "100" olur ve çap bilgisi kaybolur.
# Silinmeden önce okunabilir bir anahtara çevriliyor.
_DIAMETER_SYMBOLS = ("Ø", "ø", "⌀", "φ", "Φ", "ϕ", "∅")


def strip_accents(text: str) -> str:
    """Türkçe harfleri ASCII'ye indir (arama ve karşılaştırma için)."""
    text = text or ""
    for symbol in _DIAMETER_SYMBOLS:
        text = text.replace(symbol, " cap ")
    text = text.replace("ı", "i").replace("İ", "I")
    text = text.replace("ğ", "g").replace("Ğ", "G")
    text = text.replace("ş", "s").replace("Ş", "S")
    text = text.replace("ç", "c").replace("Ç", "C")
    text = text.replace("ö", "o").replace("Ö", "O")
    text = text.replace("ü", "u").replace("Ü", "U")
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()


def _key(text: str) -> str:
    """Karşılaştırma anahtarı: büyük harf, boşluk/nokta dışı sadeleştirme."""
    return re.sub(r"[\s]+", "", strip_accents(text).upper())


class MaterialResolver:
    """Serbest metinden malzeme kalitesi çıkarır ve tabloya bağlar."""

    def __init__(self, knowledge_base):
        self.kb = knowledge_base
        # Tablodaki tüm kaliteler (aralıklar açılmış hâlde)
        self._known_grades = set(knowledge_base.conditions_by_grade)
        # Alias tablosunu tekil anahtarlara indir
        self._alias = {_key(k): v for k, v in _EN_TO_AISI.items()}

    # ------------------------------------------------------------------ #

    # Kullanıcılar standart önekini kaliteye bitişik yazabiliyor:
    # "aisi304", "SAE1045", "W.Nr1.4301". Önek ayıklanmazsa eşleşme kaçar.
    _STANDARD_PREFIXES = ("AISI", "SAE", "ASTM", "UNS", "EN", "DIN", "WNR", "W.NR")

    def normalize_token(self, token: str) -> Optional[str]:
        """Tek bir kelimeyi tablo kalitesine çevir; yoksa None."""
        key = _key(token)
        if not key:
            return None

        candidates = [key]
        for prefix in self._STANDARD_PREFIXES:
            if key.startswith(prefix) and len(key) > len(prefix):
                candidates.append(key[len(prefix):].lstrip(".-"))

        for candidate in candidates:
            if candidate in self._alias:
                return self._alias[candidate]
            # "1.4301" gibi nokta içeren malzeme numaraları
            if candidate in self._known_grades:
                return candidate
        return None

    def extract(self, text: str) -> Tuple[Optional[str], List[str]]:
        """
        Metinden malzeme kalitesini çıkar.

        Returns:
            (normalize_edilmis_kalite | None, uyari/varsayim_listesi)
        """
        notes: List[str] = []
        if not text:
            return None, notes

        raw = strip_accents(text)

        # 1) Marka/alaşım adları çok kelimeli olabilir (Inconel 718, Monel K500,
        #    17-4PH). Tablodaki kaliteleri doğrudan metinde ara.
        upper = raw.upper()
        multi_word = [g for g in self._known_grades
                      if len(g) >= 4 and not g.isdigit() and g in upper]
        if multi_word:
            # En uzun eşleşme en özgüldür ("INCONEL 718" > "718")
            best = max(multi_word, key=len)
            return best, notes

        # 2) Kelime kelime tara. Sayısal kaliteler ("304", "4140", "6061")
        #    ölçülerle karışabilir; bu yüzden ölçü bağlamı olanları eleriz.
        tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9.\-]*", raw)
        for idx, token in enumerate(tokens):
            grade = self.normalize_token(token)
            if not grade:
                continue
            if self._looks_like_dimension(tokens, idx):
                continue
            key = _key(token)
            if key in self._alias:
                if key in APPROXIMATE_EQUIVALENTS:
                    # Tam denklik değil — kullanıcı bunu bilmeli.
                    notes.append(
                        f"{token} kesim tablosunda doğrudan yok; benzer sınıf "
                        f"{grade} satırı kullanıldı. Bu bir MÜHENDİSLİK "
                        "YAKINSAMASIDIR (farklı standartlar, farklı akma "
                        "dayanımı aralıkları), tam eşdeğerlik değildir."
                    )
                else:
                    notes.append(f"{token} → AISI {grade} olarak eşleştirildi.")
            return grade, notes

        return None, notes

    @staticmethod
    def _looks_like_dimension(tokens: List[str], idx: int) -> bool:
        """
        Sayı bir ölçü mü, kalite mi?

        "Ø100 dolu" içindeki 100 kalite değildir; "AISI 304" içindeki 304
        kalitedir. Komşu kelimelere ve ekli birimlere bakarak ayırt eder.
        """
        token = tokens[idx]
        prev = tokens[idx - 1].lower() if idx > 0 else ""
        nxt = tokens[idx + 1].lower() if idx + 1 < len(tokens) else ""

        # Ölçü ipuçlarını yön'e göre ayır. Tek bir kümede tutulursa
        # "1.4301, Ø100" ifadesinde kalite, kendisinden SONRA gelen "cap"
        # yüzünden ölçü sanılır — oysa "cap" sayının ÖNÜNE gelir.
        unit_suffixes = {"mm", "cm", "hb", "hrc", "hv", "m", "dak"}
        dimension_prefixes = {
            "cap", "capi", "capinda", "olcu", "kalinlik", "kalinliginda",
            "genislik", "yukseklik", "boy", "uzunluk", "et", "cidar",
        }
        if nxt in unit_suffixes or prev in dimension_prefixes:
            return True
        # "Ø100", "100x50x5", "3660x27x0.90".
        # 'x' yalnızca RAKAM ARASINDA ölçü ayırıcısıdır. Düz "x içeriyor mu"
        # kontrolü malzeme adlarını yutuyordu: X5CrNi18-10, X20Cr13, X153...
        if re.search(r"\d\s*[xX*]\s*\d", token) or "ø" in token.lower():
            return True
        return False

    # ------------------------------------------------------------------ #

    def is_approximate(self, text: str) -> bool:
        """
        Metindeki kalite YAKLAŞIK bir eşdeğerle mi çözüldü?

        S235 gibi kaliteler kesim tablosunda doğrudan bulunmadığı için
        benzer sınıf bir satıra bağlanıyor. Bu bilgi kaybolursa sistem
        yaklaşık bir eşlemeye dayanan sayıyı "yüksek güven" diye sunar.
        """
        for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9.\-]*", strip_accents(text or "")):
            if _key(token) in APPROXIMATE_EQUIVALENTS:
                return True
        return False

    def family_only_mention(self, text: str) -> Optional[str]:
        """
        Kullanıcı yalnızca aile adı mı yazdı? ("paslanmaz keseceğim")

        Returns: aile anahtarı ya da None.
        """
        words = set(re.findall(r"[a-z]+", strip_accents(text).lower()))
        hit = words & _FAMILY_ONLY_WORDS
        if not hit:
            return None
        for key in ("paslanmaz", "aluminyum", "aliminyum", "celik",
                    "dokme", "dokum", "bakir", "titanyum", "nikel"):
            if key in hit:
                return {"aliminyum": "aluminyum", "dokum": "dokme"}.get(key, key)
        return next(iter(hit))

    def conditions_for(self, grade: str,
                       hardness: Optional[float] = None,
                       hardness_unit: Optional[str] = None) -> List[Dict]:
        """
        Kaliteye ait kesim koşulu kayıtlarını getir.

        Sertlik verilmişse en yakın sertlikteki kayıt öne alınır. Sertlik
        verilmemiş ve birden çok kayıt varsa liste olduğu gibi döner ki
        çağıran "belirsiz, sertlik sor" diyebilsin.
        """
        records = list(self.kb.conditions_by_grade.get(grade, []))
        if not records:
            return []
        if hardness is None or len(records) == 1:
            return records
        unit = (hardness_unit or "HB").upper()
        same_unit = [r for r in records
                     if (r.get("hardness_unit") or "HB").upper() == unit]
        pool = same_unit or records
        pool.sort(key=lambda r: abs(float(r.get("hardness_value", 0)) - hardness))
        return pool

    def requires_condition(self, grade: str, records: List[Dict]) -> bool:
        """
        Bu kalite için sertlik/kondisyon ayrıca sorulmalı mı?

        Takım çelikleri tablodaki tavlanmış değerle listelenir ama sahada
        sertleştirilmiş (45+ HRC) hâlde kesilir; bu durumda bimetal yerine
        karbür gerekir. Kondisyon sorulmazsa yanlış ürün önerilir
        (HARD-001). Aynı kalite birden çok sertlikte listelenmişse de
        ayrım şart.
        """
        if len(records) > 1:
            return True
        return any("takım çeliği" in (r.get("family_tr", "").lower())
                   for r in records)
