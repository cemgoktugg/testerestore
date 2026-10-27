"""
Danışmanın ÖN MASASI — kural motoru hunisinden ÖNCE çalışan, LLM'siz katman.

Sorun: her mesaj doğrudan "Ne keseceksiniz?" hunisine giriyordu. Müşteri
"kargo ne kadar?", "27×0,9 2750 mm kaç para?", "1638 mm hazır var mı?",
"bıçağım çabuk köreliyor" diye sorduğunda cevap yerine anket sorusu
alıyordu; konu dışı ve ahşap sorularına anlamsız hazır cümle dönüyordu.

Bu katman önce müşterinin SORDUĞUNU cevaplar:
  - mağaza soruları (kargo, iade/cayma, ödeme, fatura, iletişim)
  - fiyat (sitenin fiyat hesaplayıcısıyla) ve hazır stok (gerçek ürün listesi)
  - arıza teşhisi (data/troubleshooting_tr.json kalıpları, önce en olası neden)
  - ahşap / et-kemik / sünger-tekstil yönlendirmesi (metal hunisi bunları
    karşılamıyor)
  - konu dışı sorular
Ürün seçimi gerekiyorsa mevcut huni (DialogManager) aynen devam eder.

Kurallar (kullanıcı kararları, 2026-10-26):
  - Kimlik "TestereStore asistanı"; yalnızca BİZİM katalogdaki ürün adları.
  - Teslim süresi VERİLMEZ ("en kısa sürede kargoya verilir").
  - Sayılar uydurulmaz: fiyat backend'den, stok ürün listesinden, kargo
    kuralı mağazanın tek kaynağından (storefront lib/shipping.ts ile aynı),
    boy sınırları ürün metadata'sından (min/max_length_mm).
  - Hitap "siz".

Kalıp notları (2026-10-27 kapsama ölçümü, 700 müşteri mesajı):
  - Sade metinde Türkçe harf yok (ç→c ğ→g ı→i ö→o ş→s ü→u); "bıçağım" → "bicag".
  - Alt dize tuzakları: "parke" ⊂ "yaparken", "alistir" ⊂ "calistir",
    "hazir" ⊂ "hazirlaniyor", "gonderi" ⊂ "gonderir misiniz", "et" fiili
    ("tavsiye et") ve profil cidarı ("2 mm et") et-kemik DEĞİL.
  - Boy ayrıştırması model numarası (Kesmak 350, LB1200F), malzeme kodu
    (AISI 304, 6082 alüminyum, 1.2379), cm ve "3 metre 66" biçimlerini tanır.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from llm import knowledge
from llm.kb import KnowledgeBase, default_kb
from llm.store_client import StoreClient

SITE_URL = os.environ.get("ADVISOR_SITE_URL", "https://testerestore.com").rstrip("/")

# Mağaza kargo kuralı — storefront lib/shipping.ts ve Medusa fiyat kuralı ile aynı.
FREE_SHIPPING_THRESHOLD_INCL_VAT = 2000
STANDARD_SHIPPING_FEE = 79.9   # KDV DAHİL (kullanıcı kararı 2026-10-27)
KDV_RATE = 0.20

# Ölçüye göre üretimde boy sınırları (mm) — ürün metadata min/max_length_mm,
# sunucuda zorlanır (catalog_store 2026-10-27). Fiyat API'si genel olarak
# 1.000–15.000 mm kabul eder; aile sınırları daha dar olabilir.
GLOBAL_MIN_LENGTH, GLOBAL_MAX_LENGTH = 1000, 15000
LENGTH_LIMITS: Dict[str, Tuple[int, int]] = {
    "bi-metal": (1000, 15000),     # Bi-Metal M42 Premium
    "carbide": (1500, 12000),
    "woodcut": (1000, 8000),
    "meat-bone": (1500, 6000),
    "textile": (1000, 8000),
}
M51_LENGTH_LIMITS = (1500, 15000)  # Bi-Metal M51 Endüstriyel (aynı bi-metal fiyat matrisi)

# Adet kademesi indirimi — backend lib/blade-line.ts qtyDiscountPercent ile aynı.
_QTY_TIERS = ((10, 15), (5, 10), (3, 5))

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# --------------------------------------------------------------------------- #
# Yardımcılar
# --------------------------------------------------------------------------- #

_TR = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiuCGIOSUAIU")


def norm(text: str) -> str:
    """Küçük harf + Türkçe harfler sade + tek boşluk (eşleştirme için)."""
    return re.sub(r"\s+", " ", (text or "").translate(_TR).lower()).strip()


def tl(amount: float) -> str:
    """1175 → "1.175,00 TL"."""
    s = f"{amount:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return f"{s} TL"


def mm(value: float) -> str:
    """0.9 → "0,9", 27.0 → "27"."""
    return (str(int(value)) if float(value).is_integer() else str(value)).replace(".", ",")


def _th(value: int) -> str:
    """1500 → "1.500"."""
    return f"{int(value):,}".replace(",", ".")


def link(label: str, path: str) -> str:
    return f"[{label}]({SITE_URL}{path})"


def _any(pattern: str, text: str) -> bool:
    return re.search(pattern, text) is not None


def qty_discount_percent(quantity: int) -> int:
    for min_qty, pct in _QTY_TIERS:
        if quantity >= min_qty:
            return pct
    return 0


# --------------------------------------------------------------------------- #
# Katalog (YALNIZCA bizim ürünlerimiz)
# --------------------------------------------------------------------------- #

FAMILIES: Dict[str, Dict[str, Any]] = {
    "bi-metal": {
        "label": "Bi-Metal (M42 Premium / M51 Endüstriyel)",
        "links": [("Bi-Metal M42 Premium", "/products/bimetal-premium"),
                  ("Bi-Metal M51 Endüstriyel", "/products/bimetal-m51")],
    },
    "carbide": {"label": "Karbür Uçlu (TCT)",
                "links": [("Karbür Uçlu Şerit Testere", "/products/carbide-ultimate")]},
    "woodcut": {"label": "Ahşap Kesim",
                "links": [("Ahşap Kesim Şerit Testere", "/products/woodcut-classic")]},
    "meat-bone": {"label": "Et ve Kemik (paslanmaz)",
                  "links": [("Hijyenik Et-Kemik Şerit Testere", "/products/hijyenik-et-kemik-pro")]},
    "textile": {"label": "Sünger ve Tekstil",
                "links": [("Sünger-Tekstil Şerit Testere", "/products/sunger-tekstil-pro")]},
}
# Boy sınırı mesajlarında ürün adı
_PRODUCT_NAME = {"bi-metal": "Bi-Metal M42 Premium", "carbide": "Karbür Uçlu", "woodcut": "Ahşap Kesim",
                 "meat-bone": "Hijyenik Et-Kemik", "textile": "Sünger-Tekstil"}

# "et" = fiil ("tavsiye et", "yardım eder misiniz") veya profil cidarı ("2 mm et",
# "et kalınlığı", "kalın et") — aile tespitinden ÖNCE metinden çıkarılır.
_ET_NOISE = re.compile(
    r"\b(?:tavsiye|yardim|kontrol|rica|dikkat|teklif|tercih|takip|devam|kabul|iptal|ikna|oner\w*|memnun|"
    r"test|tespit|tahmin|hesap|sikayet|emin|israr|ifade|elde|terk|kayit|ihmal|merak|tamir|teslim|ziyaret|"
    r"mudahale|organize|islem|kontak|yardimci)\s*(?:et|eder|ederim|edin|ediniz|eder misiniz|etsem|etmek|"
    r"etmeli\w*|ettim|etti|ediyor\w*)\b"
    r"|(?<![\w])\d+(?:[.,]\d+)?\s*(?:mm\s*)?(?:et|eti|etli)\b|\bet\s*(?:kalinli\w*|kalin\w*|cidar\w*)"
    r"|\b(?:profil|boru|kutu)\w*\s*eti\w*\b|\bet\s*\d|\bkalin\s*et\w*")

_FAMILY_PATTERNS: List[Tuple[str, str]] = [
    ("carbide", r"karbur(?!\s*tutucu)\w*|karbit\w*|\btct\b|carbide|\b[vw][iy]d[iy]a\w*|hartmetall\w*"),
    ("bi-metal", r"\bbi\s?-?\s?metal\w*|\bbimetal\w*|\bm\s?-?\s?42\b|\bm\s?x?\s?-?\s?51\b|\bhss\b|kobaltl\w*"),
    ("woodcut", r"ahsap\w*|kereste\w*|tomruk\w*|marangoz\w*|\bmdf\b|\bsunta\w*|kontrplak\w*|\bagac\w*|"
                r"\bodun\w*|\bkutuk(?!\s*celi)\w*|mobilya\w*|\bparke\w*|\bpalet\w*|\bkalas\w*|\bhizar\w*|"
                r"\bbicki\w*|\bresaw\b|\bwood\w*|\bholz\w*|\btakoz\w*"),
    # Çıplak "et" kalıbı YOK: yalnız et-kemik bağlamı (et kesimi, kasap, donuk et…)
    ("meat-bone", r"et\s*-?\s*kemik|\bkemik\w*|\bkasap\w*|donuk\s*et\w*|dondurulmus\w*|"
                  r"donmus\s*(?:et|balik|tavuk|gida)\w*|\bbalik(?!esir)\w*|\btavuk\w*|\bhijyenik\w*|\bgida\w*|"
                  r"\bet\s*(?:kesim|kesme|kesmek|kesiyor|keser|bica[kg]|testere|serit|makine|reyon|urun|"
                  r"isleme|parcala|dilimle)\w*|\b(?:kirmizi|beyaz|kiyma|dana|kuzu|kemikli|cig)\s*et\b|"
                  r"\betler\w*|\beti\s*kes\w*"),
    ("textile", r"sunger\w*|(?<!baglanti )\bkopuk(?!\s*geli)\w*|strafor\w*|\beps\b|tekstil\w*|kumas\w*|"
                # "dişsiz" tek başına değil: deri/halı için bu ürünü önermeyelim
                r"\bkece\w*|yalitim\w*|dalgali\s*(?:agiz\w*|bica[kg]\w*)"),
]


def detect_family(n: str) -> Optional[str]:
    s = _ET_NOISE.sub(" ", n)
    for fam, pat in _FAMILY_PATTERNS:
        if _any(pat, s):
            return fam
    return None


def _wants_m51(n: str) -> bool:
    return _any(r"\bm\s?x?\s?-?\s?51\b", n) and not _any(r"\bm\s?-?\s?42\b", n)


# --------------------------------------------------------------------------- #
# Ölçü ayrıştırma
# --------------------------------------------------------------------------- #

_NUM = r"\d+(?:[.,]\d+)?"
# Bıçak genişliği/kalınlığı olarak kabul edilen değerler (fiyat ağacı + yaygın ölçüler);
# ayırıcısız yazımlarda ("27 0.9", "2750lik 27 0,9") yalnız bunlar ölçü sayılır.
_W_KNOWN = {6, 8, 10, 13, 16, 19, 20, 25, 27, 32, 34, 40, 41, 54, 67, 80}
_T_KNOWN = {0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.6}

# Makine etiketi: boy × genişlik × kalınlık ("2720x27x0,9", "3660 x 34 x 1,1")
_TRIPLE_LWT = re.compile(r"(?<![\d.,])(\d{3,5})\s*(?:mm)?\s*[x×*]\s*(\d{1,2}(?:[.,]\d)?)\s*(?:mm)?\s*[x×*]\s*"
                         r"(\d(?:[.,]\d{1,2})?)(?!\d)")
# genişlik × kalınlık × boy ("27x0,9x2750")
_TRIPLE_WTL = re.compile(r"(?<![\d.,])(\d{1,2}(?:[.,]\d)?)\s*[x×*]\s*([01][.,]\d{1,2})\s*[x×*]\s*(\d{3,5})(?![\d])")
# "27/0.9", "27 ye 0.9", "27'ye 0,9", "34 e 1.1" — ikinci sayı ondalık kalınlık (4/6 TPI değil)
_WT_SLASH = re.compile(r"(?<![\d.,/])(\d{1,2})\s*(?:/|'?\s*y?e\s)\s*([01][.,]\d{1,2})(?![\d/])")
# "27 0.9", "27 lik 0.9 luk" — yalnız bilinen genişlik + kalınlık
_WT_SPACE = re.compile(r"(?<![\d.,/x×*])\b(\d{1,2})\s*'?\s*(?:l[iu]k|lu|li|mm)?\s+([01][.,]\d{1,2})\b(?!\s*[x×*/])")
# "27x09" — ondalık ayırıcı unutulmuş; tahmin edilmez, teyit istenir
_WT_AMBIG = re.compile(r"(?<![\d.,])(\d{1,2})\s*[x×*]\s*(0\d|1[0-6])(?![\d.,])")


def _f(s: str) -> float:
    return float(s.replace(",", "."))


def _valid_wt(w: float, t: float) -> bool:
    return 3 <= w <= 80 and 0.3 <= t <= 2.0


def _parse_triple(n: str) -> Optional[Tuple[float, float, int]]:
    for m in _TRIPLE_LWT.finditer(n):
        L, w, t = int(m.group(1)), _f(m.group(2)), _f(m.group(3))
        if 300 <= L <= 20000 and _valid_wt(w, t):
            return (w, t, L)
    for m in _TRIPLE_WTL.finditer(n):
        w, t, L = _f(m.group(1)), _f(m.group(2)), int(m.group(3))
        if 300 <= L <= 20000 and _valid_wt(w, t):
            return (w, t, L)
    return None


def parse_width_thickness(n: str) -> Optional[Tuple[float, float]]:
    """"27x0.9", "27 x 0,9", "27*0.9", "27×0.9", "2720x27x0,9", "27/0,9", "27 ye 0.9" → (27, 0.9).
    60x60 (profil) ve 4/6 (diş adımı) değil."""
    full = _parse_triple(n)
    if full:
        return (full[0], full[1])
    for m in re.finditer(rf"({_NUM})\s*[x×*]\s*({_NUM})", n):
        w, t = _f(m.group(1)), _f(m.group(2))
        if _valid_wt(w, t):
            return (w, t)
    for m in _WT_SLASH.finditer(n):
        w, t = _f(m.group(1)), _f(m.group(2))
        if _valid_wt(w, t):
            return (w, t)
    for m in _WT_SPACE.finditer(n):
        w, t = _f(m.group(1)), _f(m.group(2))
        if w in _W_KNOWN and t in _T_KNOWN:
            return (w, t)
    return None


def ambiguous_dims(n: str) -> Optional[Tuple[float, float]]:
    """"27x09" → (27, 0.9) TAHMİNİ (ayırıcı yok). Müşteriden teyit alınmadan kullanılmaz."""
    if parse_width_thickness(n):
        return None
    m = _WT_AMBIG.search(n)
    if not m or int(m.group(1)) not in _W_KNOWN:
        return None
    t = int(m.group(2)) / 10
    return (float(m.group(1)), t) if t in _T_KNOWN else None


# Makine markaları (model numarası boy sanılmasın): glossary makine-modeli +
# makine veritabanındaki üreticiler. Yaygın kelime olanlar (hem, delta, ultra…) yok.
_MACHINE_BRANDS = (
    "karmetal|kesmak|kes-mak|bekamak|beka-?mak|bimak|bianco|mep|imet|bomar|pilous|kasto|behringer|amada|"
    "makita|einhell|bosch|metabo|jet|optimum|opti|femi|mega|ecomac|dewalt|milwaukee|thomas|ozcelik|cosen|"
    "meba|danobat|doall|jaespa|pehaka|wagner|daito|everising|sabi|klaeger|bonetti|friggi|hyd ?mech|peerless|"
    "rusch|kaltenbach|bauer|franho|imas|marvel|soitaab|sofina|pedrazzoli|metora|trennjaeger|heska|"
    "kalamazoo|missler|eisele|baileigh|dispa|mossner|kolle|uniz|condor|ficep|wellsaw|voortman|metallkraft|"
    "hais|karmak|uzay|dg metal|berg schmid|mastercut|proma|holzmann|scheppach|bernardo|metallkraft"
)
_BRAND_MODEL = re.compile(rf"\b(?:{_MACHINE_BRANDS})\b\s*(?:[a-z]{{1,6}}\s*-?\s*)?\d{{2,5}}[a-z0-9]*\b"
                          r"(?!\s*(?:mm|milim))")
_MODEL_WORD = re.compile(r"\bmodel\w*\s*(?:no\w*\s*)?:?\s*(?:[a-z]{1,6}\s*-?\s*)?\d{2,5}[a-z0-9]*")
_ALNUM_CODE = re.compile(r"\b[a-z]{1,6}-?\d{1,5}[a-z0-9]*\b")       # lb1200f, kmy280, st37, m42
# Malzeme kodu: önek/nokta biçimleri her zaman; çıplak sayı (6082, 4140) yalnız malzeme bağlamında
_MAT_CODE_SAFE = re.compile(r"\b(?:aisi|sae|sus|ss|inox|en\s*aw|aa|al|alu)\s*-?\s*\d{3,4}\w*|(?<![\d.,])[1-3]\.\d{4}\b")
_MAT_CODE_BARE = re.compile(r"\b(?:304|316|321|420|430|2024|2205|5083|5754|6060|6061|6063|6082|7075|1045|4140|"
                            r"4340|52100)l?\b(?!\s*(?:mm|milim))")
_MAT_CONTEXT = (r"al[iu]m[iu]n[yi]?um\w*|alimunyum\w*|aliminyum\w*|\balu\b|paslanmaz\w*|\binox\b|celi[gk]\w*|"
                r"kalite\w*|malzeme\w*|demir\w*|\bkrom\w*|\bdokum\w*|duplex|\bt6\b")
_UNIT_NOISE = re.compile(
    r"(?<![\w.,])\d+(?:[.,]\d+)?\s*(?:tl\b|lira\w*|₺|adet\w*|tane\w*|parca\w*|rpm\b|devir\w*|kg\b|kilo\w*|hrc\b|"
    r"derece\w*|°|yil\w*|gun\w*|saat\w*|dk\b|dakika\w*|watt\b|kw\b|volt\b|bar\b|mpa\b|n/mm\w*|%|"
    r"m\s*/\s*(?:dk|dak|min|s)\b|m2\b|metrekare)|%\s*\d+(?:[.,]\d+)?")
_YEAR = re.compile(r"\b(?:19|20)\d{2}\s*'?\s*(?:te|ta|de|da|ten|tan|den|dan|yil\w*|model\w*)\b")
_GEOMETRY = re.compile(r"(?:\bcap\w*|ø|(?:merkez|aks|eksen|kasnak)\w*\s*aras\w*|mesafe\w*)\s*(?:[:=]\s*)?"
                       r"\d+(?:[.,]\d+)?\s*(?:mm|cm)?")
_CHAIN = re.compile(rf"{_NUM}(?:\s*[x×*]\s*{_NUM})+")


def _strip_non_length(n: str) -> str:
    """Boy OLMAYAN sayıları (ölçü zinciri, diş adımı, model, malzeme kodu, para, adet, çap…) çıkar."""
    s = _CHAIN.sub(" ", n)
    s = _WT_SLASH.sub(" ", s)
    s = re.sub(r"\d+(?:[.,]\d+)?\s*/\s*\d+(?:[.,]\d+)?", " ", s)          # 4/6, 1,4/2
    s = _BRAND_MODEL.sub(" ", s)
    s = _MODEL_WORD.sub(" ", s)
    s = _MAT_CODE_SAFE.sub(" ", s)
    if _any(_MAT_CONTEXT, s):
        s = _MAT_CODE_BARE.sub(" ", s)
    s = _ALNUM_CODE.sub(" ", s)
    s = _UNIT_NOISE.sub(" ", s)
    s = _YEAR.sub(" ", s)
    s = _GEOMETRY.sub(" ", s)
    # binlik ayırıcı: "2.750 mm" → "2750 mm"
    s = re.sub(r"(?<![\d.,])([1-9]\d?)\.(\d{3})(?![\d.,])", r"\1\2", s)
    return s


def parse_length(n: str) -> Optional[int]:
    """Boy (mm): "2750 mm", "2750mm", "2750'lik", "2,75 m", "275 cm", "3 metre 66", "2720x27x0,9",
    tek başına 4-5 haneli sayı. Model numarası (Kesmak 350, LB1200F), malzeme kodu (AISI 304,
    6082 alüminyum, 1.2379), fiyat/adet/çap sayıları boy sayılmaz."""
    full = _parse_triple(n)
    if full:
        return full[2]
    s = _strip_non_length(n)
    # Konuşma dili: "3 metre 66" = 3,66 m; "2 m 45 lik" = 2,45 m. "3 metre 34 lük" belirsiz
    # (34 bıçak genişliği olabilir) → boy okunmaz, müşteriye sorulur.
    m = re.search(r"(?<![\d.,])(\d{1,2})\s*(?:metre|mt|m)\s+(\d{2})(?![\d.,])(?!\s*(?:mm|cm|santim))", s)
    if m:
        if int(m.group(2)) in _W_KNOWN and _any(r"^\s*'?\s*(?:l[iu]k|lu|li|mm)\b", s[m.end():]):
            return None
        return int(m.group(1)) * 1000 + int(m.group(2)) * 10
    m = re.search(r"(?<![\d.,])(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:metre\w*|mt|m)\b(?!\s*/)", s)
    if m and 0.3 <= _f(m.group(1)) < 20:
        return int(round(_f(m.group(1)) * 1000))
    m = re.search(r"(?<![\d.,])(\d{2,4}(?:[.,]\d)?)\s*(?:cm|santim\w*|santi)\b", s)
    if m and 500 <= _f(m.group(1)) * 10 <= 20000:
        return int(round(_f(m.group(1)) * 10))
    for m in re.finditer(r"(?<![\w.,/'])(\d{3,5})(?!\d)", s):
        v = int(m.group(1))
        tail = s[m.end():m.end() + 14]
        if re.match(r"[.,]\d", tail):
            continue                                                   # ondalık sayı
        if re.match(r"\s*'?\s*(?:mm\b|milim)", tail):
            if 300 <= v <= 20000:
                return v
            continue
        if re.match(r"\s*'?\s*(?:l[iu]k|lu|li)\b", tail) or re.match(r"$|[\s,;.?!)]", tail):
            if 1000 <= v <= 20000:                                     # çıplak 3 hane boy sayılmaz
                return v
    return None


def ambiguous_metre(n: str) -> Optional[Tuple[int, int]]:
    """"3 metre 34 lük" → (3, 34): 3.340 mm mi, 3 m boy + 34 mm genişlik mi belirsiz."""
    s = _strip_non_length(n)
    m = re.search(r"(?<![\d.,])(\d{1,2})\s*(?:metre|mt|m)\s+(\d{2})(?![\d.,])\s*'?\s*(?:l[iu]k|lu|li|mm)\b", s)
    if m and int(m.group(2)) in _W_KNOWN:
        return int(m.group(1)), int(m.group(2))
    return None


def parse_tpi(n: str) -> Optional[str]:
    s = _WT_SLASH.sub(" ", n)
    s = re.sub(r"\b\d+\s*/\s*\d+\s*(?:inc\w*|inch\w*|\")", " ", s)
    m = re.search(r"(?<![\d.,])(\d{1,2}(?:[.,]\d{1,2})?\s*/\s*\d{1,2}(?:[.,]\d{1,2})?)(?![\d])", s)
    if m:
        return re.sub(r"\s+", "", m.group(1)).replace(",", ".")
    m = re.search(r"\b(\d{1,2})\s*tpi\b", s)
    return m.group(1) if m else None


_QTY_WORDS = {"bir": 1, "iki": 2, "uc": 3, "dort": 4, "bes": 5, "alti": 6, "yedi": 7, "sekiz": 8,
              "dokuz": 9, "on": 10}


def parse_qty(n: str) -> Optional[int]:
    """"2 tane", "20 adet", "iki tane" → adet."""
    m = re.search(r"(?<![\d.,])(\d{1,4})\s*(?:adet|tane|parca)\b", n)
    if m:
        q = int(m.group(1))
        return q if 1 <= q <= 9999 else None
    m = re.search(r"\b(" + "|".join(_QTY_WORDS) + r")\s*(?:adet|tane)\b", n)
    return _QTY_WORDS[m.group(1)] if m else None


# --------------------------------------------------------------------------- #
# Niyet kalıpları
# --------------------------------------------------------------------------- #

_OFF_TOPIC = (r"\b(siir|sarki|hikaye|masal|fikra|hava durumu|hava nasil|futbol|basketbol|"
              r"siyaset|yemek tarif|tarifi|kod yaz|python|javascript|odev\w*|"
              r"ceviri yap|tercume et|bilmece|burcum|astroloji|film oner|dizi oner|"
              r"sohbet edelim|fikra anlat|matematik|galatasaray|fenerbahce|besiktas|trabzonspor|bitcoin|"
              r"kripto\w*|borsa\w*|dolar\w*|euro|hangi telefon\w*)\b|"
              # "seçim" yalnız siyasal bağlamda ("seçim yapmama yardım" = bıçak seçimi)
              r"\bsecim(?:ler\w*)?\s*(?:sonuc|anket|kazan|ne zaman|kim)\w*|\bsecimi kim|\boy (?:ver|kullan)\w*|"
              r"\bmac\w*\s*(?:\w+\s+)?(?:kac|skor|sonuc)\w*|telefon\w*\s*(?:\w+\s+)?(?:almal|alayim|alsam|oner|tavsiye)\w*|"
              r"(?:araba|oto|otomobil)\s*lastig\w*")
# Not: "bıçak" çekimde "bıçağım/bıçağı" olur (k→ğ); sade biçimde "bicag".
_DOMAIN = (r"serit|testere|bica[kg]|tpi|\bdis|kesim|kesiyor|kesece|kesmek|makine|metal|celik|"
           r"paslanmaz|al[iu]m[iu]n[yi]?um|alimunyum|dokum|profil|boru|\bmil\b|\blama\b|\bsac\b|kaynak|bimetal|"
           r"bi-metal|m42|m51|karbur|siparis|kargo|fiyat|stok|hazir|odeme|iade|fatura|kasnak|kilavuz|\d+\s*mm")
# Kimlik / insan desteği: "sen kimsin", "bot musun", "canlı destek"
_IDENTITY = (r"\bkimsin|kiminle konusuyorum|\binsan mi(sin|siniz)?\b|gercek (bir )?(insan|kisi)|"
             r"\b(bot|robot)\s*mu(sun|sunuz)?\b|yapay zeka mi(sin)?\b|chat\s?gpt|\bgpt\b|"
             r"canli (destek|biri|kisi|temsilci)|musteri temsilci|temsilci(yle|ye|nize) (gorus|konus|bagla|aktar)|"
             r"yetkili (biri|kisi)|\boperator|(insan|biri|birisi|yetkili)(yle|ile) gorus|"
             r"\b(insan|biri|birisi|gercek kisi)\w*\s*(baglan|aktar)\w*")
_HUMAN_REQUEST = r"canli|temsilci|yetkili|operator|gorus|baglan|aktar"
# Bilgi paketleri (llm/knowledge.py)
_LENGTH_HELP = (r"(boy|uzunlu)\w*\s*(\w+\s+){0,3}(nasil|nereden|nerden)\s*(olc|hesap|bul|ogren|anla)|"
                r"(boy|uzunlu)\w*\s*(\w+\s+){0,2}bilmiyorum|(boy|uzunlu)\w*\s*hesap\w*|"
                r"(boy|uzunlu)\w*\s*(olcme\w*|olcmek|olcul\w*|olcer\w*|olcum\w*)|"
                r"olce(yim|lim|cegim|rim)\w*\s*(\w+\s+)?boy\w*|"
                r"kasnak\w*\s*(\w+\s+){0,3}(cap|merkez|aras)")
# "çalıştır" (calistir) rodaj DEĞİL
_RUN_IN = (r"rodaj|(?<!c)alistir\w*|\brun-?in\b|\bbreak-?in\b|"
           r"yeni bica[kg]\w*\s*(\w+\s+){0,3}(ilk|nasil kullan)|"
           r"ilk kesim\w*\s*(\w+\s+){0,3}(dikkat|nasil|yeni)|kullanilmaya basla\w*")
_QUESTION = (r"(nasil|ne kadar|\bkac\b|ayar\w*|olmali|gerek\w*|\bsart\b|lazim|oran\w*|hangi|"
             r"\bm[iu](yim|yiz|sun|sunuz|sin|siniz|dir)?\b|\?)")
_TENSION = (rf"(gergi\w*|gergin\w*|gerdir\w*|germe\w*|geril\w*|gevset\w*)\s*(\w+\s+){{0,4}}{_QUESTION}|"
            r"ne kadar ger\w*|tansiyon")
_COOLANT_TERM = (r"sogutma\w*|bor\s*yag\w*|boron\s*yag\w*|kesme\s*yag\w*|emulsiyon\w*|kuru\s*kes\w*|"
                 r"sogutmas[iu]z|refraktometre\w*|\byag(?:lama\w*|i|a|in\w*)?\b")
_COOLANT_Q = (rf"({_COOLANT_TERM})\s*([\w,']+\s+){{0,4}}{_QUESTION}|kaca karis\w*|karisim oran\w*|"
              r"refraktometre\w*\s*(\w+\s+){0,3}(nasil|olc)\w*")
# "Bor yağı satıyor musunuz" katalog sorusu, soğutma bilgisi değil
_COOLANT_EXCL = r"\bsat(iyor|ar|is|mak|tiginiz)\w*|satin al\w*"
_GRADE_Q = r"nedir|ne demek|hangi (malzeme|grup|metal|celik|sinif)|esdeger|karsilig|muadil|ne tur|\bfark\w*|arasindaki"
_SHIPPING = (r"\bkargo\w*|teslimat\w*|\bgonderim\b|kargoya|ne zaman (gel|ulas|elime|elimize|cik|kargo|gonder)\w*|"
             r"kac gun\w*|\bshipping\b|\bgonderiler\w*|hangi gun\w*\s*(\w+\s+)?(cik|kargo|gonder)\w*|"
             r"(hemen|yenisini)\s*(\w+\s+)?gonderir\w*|teslim (edil|ed|al|ne zaman)\w*|elime (ulas|gec)\w*|elimde (olur|olm)\w*|"
             r"adrese teslim|kapiya\w*\s*(\w+\s+)?(teslim|gel|getir)\w*|subeden|elden (al|teslim)\w*|"
             r"gelip al\w*|ne kadar sure\w*\s*(\w+\s+){0,2}(gel|ulas|hazirlan|kargo|teslim|cik)\w*|"
             r"siparis\w*\s*(\w+\s+){0,5}hazirlan\w*|hazirlan\w*\s*(\w+\s+){0,3}(ne zaman|kac gun|ne kadar)")
# "cayma hakkım kaç gün" iade sorusu: "kaç gün" tek başına kargo sayılmaz
_SHIPPING_TIME_ONLY = r"kac gun\w*"
# Müşteri yanlış ölçü/ürün gönderildiğini söylüyor → iade/ayıplı ürün (makine arızası değil)
_STORE_ERROR = (r"\d{3,5}\s*(mm\s*)?istedim\s*\d{3,5}\s*(mm\s*)?geldi|yanlis (olcu|urun|boy|bica[kg])\w*\s*(\w+\s+){0,2}"
                r"(gonder|gel)\w*|gondermissiniz|eksik gonder\w*")
_RETURN = (r"\biade\w*|cayma\w*|geri (gonder|al|iade)\w*|\bdegisim\b|degistir(ebilir|mek|ir)\s*(mi|is)\w*|"
           r"para\w*\s*iade|hasarli gel\w*|kirik gel\w*|hasar gor\w*")
# Bakım/montaj/adres değişikliği iade DEĞİL ("bıçağı nasıl değiştiririm", "adresimi değiştirebilir miyim")
_RETURN_EXCL = (r"(nasil|ne zaman|ne siklikla|siklikla)\s*(\w+\s+){0,2}degis\w*|degis\w*\s*(\w+\s+){0,2}"
                r"(nasil|ne zaman)|degistirirken|(lastig|rulman|adres|telefon|kilavuz)\w*\s*(\w+\s+){0,2}degis\w*")
_PAYMENT = (r"\bodeme\w*|taksit\w*|kredi kart\w*|banka kart\w*|havale\w*|\beft\b|\bkapida\b|nakit|kartla|"
            r"kart ile|kart bilgi\w*|3\s?d\s*secure|\b3d\b|\btroy\b|\bpaypal\b")
# "ödeme aldınız ürün yok", "dolandırıcı" → şikâyet/sipariş durumu, ödeme bilgisi değil
_PAYMENT_EXCL = r"dolandiric\w*|odeme\w*\s*(\w+\s+)?(aldiniz|alindi|cekil\w*|cekti\w*)"
_INVOICE = r"fatura|vergi no|vergi numara|e-?fatura|e-?arsiv|irsaliye"
_INVOICE_EXCL = r"fatura\w*\s*(\w+\s+)?(kaybol|kayip)\w*"
_CONTACT = (r"telefon(?!\w*\s*(?:\w+\s+)?(?:almal|alayim|alsam|oner|tavsiye))|iletisim|"
            r"ulas(abilir|mak|irim|alim|abilece)|adresiniz|nerdesiniz|neredesiniz|hangi sehir\w*|hangi ilde\w*|"
            r"whatsapp|e-?posta|mail adres|calisma saat\w*|mesai saat\w*|\bara(yabilir|yin|yiniz|r misiniz)\w*|"
            r"instagram|facebook|sosyal medya|showroom|magaza\w*\s*(\w+\s+)?(var|nerede|adres)\w*|"
            r"gelip (gor|bak)\w*|"
            # kırık/hasarlı ürünün fotoğrafı (makine markası fotoğrafı huniye kalır)
            r"(bica[kg]|urun|kirik|hasar|kaynag|yuzey)\w*\s*(\w+\s+){0,1}(fotograf|resim|video)\w*\s*(\w+\s+){0,2}"
            r"(gonder|at|yolla|ilet)\w*")
# Fiyat: güçlü kelimeler her zaman; "ne kadar" yalnız bıçak/ölçü bağlamında ve süre/hız/oran
# sorusu değilse ("ne kadar dayanır", "kesme hızı ne kadar olmalı", "410 cm ne kadar mm").
_PRICE_STRONG = (r"fiyat\w*|kac para|kac (tl|lira)|\bucret(?!siz)\w*|maliyet\w*|"
                 r"\bkaca\b(?!\s*(karis|ayar|getir|indir|dus|cik)\w*)|\bne tutar|kac tutar|\btutari\w*")
_PRICE_WEAK = (r"ne kadar(?!\s*(sur|dayan|olmal|ger|gev|hiz|uzun|kisa|kalin|genis|bekle|zaman|cm\b|mm\b|"
               r"metre|derece|isin|sik|yag|oran|ses|dik|aci))")
_PRICE_WEAK_EXCL = r"(sure\w*|omr\w*|hiz\w*|devri?\w*|oran\w*|gergi\w*|mesafe\w*|aralig\w*)\s*(\w+\s+)?ne kadar"
_PRICE_CONTEXT = r"bica[kg]\w*|serit\w*|testere\w*|\burun\w*|hazir boy\w*"
# "Fiyatlarınız KDV dahil mi" — bilgi sorusu; ölçü yoksa fiyat formu açılmaz
_KDV_INFO = r"\bkdv\w*\s*(\w+\s+)?(dahil|haric)\w*\s*(\w+\s+)?m[iu]\b|fiyat\w*\s*(\w+\s+)?kdv"
_STOCK = (r"\bhazir(da|daki|dan)?\b(?!\s*ol)|\bhazir\s*(boy|bica|serit|urun|olan|stok)\w*|\bstok\w*|"
          r"elinizde|mevcut mu|var mi|bulunuyor mu|hemen (gonderil|kargo)\w*")
# Boy yazılmadıysa stok listesi yalnız açık stok kelimesiyle ("hazırlanıyor" değil)
_STOCK_WORD = (r"\bhazir(da|daki|dan)?\b(?!\s*ol)|\bhazir\s*(boy|bica|serit|urun|olan|stok)\w*|\bstok\w*|"
               r"hemen (gonderil|kargo)\w*")
# "Hazır boy ile özel boy farkı ne" bilgi sorusu (stok listesi değil)
_STOCK_INFO = r"\bfark\w*|\bnedir\b|ne demek"
# Makine etiketini okuyan müşteri: "Etikette 3660 x 34 x 1,1 yazıyor"
_LABEL = r"\betiket\w*|yaziyor|yazili\w*|\bplaka\w*"
_SELECTION = (r"paslanmaz|karbon|celik|al[iu]m[iu]n[yi]?um|alimunyum|dokum|pirinc|bakir|titanyum|\bdolu\b|"
              r"\bmil\b|profil|boru|\blama\b|\bsac\b|kutu|kesiyorum|keseceg|makinem|modeli")
_STORE_KINDS = {"shipping", "returns", "payment", "invoice", "contact"}

# Takip mesajı işaretleri (son fiyat cevabına göre: "peki 34'lük olsa", "karbür olsa",
# "4/6 olanı", "2 tane alsam", "KDV dahil ne kadar")
_FOLLOW_MARK = (r"\bolsa\w*|\bolan(i|lar\w*)?\b|\bolursa\b|\bpeki\b|^ya\b|\balsam\b|\balirsam\b|\btane\b|"
                r"\badet\b|\bkdv\w*|\bdegil\b|\bayni\w*")
_NEAREST = r"en yakin\w*|yakin olan\w*|en yakini"
_YES = r"^(evet|dogru|aynen|tamam|ok|olur|he|hi hi)\b"

# Arıza belirtileri — YEDEK: data/troubleshooting_tr.json'da "patterns" yoksa kullanılır.
_SYMPTOMS: List[Tuple[str, str]] = [
    ("back_edge_cracks", r"sirt\w*\s*(\w+\s+){0,3}catla\w*|arka\s*kenar\w*\s*(\w+\s+){0,2}catla\w*"),
    ("blade_break", r"(bica[kg]|serit|band)\w*\s*(\w+\s+){0,2}(kopt|kop\w*|kiril\w*|catla\w*)|kaynak yerinden"),
    ("tooth_breakage", r"dis(ler)?\w*\s*(\w+\s+){0,2}(kopt|kop\w*|kiril\w*|doku\w*)|dis\s*kaybi"),
    ("tooth_back_breakout", r"dis(in)?\s*arka|arka\s*taraf.{0,12}kiril"),
    ("cut_deviation", r"yana\s*kac|sag[ae]\s*kac|sol[ae]\s*kac|kesim\s*kaciyor|egri\s*kes|sapma|"
                      r"duz\s*kesmiyor|carpik\s*kes"),
    ("wandering_or_wavy_cut", r"dalgali|yon\s*degistir|kesim\s*dalgalan|titresim|gurultu|"
                              r"ses\s*(cikariyor|geliyor|yapiyor)|zangirdi"),
    ("premature_tooth_wear", r"erken\s*(asin|korel)|cabuk\s*korel|hizli\s*asin|omru\s*kisa|korel|"
                             r"kesmiyor artik|yavas\s*kesiyor|kesim\s*suresi\s*uz"),
    ("one_sided_tooth_wear", r"tek\s*taraf.{0,10}asin"),
    ("inaccurate_cut", r"olcu\s*(tutmuyor|hatali|sapiyor)|hatali\s*kesim"),
    ("chips_in_gullet", r"talas.{0,25}(sikis|birik|tikan|dol)|dis\s*boslug\w*.{0,15}(talas|tikan|dol)"),
    ("blade_back_wear", r"sirt.{0,10}asin|bica[kg]\w*\s*sirti"),
    ("blade_surface_damage", r"govde.{0,12}(hasar|cizik)|yuzey.{0,10}hasar"),
    ("twisted_blade", r"burul|bica[kg]\w*\s*bukul|kivril"),
    ("rough_cut_surface", r"(kesim|yuzey)\w*\s*(\w+\s+){0,2}(puruz\w*|kotu|bozuk|tirtik\w*)|puruzlu"),
    ("blade_off_wheel", r"kasnak\w*\s*(\w+\s+){0,2}(cik\w*|atiyor|atti|kayiyor|kaciyor)|"
                        r"(bica[kg]|serit)\w*\s*(\w+\s+){0,2}(atiyor|firliyor)"),
    ("chip_welding", r"talas\w*\s*(\w+\s+){0,3}(yapis\w*|kayn\w*)|dis\w*\s*(\w+\s+){0,2}(yapis\w*|sivan\w*)"),
    ("overheating", r"(asiri\s*)?isin(iyor|ma\w*)|talas\w*\s*(\w+\s+){0,2}(mavi|yanik|kahverengi|mor)|duman"),
    ("stalling", r"(bica[kg]|serit|testere)\w*\s*(\w+\s+){0,2}(duruyor|durdu|takiliyor)|"
                 r"(makine|motor)\w*\s*(\w+\s+){0,2}(zorlan\w*|bogul\w*|duruyor)"),
]
_TROUBLE_GENERIC = r"(sorun|problem|ariza|bozul|neden boyle)"

# Sapma türü belirtilerinde önce ucuz/güvenli temel kontroller (RAG v2 §8)
_BASELINE_CHECKS = [
    ("Mengene / iş parçası sıkma gevşek",
     "Parçayı mengeneye tam oturtup sıkın; kesim sırasında en ufak oynama kesimi saptırır."),
    ("Kılavuzlar malzemeden uzak veya gevşek",
     "Kılavuz kollarını parçaya mümkün olduğunca yaklaştırıp sıkın."),
    ("Talaş fırçası çalışmıyor",
     "Fırçanın diş boşluklarını temizlediğini doğrulayın; tıkalı diş boşluğu hem sapma hem diş kırılması yapar."),
]

# Mesaj soru mu? (huni cevapları — "Var", "40", "Paslanmaz" — kütüphaneye gitmesin)
_ASKS = (r"\?|\b(nasil|neden|niye|nedir|ne zaman|ne demek|ne ise|hangi|hangisi|kac|mi|mu|misiniz|musunuz|"
         r"miyim|muyum|olur mu|gerekir mi|yapilir|yapmali|nelere|ne yapmali|ne yapayim|farki)\b")

# Kütüphane bağlantıları için okunur adlar
_LINK_LABELS = {
    "/rehber/serit-testere-tpi-secimi": "TPI seçimi rehberi",
    "/rehber/m42-mi-m51-mi": "M42 mi M51 mi rehberi",
    "/rehber/serit-testere-boyu-nasil-olculur": "bıçak boyu rehberi",
    "/rehber/celik-kalite-esdegerleri-bicak-secimi": "çelik kalite eşdeğerleri rehberi",
    "/rehber/serit-testere-arizalari-ve-cozumleri": "arızalar ve çözümleri rehberi",
    "/rehber/serit-testere-kirilma-nedenleri": "kırılma nedenleri rehberi",
    "/rehber/serit-testere-gerginlik-hiz-sogutma": "gerginlik, hız ve soğutma rehberi",
    "/rehber/serit-testere-rodaj-ve-bakim": "rodaj ve bakım rehberi",
    "/rehber/ahsap-serit-testere-secimi": "ahşap bıçak seçimi rehberi",
    "/rehber/et-kemik-serit-testere-secimi": "et-kemik bıçak seçimi rehberi",
    "/rehber/sunger-kesim-bicagi-secimi": "sünger kesim bıçağı rehberi",
    "/products/bimetal-premium": "Bi-Metal M42 Premium",
    "/products/bimetal-m51": "Bi-Metal M51 Endüstriyel",
    "/products/carbide-ultimate": "Karbür Uçlu Şerit Testere",
    "/products/woodcut-classic": "Ahşap Kesim Şerit Testere",
    "/products/hijyenik-et-kemik-pro": "Hijyenik Et-Kemik Şerit Testere",
    "/products/sunger-tekstil-pro": "Sünger-Tekstil Şerit Testere",
    "/hazir-urunler": "hazır boy ürünler",
    "/iletisim": "İletişim",
    "/sss": "Sık sorulan sorular",
    "/yasal/iade-ve-cayma": "İade ve Cayma Politikası",
    "/yasal/kvkk-aydinlatma-metni": "KVKK Aydınlatma Metni",
}

_QTY_DISCOUNT_NOTE = "Adet indirimi sepette uygulanır: 3+ adet %5, 5+ adet %10, 10+ adet %15."


def _load_troubleshooting() -> Dict[str, Dict[str, Any]]:
    try:
        with open(os.path.join(_DATA, "troubleshooting_tr.json"), encoding="utf-8") as f:
            return {t["id"]: t for t in json.load(f)["troubleshooting"]}
    except Exception:
        return {}


def _symptom_table(trouble: Dict[str, Dict[str, Any]]) -> List[Tuple[str, List[re.Pattern]]]:
    """Belirti kalıpları: JSON'daki "patterns" (priority sırasıyla, özelden genele); JSON'da hiç
    kalıp yoksa gömülü _SYMPTOMS listesi."""
    rows = sorted(trouble.values(), key=lambda t: t.get("priority", 10 ** 6))   # sıralama kararlı
    if not any(t.get("patterns") for t in rows):
        return [(sid, [re.compile(p)]) for sid, p in _SYMPTOMS if sid in trouble]
    builtin = dict(_SYMPTOMS)
    table = []
    for t in rows:
        pats = list(t.get("patterns") or ([builtin[t["id"]]] if t["id"] in builtin else []))
        compiled = []
        for p in pats:
            try:
                compiled.append(re.compile(p))
            except re.error:
                continue
        if compiled:
            table.append((t["id"], compiled))
    return table


# --------------------------------------------------------------------------- #
# Ön masa
# --------------------------------------------------------------------------- #

@dataclass
class FrontDeskReply:
    text: str
    # True → bu turda huni çalışmaz (soru metni eklenmez; butonlar yine gösterilir)
    final: bool
    kinds: List[str] = field(default_factory=list)


class FrontDesk:
    def __init__(self, store: Optional[StoreClient] = None, kb: Optional[KnowledgeBase] = None):
        self.store = store or StoreClient()
        self.trouble = _load_troubleshooting()
        self.symptom_table = _symptom_table(self.trouble)
        self.kb = kb if kb is not None else _safe_kb()

    # ------------------------------------------------------------------ #
    # Ana giriş
    # ------------------------------------------------------------------ #

    def handle(self, session: Any, message: str) -> Optional[FrontDeskReply]:
        n = norm(message)
        if not n:
            return None
        # Tur sayacı: son fiyat/stok cevabına takip yalnız HEMEN sonraki turda geçerli
        # (arada huniye cevap verildiyse "41'lik olan" çap cevabıdır, fiyat takibi değil).
        session.front_desk_turn = (getattr(session, "front_desk_turn", None) or 0) + 1

        # Önceki turda eksik bilgi istendiyse (fiyat için boy gibi) tamamla
        pending = getattr(session, "front_desk_pending", None)
        session.front_desk_pending = None
        if pending:
            follow = self._follow_up(session, pending, n)
            if follow:
                return follow
        # Son fiyat/stok cevabına takip ("peki 34'lük olsa", "en yakını hangisi")
        follow = self._context_follow_up(session, n)
        if follow:
            return follow

        if _any(_OFF_TOPIC, n) and not _any(_DOMAIN, n):
            return FrontDeskReply(self._off_topic(), final=True, kinds=["off_topic"])

        parts: List[str] = []
        kinds: List[str] = []

        if _any(_IDENTITY, n):
            parts.append(self._identity(n))
            kinds.append("identity")

        link_fn = link
        length = parse_length(n)
        if _any(_LENGTH_HELP, n) and not self._length_help_excluded(n, length):
            parts.append(knowledge.length_answer(n, link_fn))
            kinds.append("length_help")
        if _any(_RUN_IN, n):
            parts.append(knowledge.run_in_answer(link_fn))
            kinds.append("run_in")
        if _any(_TENSION, n):
            parts.append(knowledge.tension_answer(link_fn))
            kinds.append("tension")
        if _any(_COOLANT_Q, n) and not _any(_COOLANT_EXCL, n):
            parts.append(knowledge.coolant_answer(link_fn))
            kinds.append("coolant")
        if _any(_GRADE_Q, n):
            grades = knowledge.detect_grades(n)[:2]
            alias = None if grades else knowledge.alias_grade_answer(n, link_fn)
            if grades:
                parts.extend(knowledge.grade_answer(g, link_fn) for g in grades)
                kinds.append("grade")
            elif alias:
                parts.append(alias)
                kinds.append("grade")

        store_error = _any(_STORE_ERROR, n)
        symptoms = self._symptoms(n, skip=("blade_length_misfit",) if store_error else ())
        if symptoms:
            parts.append(self._trouble_answer(symptoms))
            # Soğutma sıvısı arızaları (köpürme, koku, ayrışma…) soğutma konusu olarak işaretlenir
            if all(self.trouble[s].get("family") == "coolant" for s in symptoms):
                if "coolant" not in kinds:
                    kinds.append("coolant")
            else:
                kinds.append("troubleshoot")
        elif _any(_TROUBLE_GENERIC, n) and _any(r"bica[kg]|serit|testere|kes|makine", n):
            parts.append(self._trouble_ask())
            kinds.append("troubleshoot")

        shipping = _any(_SHIPPING, n)
        if shipping and _any(r"\b(cayma|iade)\w*", n):
            shipping = _any(_SHIPPING, re.sub(_SHIPPING_TIME_ONLY, " ", n))
        if shipping:
            parts.append(self._shipping())
            kinds.append("shipping")
        if (_any(_RETURN, n) and not _any(_RETURN_EXCL, n)) or store_error:
            parts.append(self._returns())
            kinds.append("returns")
        if _any(_PAYMENT, n) and not _any(_PAYMENT_EXCL, n):
            parts.append(self._payment(n))
            kinds.append("payment")
        if _any(_INVOICE, n) and not _any(_INVOICE_EXCL, n):
            parts.append(self._invoice())
            kinds.append("invoice")
        if _any(_CONTACT, n) and "shipping" not in kinds and "identity" not in kinds:
            parts.append(self._contact())
            kinds.append("contact")

        family = detect_family(n)
        dims = parse_width_thickness(n)
        triple = _parse_triple(n)
        # Bilgi bloğu verildiyse ("gergi ne kadar olmalı", "peşin fiyatına taksit") ölçü yoksa fiyat formu açılmaz
        info_kinds = set(kinds) - {"troubleshoot"}
        wants_price = ((_any(_PRICE_STRONG, n)
                        or (_any(_PRICE_WEAK, n) and not _any(_PRICE_WEAK_EXCL, n)
                            and (dims or length or family or _any(_PRICE_CONTEXT, n))))
                       and not (info_kinds and not dims)
                       and not (_any(_KDV_INFO, n) and not (dims or length))
                       # "Teklif alabilir miyim, 20 adet 34x1.1 4115" (tam ölçüyle teklif = fiyat)
                       or bool(_any(r"\bteklif\w*", n) and dims and length and not info_kinds))
        wants_stock = (_any(_STOCK, n) and (length or _any(_STOCK_WORD, n))
                       and not (_any(_STOCK_INFO, n) and not length)
                       and not ({"returns", "payment", "invoice"} & set(kinds) and not length))
        # Etiketteki tam ölçü ("Etikette 3660 x 34 x 1,1 yazıyor") → stok + fiyat
        if triple and _any(_LABEL, n) and not wants_price:
            wants_stock = True

        if wants_stock and "troubleshoot" not in kinds:
            text, quoted = self._stock_answer(session, n)
            parts.append(text)
            kinds.append("stock")
            # Stok cevabına eklenen özel üretim fiyatı ancak fiyat sorulduysa "price" sayılır
            if quoted and (wants_price or (triple and _any(_LABEL, n))):
                kinds.append("price")
        elif wants_price:
            parts.append(self._price_answer(session, n, family))
            kinds.append("price")

        if (family in ("woodcut", "meat-bone", "textile")
                and not ({"price", "stock"} | _STORE_KINDS) & set(kinds)):
            parts.append(self._non_metal(session, family, n))
            kinds.append(f"non_metal:{family}")

        if not parts:
            return None

        # Mesaj ürün seçimi bilgisi de taşıyorsa (malzeme/kesit/makine) huni de
        # çalışsın; cevaplar başa eklenir.
        hybrid = (_any(_SELECTION, n) and not set(kinds) & {"troubleshoot", "price", "stock"}
                  and not any(k.startswith("non_metal") for k in kinds))
        text = "\n\n".join(p for p in parts if p)
        if not hybrid:
            text += "\n\n" + self._soft_continue(kinds)
        return FrontDeskReply(text, final=not hybrid, kinds=kinds)

    @staticmethod
    def _length_help_excluded(n: str, length: Optional[int]) -> bool:
        # "kasnak çapına göre kalınlık" boy sorusu değil; boy yazılmışsa "boy ölçüsü 2750" yardım istemez
        if _any(r"kalinli\w*", n) and not _any(r"\b(boy|uzunlu)\w*", n):
            return True
        if length and not knowledge.parse_wheel_geometry(n) and not _any(r"nasil|bilmiyorum|hesap", n):
            return True
        return False

    def post_process(self, session: Any, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Huni cevabından sonra:
          - Motor diş adımını hesapladıysa (malzeme + kesit + ölçü geldi) bunu
            HEMEN söyle; müşteri makine sorusundan önce cevabını alsın. Değer
            motorun kendisinden gelir → son öneriyle aynıdır.
          - Ahşap / et-kemik / plastik seçildiyse metal hunisi çıkmaza giriyordu;
            ilgili ürün ailesine yönlendir.
        """
        state = result.get("state") or {}
        if not result.get("recommendation"):
            cat = state.get("material_category")
            if cat == "UNKNOWN" and not result.get("next_question"):
                # "Emin değilim" seçilince huni sorusuz kalıyordu ("kesin bir
                # ürün kodu üretemedim"). Seçimi sıfırla, örneklerle tarif ettir.
                engine = getattr(session, "rules_engine", None)
                if engine is not None:
                    engine.state_manager.update_field("material_category", None)
                    result["next_question"] = _question_payload(engine.get_next_question())
                    result["state"] = engine.get_state()
                result["message"] = self._unknown_material()
                return result
            if cat in ("WOOD", "ORGANIC_BONE", "PLASTIC_COMPOSITE"):
                fam = {"WOOD": "woodcut", "ORGANIC_BONE": "meat-bone"}.get(cat)
                if fam:
                    result["message"] = self._non_metal(session, fam, "")
                else:
                    result["message"] = self._plastic_composite()
                result["next_question"] = None
                return result

            tpi = state.get("tooth_pitch")
            if tpi and getattr(session, "front_desk_tpi_shown", None) != tpi:
                session.front_desk_tpi_shown = tpi
                d = getattr(session, "solid_diameter_mm", None)
                solid = "SOLID" in (state.get("part_type"), state.get("metal_part_type"))
                basis = f"Ø{mm(d)} mm dolu malzeme için" if d and solid else "Verdiğiniz bilgilere göre"
                result["message"] = (
                    f"{basis} önerilen diş adımı: **{tpi.replace('.', ',')} TPI** "
                    "(kesin değer makinenizin bıçak ölçüsüne göre netleşir). "
                    "Size uygun bıçağı ve ölçüyü kesinleştirmek için:\n\n"
                    + (result.get("message") or "")
                )
        return result

    # ------------------------------------------------------------------ #
    # Mağaza cevapları
    # ------------------------------------------------------------------ #

    @staticmethod
    def _shipping() -> str:
        return (
            "**Kargo:** Ürün toplamı KDV dahil "
            f"{tl(FREE_SHIPPING_THRESHOLD_INCL_VAT).replace(',00 TL', ' TL')} ve üzeri siparişlerde "
            f"standart kargo ücretsizdir; altındaki siparişlerde kargo ücreti {tl(STANDARD_SHIPPING_FEE)}'dir (KDV dahil). "
            "Kargo ücreti siparişi onaylamadan önce sepet ve ödeme adımında gösterilir. "
            "Siparişiniz en kısa sürede kargoya verilir; üye girişi yaptıysanız kargo durumunu "
            f"{link('Hesabım → Siparişlerim', '/hesabim')} sayfasından takip edebilirsiniz."
        )

    @staticmethod
    def _returns() -> str:
        return (
            "**İade ve cayma:** Stoktan gönderilen hazır boy ürünlerde teslimden itibaren 14 gün içinde "
            "cayma hakkınız vardır (ürün kullanılmamış ve orijinal ambalajında olmalı). Ölçünüze göre özel "
            "üretilen (kaynaklanan) bıçaklarda ve ambalajı açılmış et-kemik bıçaklarında, mevzuat gereği "
            "cayma hakkı bulunmaz. Ayıplı veya kargoda hasar görmüş ürünlerde yasal haklarınız saklıdır; "
            "ürünün fotoğraflarıyla bize ulaşın. Ayrıntılar: "
            f"{link('İade ve Cayma Politikası', '/yasal/iade-ve-cayma')}"
        )

    @staticmethod
    def _payment(n: str) -> str:
        text = (
            "**Ödeme:** Kredi kartı veya banka kartıyla, iyzico güvencesinde 3D Secure ile ödeyebilirsiniz. "
            "Kartınıza uygun taksit seçenekleri ödeme ekranında gösterilir."
        )
        if _any(r"kapida|nakit", n):
            text += " Kapıda ödeme seçeneğimiz bulunmuyor."
        if _any(r"kart bilgi\w*|guvenli|guvende", n):
            # SSS (testerestore/app/sss) ile aynı ifade
            text += " Kart bilgileriniz sitemize iletilmez ve saklanmaz."
        if _any(r"(3\s?d|sms|sifre|kod)\w*\s*(\w+\s+){0,2}gelm\w*", n):
            text += (" 3D Secure doğrulama mesajı kartınızı veren banka tarafından gönderilir; gelmiyorsa "
                     "bankanızla görüşmenizi öneririm.")
        return text

    @staticmethod
    def _invoice() -> str:
        return (
            "**Fatura:** Ödeme adımında bireysel ya da kurumsal (firma unvanı, vergi dairesi, vergi numarası) "
            "fatura bilgisi girebilirsiniz; faturanız bu bilgilerle düzenlenir."
        )

    @staticmethod
    def _contact() -> str:
        return (
            f"**İletişim:** {link('İletişim sayfamızdan', '/iletisim')} bize mesaj gönderebilirsiniz."
        )

    # ------------------------------------------------------------------ #
    # Bilgi kütüphanesi
    # ------------------------------------------------------------------ #

    def kb_reply(self, router, message: str) -> Optional[FrontDeskReply]:
        """
        Ön masanın deterministik niyetleri susunca bilgi kütüphanesi (llm/kb_router).
        Yalnızca soru biçimindeki mesajlar; kişiye özel bıçak/ölçü seçimi huniye kalır.
        """
        n = norm(message)
        if router is None or not kb_eligible(n):
            return None
        hits = [h for h in router.route(message)
                # Canlı veri isteyen kayıtlar (fiyat/stok) kendi akışlarında cevaplanır
                if not set(h.entry.requires_data) & {"price_api", "stock_api"}]
        if not hits:
            return None
        kinds = [f"kb:{h.entry.id}" for h in hits]
        text = "\n\n".join(self._kb_text(h.entry) for h in hits)
        hybrid = _any(_SELECTION, n)
        if not hybrid:
            text += "\n\n" + self._soft_continue(kinds)
        return FrontDeskReply(text, final=not hybrid, kinds=kinds)

    @staticmethod
    def _kb_text(entry) -> str:
        text = entry.answer_tr.strip()
        links = [(_LINK_LABELS[p], p) for p in entry.links if p in _LINK_LABELS and p not in text]
        if links:
            text += "\n\nAyrıntılı bilgi: " + ", ".join(link(lbl, p) for lbl, p in links[:3]) + "."
        return text

    @staticmethod
    def _identity(n: str) -> str:
        text = (
            "Ben TestereStore'un yapay zekâ asistanıyım; insan değilim. Bıçak seçimi, fiyat ve hazır stok, "
            "kargo-ödeme-iade ve kesim sorunlarında hemen yardımcı olabilirim. Yanıtlarım hata içerebilir; "
            "siparişten önce ürün sayfasını kontrol etmenizi öneririm."
        )
        if _any(_HUMAN_REQUEST, n):
            text += (
                " Bir yetkilimizle görüşmek isterseniz "
                f"{link('İletişim sayfamızdan', '/iletisim')} bize yazabilirsiniz."
            )
        return text

    @staticmethod
    def _unknown_material() -> str:
        return (
            "Sorun değil, birlikte bulalım. Keseceğiniz parçayı kısaca tarif eder misiniz? Örneğin:\n"
            "- **Metal:** demir profil, paslanmaz mil, alüminyum boru, döküm parça\n"
            "- **Ahşap:** kereste, tomruk, MDF\n"
            "- **Et / kemik:** donuk et, kemikli et, balık\n"
            "- **Sünger / tekstil:** sünger blok, köpük, kumaş\n\n"
            "Emin olamıyorsanız " + link("İletişim sayfamızdan", "/iletisim")
            + " bize yazabilirsiniz."
        )

    @staticmethod
    def _off_topic() -> str:
        return (
            "Ben TestereStore'un yapay zekâ asistanıyım; yalnızca şerit testere konularında yardımcı "
            "olabiliyorum: bıçak "
            "seçimi, fiyat ve hazır stok, kargo-ödeme-iade ve kesim sorunları. Örneğin \"40 mm dolu paslanmaz "
            "için hangi bıçak?\" ya da \"27×0,9 bi-metal 2750 mm kaç para?\" diye sorabilirsiniz."
        )

    @staticmethod
    def _soft_continue(kinds: List[str]) -> str:
        if "troubleshoot" in kinds:
            return "Kestiğiniz malzemeyi ve bıçak ölçünüzü yazarsanız daha net yardımcı olabilirim."
        if {"price", "stock"} & set(kinds):
            return "Başka bir ölçü ya da bıçak seçimi için de sorabilirsiniz."
        return "Bıçak seçimi için yardım isterseniz ne keseceğinizi yazmanız yeterli."

    # ------------------------------------------------------------------ #
    # Arıza
    # ------------------------------------------------------------------ #

    def _symptoms(self, n: str, skip: Tuple[str, ...] = ()) -> List[str]:
        found = [sid for sid, pats in self.symptom_table
                 if sid not in skip and any(p.search(n) for p in pats)]
        return [s for s in found if s in self.trouble][:2]

    def _trouble_answer(self, symptoms: List[str]) -> str:
        blocks = []
        for sid in symptoms:
            t = self.trouble[sid]
            causes = [(c["cause_tr"], c["action_tr"])
                      for c in sorted(t["causes_and_actions"], key=lambda c: c.get("order", 0))]
            if sid in ("cut_deviation", "wandering_or_wavy_cut", "inaccurate_cut"):
                existing = " ".join(norm(c) for c, _ in causes)
                base = [b for b in _BASELINE_CHECKS
                        if not any(k in existing for k in norm(b[0]).split()[:1])]
                causes = base + causes
            lines = [f"**{t['symptom_tr']}** — olası nedenler (önce en olası):"]
            for i, (cause, action) in enumerate(causes[:5], 1):
                lines.append(f"{i}. **{cause}** → {action}")
            blocks.append("\n".join(lines))
        blocks.append("Kontrolleri makine durdurulmuş ve enerjisi kesilmişken yapın.")
        return "\n\n".join(blocks)

    @staticmethod
    def _trouble_ask() -> str:
        return (
            "Sorunu daha iyi anlamam için ne olduğunu biraz açar mısınız? Örneğin: bıçak çabuk köreliyor, "
            "kesim yana kaçıyor / eğri kesiyor, dişler kırılıyor, bıçak kopuyor, titreşim veya ses yapıyor, "
            "talaş diş boşluğunda sıkışıyor."
        )

    # ------------------------------------------------------------------ #
    # Fiyat
    # ------------------------------------------------------------------ #

    def _price_answer(self, session: Any, n: str, family: Optional[str]) -> str:
        dims = parse_width_thickness(n)
        length = parse_length(n)
        tpi = parse_tpi(n)
        qty = parse_qty(n)
        m51 = family == "bi-metal" and _wants_m51(n)
        if not dims and self.store.enabled:
            guess = ambiguous_dims(n)
            if guess:
                session.front_desk_pending = {"kind": "price", "family": family, "dims": None,
                                              "dims_guess": guess, "length": length, "tpi": tpi,
                                              "qty": qty, "m51": m51}
                return (f"Ölçüyü **{mm(guess[0])} × {mm(guess[1])} mm** olarak mı okuyayım? Doğruysa \"evet\" "
                        "yazmanız yeterli; değilse genişlik × kalınlığı (ör. 27×0,9) yazar mısınız?")
        return self._quote(session, family, dims, length, tpi, qty=qty, m51=m51)

    def _quote(self, session: Any, family: Optional[str], dims: Optional[Tuple[float, float]],
               length: Optional[int], tpi: Optional[str], qty: Optional[int] = None,
               kdv: bool = False, m51: bool = False) -> str:
        if not self.store.enabled:
            return self._price_fallback(family)
        tree = self.store.price_options() or {}

        missing = []
        if not dims:
            missing.append("genişlik × kalınlık (ör. 27×0,9)")
        if not length:
            missing.append("boy (mm, ör. 2750)")
        if missing:
            session.front_desk_pending = {"kind": "price", "family": family, "dims": dims,
                                          "length": length, "tpi": tpi, "qty": qty, "m51": m51}
            fam_txt = f" {FAMILIES[family]['label']}" if family in FAMILIES else ""
            return (f"Fiyatı{fam_txt} hemen hesaplayabilirim; bunun için " + " ve ".join(missing)
                    + " yazar mısınız?" + ("" if family else " Bıçak tipini de (bi-metal, karbür, ahşap…) "
                                               "belirtirseniz tek fiyat veririm."))

        if length < GLOBAL_MIN_LENGTH:
            return (f"Ölçüye göre üretimde boy en az {_th(GLOBAL_MIN_LENGTH)} mm olabiliyor; {length} mm için "
                    f"{link('hazır boy ürünlerimize', '/hazir-urunler')} bakabilirsiniz.")
        if length > GLOBAL_MAX_LENGTH:
            return (f"Ölçüye göre üretimde boy en fazla {_th(GLOBAL_MAX_LENGTH)} mm olabiliyor; {length} mm için "
                    f"{link('İletişim sayfamızdan', '/iletisim')} bize yazabilirsiniz.")

        w, t = dims
        fams = [family] if family else list(FAMILIES.keys())
        lines: List[str] = []
        basis: Optional[float] = None        # kargo eşiği için en düşük tutar
        out_of_range: List[str] = []
        quoted_tpi = None
        for fam in fams:
            tpis = _tree_tpis(tree, fam, w, t)
            if tpis is None:
                continue
            lo_lim, hi_lim = _length_limits(fam, m51)
            if not lo_lim <= length <= hi_lim:
                out_of_range.append(fam)
                continue
            use = [tpi] if tpi and tpi in tpis else (tpis or [None])
            rows = []
            for tp in use:
                r = self.store.calculate(fam, w, t, length, tp)
                if r and isinstance(r.get("total_price"), (int, float)):
                    rows.append((tp, r))
            if not rows:
                continue
            totals = [float(r["total_price"]) for _, r in rows]
            lo, hi = min(totals), max(totals)
            spec = f"{mm(w)} × {mm(t)} mm, {length} mm"
            if tpi and tpi in tpis:
                spec += f", {tpi} TPI"
                quoted_tpi = tpi
            note = "" if lo == hi or (tpi and tpi in tpis) else " (diş adımına göre)"
            fam_links = FAMILIES[fam]["links"]
            if fam == "bi-metal" and m51:
                fam_links = [x for x in fam_links if "m51" in x[1]]
            elif fam == "bi-metal" and length < M51_LENGTH_LIMITS[0]:
                fam_links = [x for x in fam_links if "m51" not in x[1]]
            links = ", ".join(link(lbl, path) for lbl, path in fam_links)
            label = "Bi-Metal M51 Endüstriyel" if fam == "bi-metal" and m51 else FAMILIES[fam]["label"]
            lines.append(f"- **{label}** — {spec}: **{_price_text(lo, hi, kdv)}**{note} · {links}")
            if fam == "bi-metal" and not m51 and length < M51_LENGTH_LIMITS[0]:
                lines.append(f"  _Bi-Metal M51 Endüstriyel ölçüye göre en az {_th(M51_LENGTH_LIMITS[0])} mm "
                             "boyda üretiliyor; bu boyda Bi-Metal M42 Premium sipariş edilebilir._")
            if tpi and tpi not in tpis and tpis:
                lines.append(f"  _{tpi} TPI bu ölçüde yok; mevcut diş adımları: {', '.join(tpis)}._")
            fam_basis = lo
            if qty and qty > 1:
                qline, qlo = _qty_line(qty, rows, kdv)
                lines.append(qline)
                if qlo is not None:
                    fam_basis = qlo / (1 + KDV_RATE) if kdv else qlo
            basis = fam_basis if basis is None else min(basis, fam_basis)

        if not lines:
            if out_of_range:
                return self._length_limit_text(out_of_range, length, m51)
            avail = _available_dims(tree, family)
            return (f"{mm(w)} × {mm(t)} mm ölçüsü"
                    + (f" {FAMILIES[family]['label']} ailesinde" if family in FAMILIES else "")
                    + " fiyat listemizde yok. Mevcut genişlik × kalınlıklar: " + avail + ".")

        if out_of_range:
            lines.append("  _" + "; ".join(
                f"{_PRODUCT_NAME[f]} ölçüye göre {_th(_length_limits(f, m51)[0])}–"
                f"{_th(_length_limits(f, m51)[1])} mm boyda üretiliyor" for f in out_of_range)
                + f"; {length} mm bu aralığın dışında._")

        session.front_desk_last_quote = {"family": family, "dims": dims, "length": length,
                                         "tpi": quoted_tpi, "qty": qty, "m51": m51,
                                         "turn": getattr(session, "front_desk_turn", None)}
        ship = ""
        if basis is not None:
            ship = (" Bu tutarla kargo ücretsiz." if basis * (1 + KDV_RATE) >= FREE_SHIPPING_THRESHOLD_INCL_VAT
                    else " KDV dahil 2.000 TL ve üzeri siparişlerde kargo ücretsiz.")
        head = ("**Fiyat (1 adet, kaynak dahil, %20 KDV dahil):**" if kdv
                else "**Fiyat (1 adet, kaynak dahil, KDV hariç):**")
        return head + "\n" + "\n".join(lines) + f"\n\n{_QTY_DISCOUNT_NOTE}{ship}"

    @staticmethod
    def _length_limit_text(fams: List[str], length: int, m51: bool) -> str:
        limits = [(f, _length_limits(f, m51)) for f in fams]
        if len(limits) == 1:
            f, (lo, hi) = limits[0]
            name = "Bi-Metal M51 Endüstriyel" if f == "bi-metal" and m51 else _PRODUCT_NAME[f]
            text = (f"Ölçüye göre üretimde {name} bıçaklarımızın boyu {_th(lo)}–{_th(hi)} mm arasında "
                    f"olabiliyor; {length} mm bu aralığın dışında.")
        else:
            text = (f"{length} mm, bu ölçüdeki bıçaklarımızın üretim aralığının dışında: "
                    + "; ".join(f"{_PRODUCT_NAME[f]} {_th(lo)}–{_th(hi)} mm" for f, (lo, hi) in limits) + ".")
        if all(length < lo for _, (lo, _hi) in limits):
            text += f" Daha kısa boylar için {link('hazır boy ürünlerimize', '/hazir-urunler')} bakabilirsiniz."
        if any(f == "bi-metal" for f in fams) and m51 and length >= LENGTH_LIMITS["bi-metal"][0]:
            text += " Bu boyda Bi-Metal M42 Premium sipariş edilebilir."
        text += f" Farklı bir ihtiyacınız varsa {link('İletişim sayfamızdan', '/iletisim')} bize yazabilirsiniz."
        return text

    @staticmethod
    def _price_fallback(family: Optional[str]) -> str:
        fams = [family] if family in FAMILIES else list(FAMILIES.keys())[:2]
        links = ", ".join(link(lbl, path) for f in fams for lbl, path in FAMILIES[f]["links"])
        return f"Ürün sayfasında ölçüyü seçtiğiniz anda fiyat hesaplanır: {links}."

    # ------------------------------------------------------------------ #
    # Hazır stok
    # ------------------------------------------------------------------ #

    def _stock_answer(self, session: Any, n: str, length: Optional[int] = None,
                      dims: Optional[Tuple[float, float]] = None,
                      tpi: Optional[str] = None) -> Tuple[str, bool]:
        """(cevap, aynı ölçünün özel üretim fiyatı da eklendi mi)."""
        length = length or parse_length(n)
        dims = dims or parse_width_thickness(n)
        tpi = tpi or parse_tpi(n)
        items = self.store.ready_made() if self.store.enabled else []
        all_link = link("tüm hazır boy ürünler", "/hazir-urunler")
        if not items:
            return f"Stoktaki hazır boy ürünlerimizi buradan görebilirsiniz: {all_link}.", False

        if not length and not dims:
            boylar = sorted({int(i["length_mm"]) for i in items if i.get("length_mm")})
            session.front_desk_pending = {"kind": "stock"}
            return (f"Stokta {len(items)} hazır boy ürünümüz var (boylar: "
                    + ", ".join(f"{b}" for b in boylar[:15]) + " mm). Hangi boyu arıyorsunuz? "
                    f"Hepsi: {all_link}."), False

        session.front_desk_last_stock = {"length": length, "dims": dims, "tpi": tpi,
                                         "turn": getattr(session, "front_desk_turn", None)}

        def same_dims(i):
            return not dims or (i.get("width_mm") and abs(i["width_mm"] - dims[0]) < 1e-6
                                and i.get("thickness_mm") and abs(i["thickness_mm"] - dims[1]) < 1e-6)

        def same_tpi(i):
            return not tpi or norm(str(i.get("tooth_pitch") or "")).replace(" ", "") == tpi

        exact = [i for i in items if same_dims(i) and same_tpi(i)
                 and (not length or (i.get("length_mm") and abs(i["length_mm"] - length) < 0.5))]
        want = (f"{length} mm" if length else "") + (f" ({mm(dims[0])} × {mm(dims[1])})" if dims else "")
        if exact:
            rows = [self._ready_row(i) for i in sorted(exact, key=lambda i: (i.get("price") or 0))[:6]]
            more = f"\n…ve {len(exact) - 6} ürün daha: {all_link}" if len(exact) > 6 else ""
            return f"**Evet, {want.strip()} hazır stokta:**\n" + "\n".join(rows) + more, False

        near = [i for i in items if same_dims(i) and i.get("length_mm") and length
                and abs(i["length_mm"] - length) <= 300]
        near.sort(key=lambda i: abs(i["length_mm"] - length))
        text = f"{want.strip()} hazır stokta yok."
        if near:
            text += " En yakın hazır boylar:\n" + "\n".join(self._ready_row(i) for i in near[:3])
        text += ("\n\nİstediğiniz boyda, ölçünüze göre kaynaklı da üretiyoruz"
                 + (" — genişlik × kalınlığı yazarsanız fiyatını hemen hesaplarım." if not dims else "."))
        if not dims and length and GLOBAL_MIN_LENGTH <= length <= GLOBAL_MAX_LENGTH:
            # Sonraki "27x0.9" bu boyla fiyatlansın
            session.front_desk_pending = {"kind": "price", "family": detect_family(n), "dims": None,
                                          "length": length, "tpi": tpi, "qty": None,
                                          "m51": _wants_m51(n)}
        quoted = False
        if dims and length and GLOBAL_MIN_LENGTH <= length <= GLOBAL_MAX_LENGTH:
            # Hazır ürünlerimiz bi-metal; aynı ölçünün özel üretimini de o
            # aileden fiyatla (ahşap/sünger gibi ilgisiz aileler listelenmesin).
            tree = self.store.price_options() or {}
            fam = "bi-metal" if _tree_tpis(tree, "bi-metal", dims[0], dims[1]) is not None else None
            fam = detect_family(n) or fam
            text += "\n\n" + self._quote(session, fam, dims, length, tpi,
                                         m51=fam == "bi-metal" and _wants_m51(n))
            quoted = True
        return text, quoted

    @staticmethod
    def _ready_row(i: Dict[str, Any]) -> str:
        price = f" — {tl(i['price'])} + KDV" if i.get("price") else ""
        return f"- {link(i['title'], '/products/' + str(i['handle']))}{price}"

    # ------------------------------------------------------------------ #
    # Metal dışı
    # ------------------------------------------------------------------ #

    def _non_metal(self, session: Any, family: str, n: str) -> str:
        tree = (self.store.price_options() or {}) if self.store.enabled else {}
        info = FAMILIES[family]
        dims_txt = _available_dims(tree, family)
        links = ", ".join(link(lbl, path) for lbl, path in info["links"])
        intro = {
            "woodcut": ("Ahşap için **Ahşap Kesim** şerit testerelerimiz uygundur. Kereste biçme ve düz "
                        "kesimlerde geniş bıçak (20 mm ve üzeri), kavisli kesimlerde dar bıçak tercih edilir."),
            "meat-bone": ("Et, kemik ve donmuş gıda için hijyenik paslanmaz **Et-Kemik** şerit testerelerimiz "
                          "uygundur."),
            "textile": "Sünger, köpük ve tekstil için **Sünger-Tekstil** şerit testerelerimiz uygundur.",
        }[family]
        text = f"{intro} Ürün: {links}."
        if dims_txt:
            text += f" Mevcut genişlik × kalınlıklar: {dims_txt}."
        width = _width_mention(n or "", tree, family)
        dims = parse_width_thickness(n) if n else None
        if not dims and width is not None:
            th = _thickness_for_width(tree, family, width)
            if th:
                dims = (width, th)
                text += f" {mm(width)} mm genişlikte {mm(th)} mm kalınlıkta bıçağımız var."
        session.front_desk_pending = {"kind": "price", "family": family, "dims": dims,
                                      "length": None, "tpi": None}
        text += " Makinenizin bıçak boyunu (mm) yazarsanız fiyatı hemen hesaplayayım."
        return text

    @staticmethod
    def _plastic_composite() -> str:
        return (
            "Plastik ve kompozit malzemelerde uygun bıçak, malzemenin türüne ve sertliğine göre değişir. "
            f"Malzemeyi (ör. PVC, pleksi, CTP) ve kesit ölçüsünü yazarsanız ya da {link('bize ulaşırsanız', '/iletisim')} "
            "doğru bıçağı birlikte seçelim."
        )

    # ------------------------------------------------------------------ #
    # Takip (önceki turda eksik bilgi istenmişti)
    # ------------------------------------------------------------------ #

    def _new_topic(self, n: str) -> bool:
        return bool(self._symptoms(n)) or _any(_SHIPPING + "|" + _RETURN + "|" + _PAYMENT, n)

    def _follow_up(self, session: Any, pending: Dict[str, Any], n: str) -> Optional[FrontDeskReply]:
        # Yeni bir konu açıldıysa takip değil (kargo, arıza, seçim bilgisi…)
        if self._new_topic(n):
            return None
        if pending.get("kind") == "price":
            family = detect_family(n) or pending.get("family")
            dims = parse_width_thickness(n)
            confirmed = False
            if not dims and pending.get("dims_guess") and _any(_YES, n):
                dims, confirmed = tuple(pending["dims_guess"]), True
            if not dims and family:
                tree = (self.store.price_options() or {}) if self.store.enabled else {}
                w = _width_mention(n, tree, family, explicit=True)
                th = _thickness_for_width(tree, family, w) if w is not None else None
                if th:
                    dims = (w, th)
            new_length = parse_length(n)
            amb = None if new_length else ambiguous_metre(n)
            if amb:
                session.front_desk_pending = pending           # soru tekrarlanır, bilgi kaybolmaz
                return FrontDeskReply(
                    f"Boyu tam olarak anlayabilmem için mm cinsinden yazar mısınız? \"{amb[0]} metre {amb[1]}\" "
                    f"{_th(amb[0] * 1000 + amb[1] * 10)} mm mi, yoksa {_th(amb[0] * 1000)} mm boy ve {amb[1]} mm "
                    "genişlik mi demek istediniz?", final=True, kinds=["price"])
            length = new_length or pending.get("length")
            tpi = parse_tpi(n) or pending.get("tpi")
            qty = parse_qty(n) or pending.get("qty")
            m51 = pending.get("m51") or (family == "bi-metal" and _wants_m51(n))
            if (dims or new_length or confirmed) and (dims or pending.get("dims")):
                text = self._quote(session, family, dims or pending.get("dims"), length, tpi, qty=qty, m51=m51)
                return FrontDeskReply(text + "\n\n" + self._soft_continue(["price"]), final=True,
                                      kinds=["price"])
            if new_length and not (dims or pending.get("dims")):
                text = self._quote(session, family, None, length, tpi, qty=qty, m51=m51)
                return FrontDeskReply(text + "\n\n" + self._soft_continue(["price"]), final=True,
                                      kinds=["price"])
        if pending.get("kind") == "stock" and parse_length(n):
            text, _quoted = self._stock_answer(session, n + " hazir")
            return FrontDeskReply(text + "\n\n" + self._soft_continue(["stock"]), final=True, kinds=["stock"])
        return None

    def _context_follow_up(self, session: Any, n: str) -> Optional[FrontDeskReply]:
        """Son fiyat/stok cevabına göre kısa takip mesajı → yeniden fiyatla / en yakın hazır boy."""
        if (len(n.split()) > 10 or self._new_topic(n) or _any(_SELECTION, n)
                or _any(_INVOICE + "|" + _STOCK_WORD, n)):
            return None
        prev = (getattr(session, "front_desk_turn", None) or 0) - 1

        def recent(ctx):
            return ctx if ctx and ctx.get("turn") == prev else None

        last_stock = recent(getattr(session, "front_desk_last_stock", None))
        if last_stock and _any(_NEAREST, n):
            text, _quoted = self._stock_answer(session, "", last_stock.get("length"), last_stock.get("dims"),
                                               last_stock.get("tpi"))
            return FrontDeskReply(text + "\n\n" + self._soft_continue(["stock"]), final=True, kinds=["stock"])
        last = recent(getattr(session, "front_desk_last_quote", None))
        if not last or not _any(_FOLLOW_MARK, n):
            return None
        new_dims = parse_width_thickness(n)
        new_length = parse_length(n)
        if new_dims and new_length:
            return None                                 # tam yeni soru → normal akış
        new_family = detect_family(n)
        family = new_family or last.get("family")
        tree = (self.store.price_options() or {}) if self.store.enabled else {}
        if new_dims:
            dims, dims_mentioned = new_dims, True
        else:
            dims, dims_mentioned = _modify_dims(tuple(last["dims"]), family, n, tree)
        tpi = parse_tpi(n)
        qty = parse_qty(n)
        kdv = _any(r"\bkdv\w*", n) and not _any(r"\bkdv\w*\s*(\w+\s+)?haric", n)
        # "0.9 değil 1.1 olsa" — ölçü aynı kalsa da açıkça söylendiyse yeniden fiyatla
        changed = bool(dims_mentioned or new_length or new_family or tpi or qty or kdv)
        if not changed:
            return None
        same_item = not new_family and tuple(dims) == tuple(last["dims"])
        tpi = tpi or (last.get("tpi") if same_item else None)
        qty = qty or last.get("qty")
        m51 = (family == "bi-metal") and (_wants_m51(n) or (not new_family and last.get("m51")))
        text = self._quote(session, family, dims, new_length or last["length"], tpi, qty=qty, kdv=kdv, m51=m51)
        # Genişlik değişti, kalınlığı biz seçtik → diğer kalınlıkları da söyle ("34 mm: 1,1 / 1,2")
        if not new_dims and dims[0] != tuple(last["dims"])[0]:
            fams = [family] if family else list(tree.keys())
            ths = sorted({float(k) for f in fams
                          for k in ((tree.get(f) or {}).get(_tree_key(tree, f, dims[0])) or {})})
            if len(ths) > 1:
                text = (f"{mm(dims[0])} mm genişlikte {', '.join(mm(x) for x in ths)} mm kalınlık var; "
                        f"{mm(dims[1])} mm için fiyat aşağıda (farklı kalınlık için yazmanız yeterli).\n\n" + text)
        return FrontDeskReply(text + "\n\n" + self._soft_continue(["price"]), final=True, kinds=["price"])


