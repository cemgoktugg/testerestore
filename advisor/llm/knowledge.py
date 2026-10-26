"""
Ön masanın bilgi paketleri — LLM'siz, sabit ve denetlenebilir cevaplar.

  - Malzeme kalite eşdeğerleri (St37, C45, 1.4301, 6082, GG25 …) → metal grubu
    (data/material_grades_tr.json). Huni bu grubu kendisi de kullanır: "C45 mil"
    yazan müşteriye "hangi metal?" diye tekrar sorulmaz.
  - Bıçak boyu nasıl bulunur (L = 2 × C + π × D; müşteri ölçüleri yazdıysa hesap).
  - Yeni bıçak alıştırma (rodaj), gerginlik, soğutma sıvısı.

Kurallar: bıçak/makine üreticisinin değeri esastır; danışman burada sayı
uydurmaz (gerginlik, hız, karışım oranı gibi değerler için kaynaklı rehbere
yönlendirir). Metinler sitedeki rehberlerle aynı içeriği özetler.
"""
from __future__ import annotations

import json
import math
import os
import re
from typing import Any, Callable, Dict, List, Optional

_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

# Sitedeki rehberler (testerestore/lib/guides.ts)
GUIDE_LENGTH = "/rehber/serit-testere-boyu-nasil-olculur"
GUIDE_RUN_IN = "/rehber/serit-testere-rodaj-ve-bakim"
GUIDE_SETUP = "/rehber/serit-testere-gerginlik-hiz-sogutma"
GUIDE_GRADES = "/rehber/celik-kalite-esdegerleri-bicak-secimi"

FAMILY_TR = {
    "CARBON_STEEL": "karbon çeliği",
    "STAINLESS": "paslanmaz",
    "ALUMINUM": "alüminyum",
    "CAST_IRON": "döküm",
}

# --------------------------------------------------------------------------- #
# Malzeme kaliteleri
# --------------------------------------------------------------------------- #


def _load_grades() -> List[Dict[str, Any]]:
    try:
        with open(os.path.join(_DATA, "material_grades_tr.json"), encoding="utf-8") as f:
            grades = json.load(f)["grades"]
    except Exception:
        return []
    for g in grades:
        g["_re"] = [re.compile(p) for p in g.get("patterns") or []]
    return grades


GRADES = _load_grades()


def detect_grade(n: str) -> Optional[Dict[str, Any]]:
    """Sadeleşmiş metinde (front_desk.norm) ilk tanınan malzeme kalitesi."""
    for g in GRADES:
        if any(r.search(n) for r in g["_re"]):
            return g
    return None


def grade_line(g: Dict[str, Any]) -> str:
    """Hunide tek satırlık bilgi: "C45 … → karbon çeliği grubunda değerlendirdim."""
    fam = FAMILY_TR.get(g.get("family") or "")
    if fam:
        return f"**{g['name_tr']}** → {fam} grubunda değerlendirdim. {g['note_tr']}"
    return f"**{g['name_tr']}**: {g['note_tr']}"


def grade_answer(g: Dict[str, Any], link: Callable[[str, str], str]) -> str:
    fam = FAMILY_TR.get(g.get("family") or "")
    text = f"**{g['name_tr']}** bir {g['group_tr']}"
    text += f"; bıçak seçiminde **{fam}** grubunda değerlendirilir. " if fam else ". "
    text += g["note_tr"]
    text += " Eşdeğer kaliteler ve bıçak seçimi: " + link("çelik kalite eşdeğerleri rehberi", GUIDE_GRADES) + "."
    return text


# --------------------------------------------------------------------------- #
# Bıçak boyu
# --------------------------------------------------------------------------- #

_NUM = r"(\d+(?:[.,]\d+)?)"


def _mm(s: str) -> float:
    return float(s.replace(",", "."))


def parse_wheel_geometry(n: str) -> Optional[Dict[str, float]]:
    """"kasnak çapı 350, merkezler arası 1200" → {"D": 350, "C": 1200}."""
    d = re.search(rf"kasnak\w*\s*(?:cap\w*)?\s*(?:[:=]\s*)?{_NUM}\s*(?:mm)?|cap\w*\s*{_NUM}", n)
    c = re.search(rf"(?:merkez\w*|eksen\w*|aks\w*)\s*(?:aras\w*|mesafe\w*)?\s*(?:[:=]\s*)?{_NUM}|"
                  rf"aras\w*\s*(?:mesafe\w*)?\s*(?:[:=]\s*)?{_NUM}", n)
    if not (d and c):
        return None
    dv = _mm(next(x for x in d.groups() if x))
    cv = _mm(next(x for x in c.groups() if x))
    if not (100 <= dv <= 1500 and 200 <= cv <= 8000):
        return None
    return {"D": dv, "C": cv}


def _thousands(v: float) -> str:
    return f"{int(round(v)):,}".replace(",", ".")


