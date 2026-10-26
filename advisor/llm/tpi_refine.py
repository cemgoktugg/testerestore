"""
Diş adımı (TPI) inceltme — kural motorundan SONRA çalışan iki adım.

1) Dolu malzemede gerçek çap: kural motoru çapı kovaya (D1–D5) çevirip kova
   başına tek TPI veriyor. Müşteri "40 mm mil" dediyse tam sayıyı ürün
   sayfasındaki Starrett dolu malzeme çizelgesine (BladeSpecVisualizer.tsx
   VARIABLE_SOLID, aynı seçim kuralı) uygularız → sohbet ile ürün sayfası
   aynı sonucu verir.

2) Satılan dişlere oturtma: önerilen TPI, bıçağın genişlik × kalınlığında
   fiyat listemizde yoksa (ör. 27×0,9'da 6/10 yok) en yakın SATILAN diş
   adımına çekilir; aksi hâlde müşteriye sipariş edemeyeceği bir ürün kodu
   verirdik. Kaynak: /store/blade-price/options (mağaza kapalıysa aşağıdaki
   anlık görüntü).

TPI veya SKU uydurulmaz: değerler çizelgeden ve fiyat listesinden gelir, SKU
ve kesme hızı rules.json'daki kendi kurallarıyla yeniden hesaplanır.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from rules_engine.rule_evaluator import RuleEvaluator
from rules_engine.rule_executor import RuleExecutor

logger = logging.getLogger(__name__)

# Starrett "Vollmaterial" değişken diş çizelgesi (mm) — ürün sayfasıyla aynı
# satırlar, en inceden en kabaya. Etiketler katalog yazımında (nokta).
VARIABLE_SOLID: List[Tuple[float, float, str]] = [
    (3, 25, "12/16"),
    (10, 25, "10/14"),
    (15, 40, "8/12"),
    (15, 25, "8/11"),
    (25, 50, "6/10"),
    (25, 60, "6/9"),
    (40, 70, "5/8"),
    (40, 80, "5/7"),
    (50, 100, "4/6"),
    (70, 130, "3/4"),
    (100, 180, "2/3"),
    (150, 200, "1.9/2.1"),
    (180, 300, "1.4/2"),
    (200, 300, "1.4/1.8"),
    (220, 400, "1.1/1.4"),
    (300, 400, "0.9/1.1"),
    (400, 550, "0.75/1.25"),
    (500, 600, "0.7/0.9"),
]

# /store/blade-price/options anlık görüntüsü (2026-10-26, canlı). Yalnızca
# mağaza API'sine ulaşılamazsa kullanılır.
FALLBACK_TREE: Dict[str, Dict[str, Dict[str, List[str]]]] = {
    "bi-metal": {
        "13": {"0.6": ["10/14", "8/12", "14", "6/10", "18", "14/18"], "0.5": ["10/14", "18", "14"]},
        "27": {"0.9": ["4/6", "5/8", "3/4", "2/3", "8"]},
        "34": {"1.1": ["3/4", "2/3", "4/6"], "1.2": ["3/4"]},
        "41": {"1.3": ["1.4/2", "2/3", "3/4"]},
        "54": {"1.6": ["2/3", "1.1/1.6", "1.4/2"]},
    },
    "carbide": {
        "27": {"0.9": ["3/4", "2/3"]},
        "34": {"1.1": ["3/4", "1.4/2", "2/3"]},
        "41": {"1.3": ["1.4/2", "2/3", "1.1/1.6"]},
        "54": {"1.6": ["1.4/2", "0.85/1.15", "1.1/1.6"]},
    },
}

# Kural motoru bıçak tipi → fiyat listesi ailesi
_BLADE_FAMILY = {"BI_METAL_M42_FLEXBACK": "bi-metal", "BI_METAL_M51": "bi-metal", "CARBIDE_TIPPED": "carbide"}

# TPI'den türeyen kurallar (yeni TPI ile yeniden çalıştırılır)
_DERIVED_RULE_PREFIXES = ("R_BUILD_SKU", "R_CUTTING_SPEED")


# --------------------------------------------------------------------------- #
# TPI yardımcıları
# --------------------------------------------------------------------------- #

def parse_tpi(label: Optional[str]) -> Optional[Tuple[float, float, float]]:
    """"1,4/2" → (ince=2, kaba=1.4, ort=1.7); "8" → (8, 8, 8)."""
    if not label:
        return None
    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", str(label).replace(",", "."))]
    nums = [x for x in nums if x > 0]
    if not nums:
        return None
    if len(nums) == 1:
        return (nums[0], nums[0], nums[0])
    fine, coarse = max(nums[:2]), min(nums[:2])
    return (fine, coarse, (fine + coarse) / 2)


def _is_variable(label: str) -> bool:
    p = parse_tpi(label)
    return bool(p and p[0] != p[1])


def starrett_solid_tpi(diameter_mm: float) -> Tuple[str, bool]:
    """
    Ürün sayfasındaki pickFromBands ile aynı: çapı kapsayan bantların ortancası;
    hiçbiri kapsamıyorsa en yakın bant. Dönüş: (etiket, yaklaşık_mı).
    """
    cov = [b for b in VARIABLE_SOLID if b[0] <= diameter_mm <= b[1]]
    if cov:
        return cov[(len(cov) - 1) // 2][2], False
    best = min(VARIABLE_SOLID, key=lambda b: (b[0] - diameter_mm) if diameter_mm < b[0] else (diameter_mm - b[1]))
    return best[2], True


def snap_to_available(target: str, available: List[str], prefer_coarse: bool) -> Optional[str]:
    """
    En yakın ortalama TPI'li SATILAN diş adımı. Hedef değişken dişse (6/10 gibi)
    ve listede değişken diş varsa yalnızca onlar arasından seçilir. Eşitlikte
    dolu kesitte kaba, ince cidarda ince diş tercih edilir.
    """
    tp = parse_tpi(target)
    if not tp or not available:
        return None
    if target in available:
        return target
    pool = available
    if _is_variable(target):
        variable = [a for a in available if _is_variable(a)]
        pool = variable or available
    scored = []
    for a in pool:
        p = parse_tpi(a)
        if p:
            scored.append((abs(p[2] - tp[2]), p[2] if prefer_coarse else -p[2], a))
    if not scored:
        return None
    scored.sort()
    return scored[0][2]


def family_tpis(tree: Dict[str, Any], family: str) -> List[str]:
    out: List[str] = []
    for ths in (tree.get(family) or {}).values():
        for tpis in (ths or {}).values():
            for t in tpis or []:
                if t not in out:
                    out.append(t)
    return out


def tree_tpis(tree: Dict[str, Any], family: str, width: float, thickness: float) -> Optional[List[str]]:
    for wk, ths in (tree.get(family) or {}).items():
        try:
            if abs(float(wk) - float(width)) > 1e-6:
                continue
        except (TypeError, ValueError):
            continue
        for tk, tpis in (ths or {}).items():
            try:
                if abs(float(tk) - float(thickness)) < 1e-6:
                    return list(tpis or [])
            except (TypeError, ValueError):
                continue
    return None


# --------------------------------------------------------------------------- #
# Çap ayrıştırma
# --------------------------------------------------------------------------- #

_TR = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiuCGIOSUAIU")
_NUM = r"\d+(?:[.,]\d+)?"
_SOLID_WORDS = r"(?:mil|dolu|yuvarlak|cubuk|kutuk|blok|transmisyon|silindir|kare|lama)"
_SUFFIX = r"(?:'|’)?\s*(?:lik|luk)?"  # 40'lık / 40 luk (ı/ü sadeleşmiş)

_DIAMETER_PATTERNS = [
    rf"(?:\bcap\w*|[ø⌀]|\bdia\w*)\s*[:=]?\s*({_NUM})",
    rf"({_NUM})\s*(?:mm)?\s*{_SUFFIX}\s*\bcap",
    rf"({_NUM})\s*(?:mm)?\s*(?:'|’)?\s*(?:lik|luk)\s*{_SOLID_WORDS}",
    rf"({_NUM})\s*mm\s*{_SOLID_WORDS}",
    rf"\b{_SOLID_WORDS}\w*\s*({_NUM})\s*mm",
]

# Kural motorundaki çap kovaları (rules.json Q_SOLID_MAX_DIAMETER), sınırlar dahil
DIAMETER_BUCKETS: List[Tuple[str, float, float]] = [
    ("D1", 0, 25), ("D2", 25, 50), ("D3", 50, 100), ("D4", 100, 200), ("D5", 200, 10_000),
]


def bucket_for(diameter_mm: float) -> str:
    for bid, lo, hi in DIAMETER_BUCKETS:
        if lo <= diameter_mm < hi:
            return bid
    return "D5"


def in_bucket(diameter_mm: float, bucket: Optional[str]) -> bool:
    for bid, lo, hi in DIAMETER_BUCKETS:
        if bid == bucket:
            return lo <= diameter_mm <= hi
    return False



def parse_solid_diameter(message: str, expecting: bool = False) -> Optional[float]:
    """
    Dolu kesit çapı (mm). "40 mm mil", "Ø40", "çapı 40", "40'lık dolu" →
    40. `expecting=True` (çap sorusu bekleniyordu) ise yalnız sayı / "40 mm"
    da kabul edilir. Genişlik×kalınlık (27x0.9) ve boy (2750 mm) karışmaz.
    """
    n = (message or "").translate(_TR).lower()
    n = re.sub(rf"{_NUM}\s*[x×*]\s*{_NUM}(?:\s*[x×*]\s*{_NUM})*", " ", n)  # 27x0.9, 60x60
    n = re.sub(r"\b\d{1,2}(?:[.,]\d{1,2})?\s*/\s*\d{1,2}(?:[.,]\d{1,2})?\b", " ", n)  # TPI
    for pat in _DIAMETER_PATTERNS:
        m = re.search(pat, n)
        if m:
            v = float(m.group(1).replace(",", "."))
            if 1 <= v <= 1000:
                return v
    if expecting:
        m = re.fullmatch(rf"\s*(?:yaklasik|ortalama|max|maks|en fazla|~)?\s*({_NUM})\s*(?:mm|milim\w*)?\s*\.?\s*", n)
        if m:
            v = float(m.group(1).replace(",", "."))
            if 1 <= v <= 1000:
                return v
    return None


# --------------------------------------------------------------------------- #
# Motor sonrası inceltme
# --------------------------------------------------------------------------- #

def _fmt(label: str) -> str:
    return label.replace(".", ",")


def refine(engine: Any, session: Any, tree: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Motorun TPI'sini çap çizelgesi ve satılan dişlerle inceltir; değiştiyse
    SKU ve kesme hızını motorun kendi kurallarıyla yeniden hesaplar.
    Her `execute_rules()` sonrasında çağrılır (kurallar TPI'yi her seferinde
    kova değerine geri yazar; bu adım idempotenttir).
    """
    state = engine.state_manager.state
    current = getattr(state, "tooth_pitch", None)
    if not current:
        return None

    part = getattr(state, "part_type", None) or getattr(state, "metal_part_type", None)
    is_solid = part == "SOLID"
    target, source = current, "rules"

    diameter = getattr(session, "solid_diameter_mm", None) if is_solid else None
    # Müşteri sonradan farklı bir aralık seçtiyse eski sayı geçersiz
    if diameter and not in_bucket(float(diameter), getattr(state, "solid_max_diameter_bucket", None)):
        diameter = None
    if diameter:
        target, _approx = starrett_solid_tpi(float(diameter))
        source = "starrett"

    final = target
    family = _BLADE_FAMILY.get(getattr(state, "blade_type", None) or "", "bi-metal")
    width = getattr(state, "blade_width_mm", None)
    thickness = getattr(state, "blade_thickness_mm", None)
    source_tree = tree or FALLBACK_TREE
    available = tree_tpis(source_tree, family, width, thickness) if width and thickness else None
    width_specific = bool(available)
    if not available:
        # Bıçak ölçüsü henüz bilinmiyor (ya da o ölçüde diş listesi yok):
        # ailenin satılan tüm diş adımları — 6/9 gibi hiç satmadığımız bir
        # değeri müşteriye söylemeyelim.
        available = family_tpis(source_tree, family)
    if available:
        final = snap_to_available(target, available, prefer_coarse=is_solid) or target

    changed = final != current
    if changed:
        state.tooth_pitch = final
        _replace_tpi_in_warnings(state, current, final)

    # Önceki turların notu (çap değişmiş olabilir) yerine güncel not
    state.warnings = [w for w in state.warnings if not w.startswith(_NOTE_PREFIX)]
    if final != target and width_specific:
        p_t, p_f = parse_tpi(target), parse_tpi(final)
        if p_t and p_f and not (0.8 <= p_f[2] / p_t[2] <= 1.2):
            state.warnings.append(
                f"{_NOTE_PREFIX} {_fmt(target)} TPI; {mm(width)}×{mm(thickness)} mm bıçakta satılan "
                f"en yakın seçenek {_fmt(final)} TPI. İlerlemeyi buna göre ayarlayın.")
    # Kurallar her turda özgün uyarıyı yeniden ekler → tekrarları ayıkla
    state.warnings = list(dict.fromkeys(state.warnings))

    if not changed:
        return None
    _rerun_derived_rules(engine)
    logger.info("tpi refine: %s -> %s (kaynak=%s, cap=%s, mevcut=%s)",
                current, final, source, diameter, available)
    return {"from": current, "to": final, "target": target, "source": source,
            "diameter_mm": diameter, "available": available}


_NOTE_PREFIX = "Çizelgeye göre ideal diş adımı"


def mm(value: Any) -> str:
    """27.0 → "27", 0.9 → "0,9"."""
    v = float(value)
    return (str(int(v)) if v.is_integer() else str(v)).replace(".", ",")


def _replace_tpi_in_warnings(state: Any, old: str, new: str) -> None:
    """Uyarılardaki "TPI: 6/10" / "TPI (6/10)" ifadelerini yeni değere çek."""
    pat = re.compile(rf"(TPI\s*[:(]\s*){re.escape(old)}(?![\d/.,])")
    state.warnings = [pat.sub(lambda m: m.group(1) + new, w) for w in state.warnings]


def _rerun_derived_rules(engine: Any) -> None:
    for rule in engine.config.rules:
        if not rule.id.startswith(_DERIVED_RULE_PREFIXES):
            continue
        state = engine.state_manager.state
        if RuleEvaluator(state).evaluate(rule.when):
            engine.state_manager.state = RuleExecutor(state).execute_actions(rule.then)