def wants_selection(n: str) -> bool:
    """Kişiye özel bıçak/ölçü önerisi isteği (malzeme/kesit + ölçü veya 'hangi bıçak') → huni."""
    if not _any(_SELECTION, n):
        return False
    return bool(re.search(r"\d", n)) or _any(
        r"hangi (bica[kg]|serit|testere|urun|model|tpi|dis)|ne (almal|onerir)|tavsiye|oneri|oner", n)


# İstek / sorun cümlesi ("iptal etmek istiyorum", "mail gelmedi", "çalışmıyor") — soru eki
# olmasa da bilgi cevabı bekler. Huni cevapları ("bilmiyorum", "emin değilim") hariç.
_REQUEST = (r"\b(istiyorum|isterim|istiyoruz|nere\w*|nerden|ogrenmek|iptal|unuttum|giremiyorum)\b|"
            r"\w+m[iu]yor\w*|\w+m[ae]d[iu]\w*")
_FUNNEL_ANSWER = r"\b(bilmiyorum|emin degil\w*|hatirlamiyorum)\b"
# Makine veritabanının çözmesi gereken mesajlar (marka adı geçiyor) kütüphaneye gitmez
_BRAND_STOP = {"metal", "makina", "makine", "test", "uzay", "kesim", "serit", "testere"}