def length_answer(n: str, link: Callable[[str, str], str]) -> str:
    geo = parse_wheel_geometry(n)
    if geo:
        L = 2 * geo["C"] + math.pi * geo["D"]
        return (
            f"Verdiğiniz ölçülerle (iki eşit çaplı kasnak): **L = 2 × {_thousands(geo['C'])} + π × "
            f"{_thousands(geo['D'])} ≈ {_thousands(L)} mm**.\n\n"
            "Bu yaklaşık bir değerdir (ölçüm gergi orta konumdayken yapılmalı). Ölçünüze göre kaynaklanan "
            "bıçak iade edilemediği için sonucu makine etiketi, kılavuz veya eski bıçakla karşılaştırın. "
            f"Ayrıntılar: {link('bıçak boyu rehberi', GUIDE_LENGTH)}."
        )
    return (
        "**Bıçak boyunu bulmanın yolları:**\n"
        "1. **Makine etiketi / kullanım kılavuzu** — genellikle \"3660 × 27 × 0,9\" (boy × genişlik × kalınlık, mm) "
        "şeklinde yazar. Marka-modelinizi yazarsanız veritabanımızdan da bakabilirim.\n"
        "2. **Eski bıçağın üzerindeki yazı** ya da eski bıçağı düz zeminde işaretli bir noktadan bir tur "
        "yuvarlayarak ölçmek.\n"
        "3. **Kasnak formülü** (iki eşit çaplı kasnak): **L = 2 × C + π × D** — C: kasnak merkezleri arası, "
        "D: kasnak çapı (mm), gergi orta konumdayken. Örnek: C = 1.200, D = 350 → ≈ 3.500 mm.\n\n"
        "Kasnak çapını ve merkezler arası mesafeyi yazarsanız hesabı ben yapayım. Ölçünüze göre kaynaklanan "
        "bıçak iade edilemediğinden hesabı etiket veya eski bıçakla doğrulamanızı öneririm. "
        f"Ayrıntılar: {link('bıçak boyu rehberi', GUIDE_LENGTH)}."
    )


# --------------------------------------------------------------------------- #
# Rodaj, gerginlik, soğutma
# --------------------------------------------------------------------------- #


def run_in_answer(link: Callable[[str, str], str]) -> str:
    return (
        "**Yeni bıçağı alıştırma (rodaj):** Yeni dişlerin uçları çok keskindir; ilk kesimlerde tam yükle "
        "çalışmak uçlarda mikro kırılmalara yol açar ve bıçak ömrünü kısaltır.\n"
        "1. Bant hızını malzemeye uygun normal değerde tutun.\n"
        "2. İlk kesimlerde ilerlemeyi (kesme basıncını) belirgin biçimde azaltın.\n"
        "3. Birkaç kesim boyunca ilerlemeyi kademeli olarak normale çıkarın.\n"
        "4. Rodajdan sonra bıçak gerginliğini tekrar kontrol edin (yeni bıçak ilk çalışmada biraz uzayabilir).\n\n"
        "Oranlar bıçak ve makineye göre değişir; makinenizin ve bıçağın kılavuzu esastır. "
        f"Ayrıntılar: {link('rodaj ve bakım rehberi', GUIDE_RUN_IN)}."
    )


def tension_answer(link: Callable[[str, str], str]) -> str:
    return (
        "**Bıçak gerginliği:** Bıçağı makinenizin gergi göstergesine veya kullanım kılavuzundaki değere göre gerin; "
        "en doğru değer bıçak/makine üreticisinin verdiği değerdir.\n"
        "- **Gevşek bıçak:** kesim eğri ve dalgalı gider, bıçak kasnakta kayar ya da kasnaktan çıkar.\n"
        "- **Aşırı gergi:** gövdede çatlak, kaynak yerinden kopma ve bıçağın burulması.\n"
        "- Yeni bıçak ilk dakikalarda ısınıp biraz uzayabilir; bir süre çalıştıktan sonra gerginliği tekrar kontrol edin.\n"
        "- İş bitince bıçağı gevşetin; sürekli gergin bırakmak gövdeyi yorar.\n\n"
        f"Kaynaklara göre değer aralıkları: {link('gerginlik, hız ve soğutma rehberi', GUIDE_SETUP)}."
    )


def coolant_answer(link: Callable[[str, str], str]) -> str:
    return (
        "**Soğutma sıvısı (bor yağı / emülsiyon):** Metal kesiminde ısıyı ve sürtünmeyi azaltır, talaşın dişe "
        "yapışmasını önler ve bıçak ömrünü uzatır.\n"
        "- Çelikte ve özellikle paslanmazda soğutma kullanılması önerilir.\n"
        "- Alüminyum gibi yumuşak metallerde talaş yapışmasını önlemek için yağlama/soğutma önemlidir.\n"
        "- Dökme demir genellikle kuru kesilir.\n"
        "- Sıvıyı kesim noktasına, dişlere yönlendirin; karışım oranı için sıvı üreticisinin önerisi esastır "
        "ve oran düzenli kontrol edilmelidir. Soğutmasız kesimde bant hızı düşürülmelidir.\n\n"
        f"Ayrıntılar: {link('gerginlik, hız ve soğutma rehberi', GUIDE_SETUP)}."
    )
