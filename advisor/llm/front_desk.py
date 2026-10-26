"""
Danışmanın ÖN MASASI — kural motoru hunisinden ÖNCE çalışan, LLM'siz katman.

Sorun: her mesaj doğrudan "Ne keseceksiniz?" hunisine giriyordu. Müşteri
"kargo ne kadar?", "27×0,9 2750 mm kaç para?", "1638 mm hazır var mı?",
"bıçağım çabuk köreliyor" diye sorduğunda cevap yerine anket sorusu
alıyordu; konu dışı ve ahşap sorularına anlamsız hazır cümle dönüyordu.

Bu katman önce müşterinin SORDUĞUNU cevaplar:
  - mağaza soruları (kargo, iade/cayma, ödeme, fatura, iletişim)
  - fiyat (sitenin fiyat hesaplayıcısıyla) ve hazır stok (gerçek ürün listesi)
  - arıza teşhisi (Starrett tabanlı arıza tablosu, önce en olası neden)
  - ahşap / et-kemik / sünger-tekstil yönlendirmesi (metal hunisi bunları
    karşılamıyor)
  - konu dışı sorular
Ürün seçimi gerekiyorsa mevcut huni (DialogManager) aynen devam eder.

Kurallar (kullanıcı kararları, 2026-10-26):
  - Kimlik "TestereStore asistanı"; yalnızca BİZİM katalogdaki ürün adları.
  - Teslim süresi VERİLMEZ ("en kısa sürede kargoya verilir").
  - Sayılar uydurulmaz: fiyat backend'den, stok ürün listesinden, kargo
    kuralı mağazanın tek kaynağından (storefront lib/shipping.ts ile aynı).
  - Hitap "siz".
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from llm.store_client import StoreClient

SITE_URL = os.environ.get("ADVISOR_SITE_URL", "https://testerestore.com").rstrip("/")

# Mağaza kargo kuralı — storefront lib/shipping.ts ve Medusa fiyat kuralı ile aynı.
FREE_SHIPPING_THRESHOLD_INCL_VAT = 2000
STANDARD_SHIPPING_FEE = 79.9
KDV_RATE = 0.20

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


def link(label: str, path: str) -> str:
    return f"[{label}]({SITE_URL}{path})"


def _any(pattern: str, text: str) -> bool:
    return re.search(pattern, text) is not None


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

_FAMILY_PATTERNS: List[Tuple[str, str]] = [
    ("carbide", r"karbur|\btct\b|carbide"),
    ("bi-metal", r"bi-?metal|\bm ?42\b|\bm ?51\b|\bhss\b"),
    ("woodcut", r"ahsap|kereste|tomruk|marangoz|\bmdf\b|sunta|kontrplak|\bagac|\bodun|kutuk|mobilya|parke"),
    # "et kalınlığı" (profil cidarı) et-kemik DEĞİL
    ("meat-bone", r"\bet\b(?!\s*kalin)|et-kemik|kemik|kasap|\bbalik|dondurulmus|donuk et|tavuk"),
    ("textile", r"sunger|kopuk|tekstil|kumas|strafor|yalitim|\bkece"),
]


def detect_family(n: str) -> Optional[str]:
    for fam, pat in _FAMILY_PATTERNS:
        if _any(pat, n):
            return fam
    return None


# --------------------------------------------------------------------------- #
# Ölçü ayrıştırma
# --------------------------------------------------------------------------- #

_NUM = r"\d+(?:[.,]\d+)?"


def _f(s: str) -> float:
    return float(s.replace(",", "."))


def parse_width_thickness(n: str) -> Optional[Tuple[float, float]]:
    """"27x0.9", "27 x 0,9", "27*0.9", "27×0.9" → (27, 0.9). 60x60 (profil) değil."""
    for m in re.finditer(rf"({_NUM})\s*[x×*]\s*({_NUM})", n):
        w, t = _f(m.group(1)), _f(m.group(2))
        if 3 <= w <= 80 and 0.3 <= t <= 2.0:
            return (w, t)
    return None


def parse_length(n: str) -> Optional[int]:
    """Boy: "2750 mm", "2750mm", "2,75 m", "1638 mm hazır", tek başına 4 haneli sayı."""
    cleaned = re.sub(rf"{_NUM}\s*[x×*]\s*{_NUM}", " ", n)  # genişlik×kalınlığı çıkar
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:metre|mt|m)\b", cleaned)
    if m and _f(m.group(1)) < 20:
        return int(round(_f(m.group(1)) * 1000))
    for m in re.finditer(r"(\d{3,5})\s*(?:mm|milim\w*)?", cleaned):
        v = int(m.group(1))
        if 300 <= v <= 20000:
            return v
    return None


def parse_tpi(n: str) -> Optional[str]:
    m = re.search(r"(\d{1,2}(?:[.,]\d{1,2})?\s*/\s*\d{1,2}(?:[.,]\d{1,2})?)", n)
    if m:
        return re.sub(r"\s+", "", m.group(1)).replace(",", ".")
    m = re.search(r"\b(\d{1,2})\s*tpi\b", n)
    return m.group(1) if m else None


# --------------------------------------------------------------------------- #
# Niyet kalıpları
# --------------------------------------------------------------------------- #

_OFF_TOPIC = (r"\b(siir|sarki|hikaye|masal|fikra|hava durumu|hava nasil|futbol|basketbol|"
              r"siyaset|secim|yemek tarif|tarifi|kod yaz|python|javascript|odevim|"
              r"ceviri yap|tercume et|bilmece|burcum|astroloji|film oner|dizi oner|"
              r"sohbet edelim|fikra anlat)")
# Not: "bıçak" çekimde "bıçağım/bıçağı" olur (k→ğ); sade biçimde "bicag".
_DOMAIN = (r"serit|testere|bica[kg]|tpi|\bdis|kesim|kesiyor|kesece|kesmek|makine|metal|celik|"
           r"paslanmaz|aluminyum|dokum|profil|boru|\bmil\b|lama|\bsac\b|kaynak|bimetal|"
           r"bi-metal|m42|m51|karbur|siparis|kargo|fiyat|stok|hazir|odeme|iade|fatura|\d+\s*mm")
_SHIPPING = r"kargo|teslimat|ne zaman gel|kac gunde|gonderim|gonderi|kargoya"
_RETURN = r"\biade|cayma|geri gonder|degisim|degistir|geri al"
_PAYMENT = r"odeme|taksit|kredi kart|banka kart|havale|\beft\b|kapida|nakit|kartla|kart ile"
_INVOICE = r"fatura|vergi no|vergi numara|e-?fatura"
_CONTACT = (r"telefon|iletisim|ulas(abilir|mak|irim|alim|abilece)|adresiniz|nerdesiniz|"
            r"neredesiniz|whatsapp|e-?posta|mail adres")
_PRICE = r"fiyat|kac para|kac tl|kac lira|ne kadar|ucret|tutar|maliyet|kaca"
_STOCK = r"hazir|stok|elinizde|mevcut mu|var mi|bulunuyor mu"
_SELECTION = (r"paslanmaz|karbon|celik|aluminyum|dokum|pirinc|bakir|titanyum|\bdolu\b|"
              r"\bmil\b|profil|boru|lama|\bsac\b|kutu|kesiyorum|keseceg|makinem|modeli")

# Arıza belirtileri (RAG v2 diagnostics.py kalıpları) → arıza tablosu id
_SYMPTOMS: List[Tuple[str, str]] = [
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
    # araya kelime girebilir: "talaş diş boşluğunda sıkışıyor"
    ("chips_in_gullet", r"talas.{0,25}(sikis|birik|tikan|dol)|dis\s*boslug\w*.{0,15}(talas|tikan|dol)"),
    ("blade_back_wear", r"sirt.{0,10}asin|bica[kg]\w*\s*sirti"),
    ("blade_surface_damage", r"govde.{0,12}(hasar|cizik)|yuzey.{0,10}hasar"),
    ("twisted_blade", r"burul|bica[kg]\w*\s*bukul|kivril"),
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

_QTY_DISCOUNT_NOTE = "Adet indirimi sepette uygulanır: 3+ adet %5, 5+ adet %10, 10+ adet %15."


def _load_troubleshooting() -> Dict[str, Dict[str, Any]]:
    try:
        with open(os.path.join(_DATA, "troubleshooting_tr.json"), encoding="utf-8") as f:
            return {t["id"]: t for t in json.load(f)["troubleshooting"]}
    except Exception:
        return {}


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
    def __init__(self, store: Optional[StoreClient] = None):
        self.store = store or StoreClient()
        self.trouble = _load_troubleshooting()

    # ------------------------------------------------------------------ #
    # Ana giriş
    # ------------------------------------------------------------------ #

    def handle(self, session: Any, message: str) -> Optional[FrontDeskReply]:
        n = norm(message)
        if not n:
            return None

        # Önceki turda eksik bilgi istendiyse (fiyat için boy gibi) tamamla
        pending = getattr(session, "front_desk_pending", None)
        session.front_desk_pending = None
        if pending:
            follow = self._follow_up(session, pending, n)
            if follow:
                return follow

        if _any(_OFF_TOPIC, n) and not _any(_DOMAIN, n):
            return FrontDeskReply(self._off_topic(), final=True, kinds=["off_topic"])

        parts: List[str] = []
        kinds: List[str] = []

        symptoms = self._symptoms(n)
        if symptoms:
            parts.append(self._trouble_answer(symptoms))
            kinds.append("troubleshoot")
        elif _any(_TROUBLE_GENERIC, n) and _any(r"bica[kg]|serit|testere|kesim|makine", n):
            parts.append(self._trouble_ask())
            kinds.append("troubleshoot")

        if _any(_SHIPPING, n):
            parts.append(self._shipping())
            kinds.append("shipping")
        if _any(_RETURN, n):
            parts.append(self._returns())
            kinds.append("returns")
        if _any(_PAYMENT, n):
            parts.append(self._payment(n))
            kinds.append("payment")
        if _any(_INVOICE, n):
            parts.append(self._invoice())
            kinds.append("invoice")
        if _any(_CONTACT, n) and "shipping" not in kinds:
            parts.append(self._contact())
            kinds.append("contact")

        family = detect_family(n)
        wants_price = _any(_PRICE, n) and not ("shipping" in kinds and not parse_width_thickness(n))
        wants_stock = _any(_STOCK, n) and (parse_length(n) or _any(r"hazir|stok", n))

        if wants_stock and "troubleshoot" not in kinds:
            parts.append(self._stock_answer(session, n))
            kinds.append("stock")
        elif wants_price:
            parts.append(self._price_answer(session, n, family))
            kinds.append("price")

        if family in ("woodcut", "meat-bone", "textile") and not {"price", "stock"} & set(kinds):
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
                result["message"] = (
                    f"Verdiğiniz bilgilere göre önerilen diş adımı: **{tpi} TPI**. "
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
            f"standart kargo ücretsizdir; altındaki siparişlerde kargo ücreti {tl(STANDARD_SHIPPING_FEE)} + KDV'dir. "
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
            f"**İletişim:** {link('İletişim sayfamızdan', '/iletisim')} mesaj gönderebilir ya da sayfanın sağ "
            "altındaki WhatsApp butonuyla bize yazabilirsiniz."
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

    def _symptoms(self, n: str) -> List[str]:
        found = [sid for sid, pat in _SYMPTOMS if _any(pat, n)]
        return [s for s in found if s in self.trouble][:2]

    def _trouble_answer(self, symptoms: List[str]) -> str:
        blocks = []
        for sid in symptoms:
            t = self.trouble[sid]
            causes = [(c["cause_tr"], c["action_tr"]) for c in t["causes_and_actions"]]
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
        return self._quote(session, family, dims, length, tpi)

    def _quote(self, session: Any, family: Optional[str], dims: Optional[Tuple[float, float]],
               length: Optional[int], tpi: Optional[str]) -> str:
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
                                          "length": length, "tpi": tpi}
            fam_txt = f" {FAMILIES[family]['label']}" if family in FAMILIES else ""
            return (f"Fiyatı{fam_txt} hemen hesaplayabilirim; bunun için " + " ve ".join(missing)
                    + " yazar mısınız?" + ("" if family else " Bıçak tipini de (bi-metal, karbür, ahşap…) "
                                               "belirtirseniz tek fiyat veririm."))

        if length < 1000 or length > 15000:
            return (f"Ölçüye göre üretimde boy 1.000–15.000 mm arasında olabiliyor; {length} mm için "
                    f"{link('hazır boy ürünlerimize', '/hazir-urunler')} bakabilirsiniz.")

        w, t = dims
        fams = [family] if family else list(FAMILIES.keys())
        lines: List[str] = []
        lowest: Optional[float] = None
        for fam in fams:
            tpis = _tree_tpis(tree, fam, w, t)
            if tpis is None:
                continue
            use = [tpi] if tpi and tpi in tpis else (tpis or [None])
            totals = []
            for tp in use:
                r = self.store.calculate(fam, w, t, length, tp)
                if r and isinstance(r.get("total_price"), (int, float)):
                    totals.append((tp, float(r["total_price"])))
            if not totals:
                continue
            lo, hi = min(x[1] for x in totals), max(x[1] for x in totals)
            lowest = lo if lowest is None else min(lowest, lo)
            spec = f"{mm(w)} × {mm(t)} mm, {length} mm"
            if tpi and tpi in tpis:
                spec += f", {tpi} TPI"
            price = tl(lo) if lo == hi else f"{tl(lo).replace(' TL', '')} – {tl(hi)}"
            note = "" if lo == hi or (tpi and tpi in tpis) else " (diş adımına göre)"
            links = ", ".join(link(lbl, path) for lbl, path in FAMILIES[fam]["links"])
            lines.append(f"- **{FAMILIES[fam]['label']}** — {spec}: **{price} + KDV**{note} · {links}")
            if tpi and tpi not in tpis and tpis:
                lines.append(f"  _{tpi} TPI bu ölçüde yok; mevcut diş adımları: {', '.join(tpis)}._")

        if not lines:
            avail = _available_dims(tree, family)
            return (f"{mm(w)} × {mm(t)} mm ölçüsü"
                    + (f" {FAMILIES[family]['label']} ailesinde" if family in FAMILIES else "")
                    + " fiyat listemizde yok. Mevcut genişlik × kalınlıklar: " + avail + ".")

        ship = ""
        if lowest is not None:
            ship = (" Bu tutarla kargo ücretsiz." if lowest * (1 + KDV_RATE) >= FREE_SHIPPING_THRESHOLD_INCL_VAT
                    else " KDV dahil 2.000 TL ve üzeri siparişlerde kargo ücretsiz.")
        return ("**Fiyat (1 adet, kaynak dahil, KDV hariç):**\n" + "\n".join(lines)
                + f"\n\n{_QTY_DISCOUNT_NOTE}{ship}")

    @staticmethod
    def _price_fallback(family: Optional[str]) -> str:
        fams = [family] if family in FAMILIES else list(FAMILIES.keys())[:2]
        links = ", ".join(link(lbl, path) for f in fams for lbl, path in FAMILIES[f]["links"])
        return f"Ürün sayfasında ölçüyü seçtiğiniz anda fiyat hesaplanır: {links}."

    # ------------------------------------------------------------------ #
    # Hazır stok
    # ------------------------------------------------------------------ #

    def _stock_answer(self, session: Any, n: str) -> str:
        length = parse_length(n)
        dims = parse_width_thickness(n)
        tpi = parse_tpi(n)
        items = self.store.ready_made() if self.store.enabled else []
        all_link = link("tüm hazır boy ürünler", "/hazir-urunler")
        if not items:
            return f"Stoktaki hazır boy ürünlerimizi buradan görebilirsiniz: {all_link}."

        if not length and not dims:
            boylar = sorted({int(i["length_mm"]) for i in items if i.get("length_mm")})
            session.front_desk_pending = {"kind": "stock"}
            return (f"Stokta {len(items)} hazır boy ürünümüz var (boylar: "
                    + ", ".join(f"{b}" for b in boylar[:15]) + " mm). Hangi boyu arıyorsunuz? "
                    f"Hepsi: {all_link}.")

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
            return f"**Evet, {want.strip()} hazır stokta:**\n" + "\n".join(rows) + more

        near = [i for i in items if same_dims(i) and i.get("length_mm") and length
                and abs(i["length_mm"] - length) <= 300]
        near.sort(key=lambda i: abs(i["length_mm"] - length))
        text = f"{want.strip()} hazır stokta yok."
        if near:
            text += " En yakın hazır boylar:\n" + "\n".join(self._ready_row(i) for i in near[:3])
        text += ("\n\nİstediğiniz boyda, ölçünüze göre kaynaklı da üretiyoruz"
                 + (" — genişlik × kalınlığı yazarsanız fiyatını hemen hesaplarım." if not dims else "."))
        if dims and length and 1000 <= length <= 15000:
            # Hazır ürünlerimiz bi-metal; aynı ölçünün özel üretimini de o
            # aileden fiyatla (ahşap/sünger gibi ilgisiz aileler listelenmesin).
            tree = self.store.price_options() or {}
            fam = "bi-metal" if _tree_tpis(tree, "bi-metal", dims[0], dims[1]) is not None else None
            text += "\n\n" + self._quote(session, detect_family(n) or fam, dims, length, tpi)
        return text

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
        # Genişlik: "20 mm genişlik", "genişlik 20", ya da bu ailenin genişlik
        # listesinde bulunan herhangi bir "NN mm" ("kereste için 20 mm bıçak").
        width = None
        fam_widths = {float(w) for w in (tree.get(family) or {}).keys()}
        for m in re.finditer(r"(\d{1,2}(?:[.,]\d)?)\s*mm|genislik\w*\s*(\d{1,2})", n or ""):
            v = _f(m.group(1) or m.group(2))
            if v in fam_widths or (not fam_widths and 6 <= v <= 60):
                width = v
                break
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

    def _follow_up(self, session: Any, pending: Dict[str, Any], n: str) -> Optional[FrontDeskReply]:
        # Yeni bir konu açıldıysa takip değil (kargo, arıza, seçim bilgisi…)
        if self._symptoms(n) or _any(_SHIPPING + "|" + _RETURN + "|" + _PAYMENT, n):
            return None
        if pending.get("kind") == "price":
            dims = parse_width_thickness(n) or pending.get("dims")
            length = parse_length(n) or pending.get("length")
            tpi = parse_tpi(n) or pending.get("tpi")
            family = detect_family(n) or pending.get("family")
            if (dims or length) and (parse_width_thickness(n) or parse_length(n)):
                text = self._quote(session, family, dims, length, tpi)
                return FrontDeskReply(text + "\n\n" + self._soft_continue(["price"]), final=True,
                                      kinds=["price"])
        if pending.get("kind") == "stock" and parse_length(n):
            text = self._stock_answer(session, n + " hazir")
            return FrontDeskReply(text + "\n\n" + self._soft_continue(["stock"]), final=True,
                                  kinds=["stock"])
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