def _load_machine_brands() -> Optional["re.Pattern[str]"]:
    try:
        rows = json.load(open(os.path.join(_DATA, "machines_list.json"), encoding="utf-8"))
        aliases = json.load(open(os.path.join(_DATA, "machine_brand_aliases.json"), encoding="utf-8"))
    except Exception:
        return None
    rows = rows.get("machines") if isinstance(rows, dict) else rows
    generic = {norm(x) for x in aliases.get("generic_word_brands") or []}
    names = {norm(r.get("manufacturer", "")) for r in rows or []}
    for canon, alts in (aliases.get("brands") or {}).items():
        names.add(norm(canon))
        names.update(norm(a) for a in alts)
    names = {x for x in names if len(x) >= 4 and x not in generic and x not in _BRAND_STOP}
    if not names:
        return None
    return re.compile(r"(?<![a-z0-9])(" + "|".join(sorted(map(re.escape, names), key=len, reverse=True))
                      + r")(?![a-z0-9])")


_MACHINE_BRANDS = _load_machine_brands()


def mentions_machine(n: str) -> bool:
    return bool(_MACHINE_BRANDS and _MACHINE_BRANDS.search(n))


def kb_eligible(n: str) -> bool:
    """
    Mesaj bilgi kütüphanesine gidebilir mi? Soru ya da istek/sorun cümlesi olmalı;
    kişiye özel seçim, makine adı ve huni cevapları (tek kelime, sayı, 'bilmiyorum') hariç.
    """
    if not n or wants_selection(n) or mentions_machine(n):
        return False
    if _any(_ASKS, n):
        return True
    if _any(_FUNNEL_ANSWER, n) or len(n.split()) < 2:
        return False
    return _any(_REQUEST, n)


def _safe_kb() -> Optional[KnowledgeBase]:
    try:
        return default_kb()
    except Exception:   # kütüphane okunamazsa ön masa eskisi gibi çalışır
        return None


def _question_payload(question) -> Optional[Dict[str, Any]]:
    """DialogManager._question_payload ile aynı biçim (döngüsel içe aktarma yok)."""
    if question is None:
        return None
    return {
        "id": question.id,
        "text": question.text,
        "type": question.type,
        "writes_to": question.writes_to,
        "options": [{"value": o.value, "label": o.label} for o in (question.options or [])],
    }


# --------------------------------------------------------------------------- #
# Fiyat yardımcıları
# --------------------------------------------------------------------------- #

def _length_limits(fam: str, m51: bool = False) -> Tuple[int, int]:
    if fam == "bi-metal" and m51:
        return M51_LENGTH_LIMITS
    return LENGTH_LIMITS.get(fam, (GLOBAL_MIN_LENGTH, GLOBAL_MAX_LENGTH))


def _price_text(lo: float, hi: float, kdv: bool) -> str:
    if kdv:
        a, b = round(lo * (1 + KDV_RATE), 2), round(hi * (1 + KDV_RATE), 2)
        rng = tl(a) if a == b else f"{tl(a).replace(' TL', '')} – {tl(b)}"
        return f"{rng} KDV dahil"
    rng = tl(lo) if lo == hi else f"{tl(lo).replace(' TL', '')} – {tl(hi)}"
    return f"{rng} + KDV"


def _qty_line(qty: int, rows: List[Tuple[Optional[str], Dict[str, Any]]], kdv: bool) -> Tuple[str, Optional[float]]:
    """N adet toplamı — backend lib/blade-line.ts ile aynı: (birim × adet + kaynak ücreti bir kez)
    × (100 − adet indirimi) / 100. API birim/kaynak ücretini döndürmezse tutar sepete bırakılır."""
    d = qty_discount_percent(qty)
    totals = []
    for _, r in rows:
        unit, weld = r.get("unit_price"), r.get("welding_fee")
        if isinstance(unit, (int, float)) and isinstance(weld, (int, float)):
            totals.append(round((float(unit) * qty + float(weld)) * (100 - d) / 100, 2))
    disc = f", %{d} adet indirimi dahil" if d else ""
    if totals and len(totals) == len(rows):
        lo, hi = min(totals), max(totals)
        return (f"  {qty} adet toplam: **{_price_text(lo, hi, kdv)}** (kaynak ücreti satır başına bir kez"
                f"{disc})"), (lo * (1 + KDV_RATE) if kdv else lo)
    tail = f"; {qty} adette %{d} adet indirimi uygulanır" if d else ""
    return f"  {qty} adet için toplam tutar sepette hesaplanır{tail}.", None


def _modify_dims(dims: Tuple[float, float], family: Optional[str], n: str,
                 tree: Dict[str, Any]) -> Tuple[Tuple[float, float], bool]:
    """Takip mesajındaki tek ölçü değişikliği: "34'lük olsa" (genişlik), "0.9 değil 1.1" (kalınlık).
    (yeni ölçü, mesajda genişlik/kalınlık açıkça geçti mi)."""
    w, t = dims
    mentioned = False
    s = re.sub(r"\d+(?:[.,]\d+)?\s*/\s*\d+(?:[.,]\d+)?", " ", n)          # diş adımı
    s = re.sub(r"(?<![\d.,])\d{1,4}\s*(?:adet|tane|parca)\b", " ", s)      # adet
    thick = [m for m in re.finditer(r"(?<![\d.,])([01][.,]\d{1,2})(?![\d])", s)
             if not re.match(r"\s*(?:mm\s*)?degil", s[m.end():])]
    if thick:
        nt = _f(thick[-1].group(1))
        if 0.3 <= nt <= 2.0:
            t, mentioned = nt, True
    fams = [family] if family else list(tree.keys())
    widths = {float(k) for f in fams for k in (tree.get(f) or {}).keys()}
    for m in re.finditer(r"(?<![\d.,/])(\d{1,2})\s*'?\s*(?:l[iu]k|lu|li|mm)?\b(?![.,]\d|\s*(?:tpi|/))", s):
        v = float(m.group(1))
        if v not in widths:
            continue
        mentioned = True
        if v != w:
            w = v
            ths = sorted(float(k) for f in fams for k in ((tree.get(f) or {}).get(_tree_key(tree, f, v)) or {}))
            if ths and not any(abs(x - t) < 1e-6 for x in ths) and not thick:
                t = ths[0]
        break
    return (w, t), mentioned


def _tree_key(tree: Dict[str, Any], fam: str, w: float) -> Optional[str]:
    for wk in (tree.get(fam) or {}):
        if abs(float(wk) - w) < 1e-6:
            return wk
    return None


def _width_mention(n: str, tree: Dict[str, Any], family: str, explicit: bool = False) -> Optional[float]:
    """Genişlik: "20 mm genişlik", "genişlik 20", ya da bu ailenin genişlik listesinde bulunan
    herhangi bir "NN mm" ("kereste için 20 mm bıçak"). explicit=True → yalnız "genişlik" kelimesiyle."""
    fam_widths = {float(w) for w in (tree.get(family) or {}).keys()}
    rx = (r"(\d{1,2}(?:[.,]\d)?)\s*(?:mm\s*)?genislik\w*|genislik\w*\s*(\d{1,2})" if explicit
          else r"(\d{1,2}(?:[.,]\d)?)\s*mm|genislik\w*\s*(\d{1,2})")
    for m in re.finditer(rx, n or ""):
        v = _f(m.group(1) or m.group(2))
        if v in fam_widths or (not fam_widths and 6 <= v <= 60):
            return v
    return None


# --------------------------------------------------------------------------- #
# Fiyat ağacı yardımcıları
# --------------------------------------------------------------------------- #

def _tree_tpis(tree: Dict[str, Any], fam: str, w: float, t: float) -> Optional[List[str]]:
    """Ağaçta (genişlik, kalınlık) varsa diş listesi ([] olabilir), yoksa None."""
    widths = tree.get(fam) or {}
    for wk, ths in widths.items():
        if abs(float(wk) - w) < 1e-6:
            for tk, tpis in (ths or {}).items():
                if abs(float(tk) - t) < 1e-6:
                    return list(tpis or [])
    return None


def _thickness_for_width(tree: Dict[str, Any], fam: str, w: float) -> Optional[float]:
    for wk, ths in (tree.get(fam) or {}).items():
        if abs(float(wk) - w) < 1e-6 and ths:
            return float(sorted(ths.keys(), key=float)[0])
    return None


def _available_dims(tree: Dict[str, Any], fam: Optional[str]) -> str:
    fams = [fam] if fam else list(tree.keys())
    out = []
    for f in fams:
        for wk in sorted((tree.get(f) or {}).keys(), key=float):
            for tk in sorted((tree[f][wk] or {}).keys(), key=float):
                out.append(f"{mm(float(wk))}×{mm(float(tk))}")
    seen, uniq = set(), []
    for d in out:
        if d not in seen:
            seen.add(d)
            uniq.append(d)
    return ", ".join(uniq)
