# -*- coding: utf-8 -*-
"""
EntityExtractor — kullanıcı mesajından teknik girdileri çıkarır.

Tasarım kararı: bu katman LLM KULLANMAZ. Ölçü, kesit, sertlik ve bıçak
boyutu gibi değerler regex ve birim mantığıyla çıkarılır; çünkü bunlar
sayısal karara doğrudan girer ve LLM'in "yaklaşık doğru" çıkarımı burada
kabul edilemez. LLM yalnızca niyet anlama ve doğal dil üretiminde
kullanılır (RUNTIME_SYSTEM_PROMPT §5).

Makine tanıma için mevcut AdvancedMachineDatabase yeniden kullanılır —
paralel bir makine arama sistemi kurulmaz.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from bycuttech.materials import MaterialResolver, strip_accents
from bycuttech.models import NormalizedInputs

logger = logging.getLogger(__name__)

# Kesit türü ipuçları. Sıra önemli: "kutu profil" önce eşleşmeli ki
# "kutu" tek başına yakalanmadan profil olarak sınıflansın.
_SHAPE_PATTERNS: List[Tuple[str, str]] = [
    ("bundle", r"\bpaket\b|\bdemet\b|\bistif\b"),
    ("profile", r"kutu\s*profil|kare\s*profil|dikdortgen\s*profil|\bprofil\b|"
                r"\blama\b|\bkosebent\b|\bkose\s*bent\b|\bnpu\b|\bipe\b|\bhea\b|\bheb\b"),
    ("tube", r"\bboru\b|\btup\b|\btube\b|\bpipe\b"),
    ("sheet", r"\bsac\b|\blevha\b|\bplaka\b|\bplate\b"),
    ("solid", r"\bdolu\b|\bmil\b|\bcubuk\b|\byuvarlak\b|\bsolid\b|\bround\s*bar\b|\bbar\b"),
]

_COOLANT_PATTERNS: List[Tuple[str, str]] = [
    ("flood", r"tasirma|tasarma|bol\s*sogutma|flood|sicak\s*havuz|emulsiyon|bosaltma"),
    ("mist", r"sisleme|mist|puskurtme|aerosol|mql|minimum\s*miktar"),
    ("dry", r"\bkuru\b|sogutmasiz|sogutma\s*yok|\bdry\b"),
]

_PRIORITY_PATTERNS: List[Tuple[str, str]] = [
    ("speed", r"\bhizli\b|\bhiz\s*onemli|verim|kisa\s*surede|cabuk"),
    ("life", r"\bomur\b|uzun\s*omur|dayanikli|dayaniklilik|az\s*bicak"),
    ("finish", r"yuzey\s*kalite|puruzsuz|temiz\s*kesim|yuzey\s*onemli"),
    ("balanced", r"\bdengeli\b|\bnormal\b|farketmez"),
]


class EntityExtractor:
    """Serbest metinden NormalizedInputs alanlarını doldurur."""

    def __init__(self, knowledge_base, machine_db=None):
        self.kb = knowledge_base
        self.machine_db = machine_db
        self.materials = MaterialResolver(knowledge_base)

    # ------------------------------------------------------------------ #

    def extract(self, message: str,
                current: Optional[NormalizedInputs] = None) -> Tuple[NormalizedInputs, List[str]]:
        """
        Mesajdaki girdileri çıkar ve mevcut oturum durumuna BİRLEŞTİR.

        Birleştirme kuralı (RUNTIME_SYSTEM_PROMPT §3): kullanıcı bir değeri
        açıkça değiştirmedikçe eski değer korunur. "Peki Ø120 olursa?"
        yalnızca çapı değiştirir; malzeme, makine ve bıçak aynı kalır.
        """
        inputs = current or NormalizedInputs()
        notes: List[str] = []
        if not message or not message.strip():
            return inputs, notes

        ascii_text = strip_accents(message).lower()

        self._extract_material(message, inputs, notes)
        self._extract_hardness(ascii_text, inputs)
        self._extract_blade_dimensions(message, ascii_text, inputs)
        self._extract_machine(message, inputs, notes)
        self._extract_shape(ascii_text, inputs)
        self._extract_workpiece_dimensions(message, ascii_text, inputs)
        self._extract_bundle(ascii_text, inputs)
        self._extract_machine_speed_limit(ascii_text, inputs)
        self._extract_carbide_capability(ascii_text, inputs)
        self._extract_requested_product(message, ascii_text, inputs)
        self._extract_simple(ascii_text, inputs)

        return inputs, notes

    def _extract_carbide_capability(self, text: str,
                                    inputs: NormalizedInputs) -> None:
        """
        Makine karbür bıçak çalıştırabiliyor mu?

        45 HRC üstü malzemede karbüre geçebilmek için makinenin yeterli
        rijitlik ve hız aralığına sahip olması gerekir; bunu varsaymak
        yerine kullanıcının beyanına bakıyoruz.
        """
        if re.search(r"karbur.{0,24}(destek|uygun|calis|kullanabil|var)"
                     r"|(destek|uygun|calis|kullanabil)\w*.{0,24}karbur", text):
            inputs.machine_carbide_capable = True
        elif re.search(r"karbur.{0,20}(desteklemi|uygun\s*degil|calistiramiyor)", text):
            inputs.machine_carbide_capable = False

    def _extract_requested_product(self, message: str, text: str,
                                   inputs: NormalizedInputs) -> None:
        """
        Kullanıcı belirli bir ürün + ölçü + TPI istedi mi?

        "Primalloy 19x0.90 10/14 istiyorum" gibi taleplerde istenen
        kombinasyon ürün matrisinde OLMAYABİLİR. İstek burada ayrıca
        yakalanır ki motor onu doğrulayıp reddedebilsin; sessizce başka
        bir ölçüye kaydırmak yanlış sipariş demektir.
        """
        product = self.kb.find_product(message)
        if not product:
            return
        inputs.requested_product_id = product["id"]

        # "19x0.90" — ürün adının yakınındaki genişlik×kalınlık
        size = re.search(r"(\d{1,3}(?:[.,]\d+)?)\s*[x*]\s*(\d(?:[.,]\d+)?)\b", text)
        if size:
            inputs.requested_width_mm = self._num(size.group(1))
            inputs.requested_thickness_mm = self._num(size.group(2))

        # "10/14", "4/6", "3" gibi diş adımı talebi
        tpi = re.search(r"\b(\d{1,2}(?:\.\d)?/\d{1,2}(?:\.\d)?)\b", text)
        if tpi:
            inputs.requested_tpi = tpi.group(1)

    # ------------------------------------------------------------------ #

    def _extract_material(self, message: str, inputs: NormalizedInputs,
                          notes: List[str]) -> None:
        grade, material_notes = self.materials.extract(message)
        if not grade:
            return
        inputs.material_input = message.strip()
        inputs.material_grade = grade
        inputs.material_normalized = self._display_grade(grade)
        inputs.material_is_approximate = self.materials.is_approximate(message)
        records = self.materials.conditions_for(grade)
        if records:
            inputs.material_family_tr = records[0].get("family_tr")
        notes.extend(material_notes)

    @staticmethod
    def _display_grade(grade: str) -> str:
        """Tablo kalitesini kullanıcıya gösterilecek biçime çevir."""
        if grade.isdigit() and len(grade) == 3 and grade[0] in "234":
            return f"AISI {grade}"
        if grade.isdigit() and len(grade) == 4:
            return f"AISI/SAE {grade}"
        return grade

    # Tanınan sertlik ölçekleri. HRB ve HRA da BURADA olmalı: tanınmazsa
    # "90 HRB" sessizce yok sayılıyor ve sistem sertlik hiç verilmemiş gibi
    # davranıp tablodaki varsayılan satırın hızını veriyordu. Ölçekler
    # arasında malzemeden bağımsız dönüşüm olmadığı için birim aynen
    # taşınır; uyuşmazlığı kural motoru yakalar.
    #
    # Sıralama önemli: uzun ek önce denenmeli (hbw > hb, hrbw > hrb).
    _HARDNESS_UNITS = r"hbw|hrbw|hrc|hrb|hra|hb|hv|brinell|rockwell\s*c|rockwell\s*b"

    def _extract_hardness(self, text: str, inputs: NormalizedInputs) -> None:
        # "150 HB", "48 HRC", "90 HRB", "250hb", "HRC 48"
        match = re.search(
            rf"(\d{{1,3}}(?:[.,]\d+)?)\s*({self._HARDNESS_UNITS})\b", text)
        if match:
            value_raw, unit_raw = match.group(1), match.group(2)
        else:
            match = re.search(
                rf"({self._HARDNESS_UNITS})\s*[:=]?\s*(\d{{1,3}})", text)
            if not match:
                return
            unit_raw, value_raw = match.group(1), match.group(2)

        normalized = re.sub(r"\s+", "", unit_raw).upper()
        unit = {
            "BRINELL": "HB", "HBW": "HB",
            "ROCKWELLC": "HRC", "ROCKWELLB": "HRB",
            "HRBW": "HRB",
        }.get(normalized, normalized)

        inputs.hardness_value = float(value_raw.replace(",", "."))
        inputs.hardness_unit = unit

    def _extract_blade_dimensions(self, message: str, text: str,
                                  inputs: NormalizedInputs) -> None:
        """
        "3660x27x0.90" gibi üçlü grubu bıçak ölçüsü olarak tanı.

        İş parçası ölçüsünden ("100x50x5") ayırt etme kuralı: bıçak
        uzunluğu daima dört haneli mertebededir (en kısa şerit ~1000 mm),
        ya da grup "bıçak/şerit/blade" kelimesiyle etiketlenmiştir.
        """
        for match in re.finditer(
            r"(\d{3,5})\s*[x*]\s*(\d{1,3}(?:[.,]\d+)?)\s*[x*]\s*(\d(?:[.,]\d+)?)",
            text,
        ):
            length = float(match.group(1))
            width = float(match.group(2).replace(",", "."))
            thickness = float(match.group(3).replace(",", "."))

            prefix = text[max(0, match.start() - 24):match.start()]
            labelled = bool(re.search(r"bicak|serit|blade|band", prefix))

            if length >= 1000 or labelled:
                inputs.blade_length_mm = length
                inputs.blade_width_mm = width
                inputs.blade_thickness_mm = thickness
                return

    def _extract_machine(self, message: str, inputs: NormalizedInputs,
                         notes: List[str]) -> None:
        """Makine modelini mevcut makine veritabanıyla çöz."""
        if not self.machine_db:
            return
        try:
            detail = self.machine_db.search_detailed(message)
        except AttributeError:
            found = self.machine_db.search(message)
            detail = {"status": "match" if found else "none",
                      "machine": found, "candidates": [], "manufacturer": None}
        except Exception as exc:
            logger.error("Makine araması başarısız: %s", exc)
            return

        if detail.get("manufacturer"):
            inputs.machine_manufacturer = detail["manufacturer"]

        machine = detail.get("machine")
        if not machine:
            return

        inputs.machine_query = message.strip()
        inputs.machine_model = machine.get("model")
        inputs.machine_manufacturer = machine.get("manufacturer")
        # Makine kaydındaki bıçak ölçüsü, kullanıcı ayrıca yazmadıysa geçerlidir.
        if inputs.blade_length_mm is None:
            inputs.blade_length_mm = machine.get("blade_length_mm")
            inputs.blade_width_mm = machine.get("blade_width_mm")
            inputs.blade_thickness_mm = machine.get("blade_thickness_mm")
            notes.append(
                f"Bıçak ölçüsü {machine.get('display_name')} kaydından alındı: "
                f"{machine.get('blade_length_mm')}×{machine.get('blade_width_mm')}×"
                f"{machine.get('blade_thickness_mm')} mm."
            )

    def _extract_shape(self, text: str, inputs: NormalizedInputs) -> None:
        detected: Optional[str] = None
        for shape, pattern in _SHAPE_PATTERNS:
            if re.search(pattern, text):
                if shape == "bundle":
                    # Paket, kesit türünün yerine geçmez; üstüne biner.
                    inputs.shape = inputs.shape or None
                    detected = detected or None
                    continue
                detected = shape
                break
        if detected:
            inputs.shape = detected

    def _extract_workpiece_dimensions(self, message: str, text: str,
                                      inputs: NormalizedInputs) -> None:
        """Çap / genişlik×yükseklik×cidar değerlerini çıkar."""
        # Bıçak ölçüsü grubunu metinden düşür ki iş parçasıyla karışmasın.
        cleaned = re.sub(
            r"\d{4,5}\s*[x*]\s*\d{1,3}(?:[.,]\d+)?\s*[x*]\s*\d(?:[.,]\d+)?",
            " ", text,
        )

        # 1) Üçlü profil ölçüsü: 100x50x5 (genişlik x yükseklik x cidar)
        triple = re.search(
            r"(\d{1,4}(?:[.,]\d+)?)\s*[x*]\s*(\d{1,4}(?:[.,]\d+)?)\s*[x*]\s*(\d{1,3}(?:[.,]\d+)?)",
            cleaned,
        )
        if triple:
            inputs.width_mm = self._num(triple.group(1))
            inputs.height_mm = self._num(triple.group(2))
            inputs.wall_thickness_mm = self._num(triple.group(3))
            if inputs.shape not in ("tube", "profile"):
                inputs.shape = "profile"
            return

        # 2) İkili ölçü: 100x50 (kesit, cidar belirtilmemiş)
        double = re.search(
            r"(\d{1,4}(?:[.,]\d+)?)\s*[x*]\s*(\d{1,4}(?:[.,]\d+)?)", cleaned)
        if double and inputs.shape in ("profile", "tube", "sheet"):
            inputs.width_mm = self._num(double.group(1))
            inputs.height_mm = self._num(double.group(2))

        # 3) Çap: "Ø100", "çap 100", "100 mm çap", "cap100"
        diameter = re.search(r"[øoø]\s*(\d{1,4}(?:[.,]\d+)?)", cleaned)
        if not diameter:
            diameter = re.search(
                r"\bcap(?:i|inda)?\s*[:=]?\s*(\d{1,4}(?:[.,]\d+)?)", cleaned)
        if not diameter:
            diameter = re.search(
                r"(\d{1,4}(?:[.,]\d+)?)\s*mm\s*cap", cleaned)
        if diameter:
            inputs.diameter_mm = self._num(diameter.group(1))
            if inputs.shape is None:
                inputs.shape = "solid"

        # 4) Cidar kalınlığı ayrı yazılmış olabilir: "et kalınlığı 4 mm"
        wall = re.search(
            r"(?:et\s*kalinlig[iı]|cidar|duvar)\s*[:=]?\s*(\d{1,3}(?:[.,]\d+)?)",
            cleaned)
        if wall:
            inputs.wall_thickness_mm = self._num(wall.group(1))

    def _extract_bundle(self, text: str, inputs: NormalizedInputs) -> None:
        """"4x4 paket", "3 sıra 5 adet paket" gibi dizilimleri yakala."""
        if not re.search(r"paket|demet|istif", text):
            return
        layout = re.search(r"(\d{1,2})\s*[x*]\s*(\d{1,2})\s*(?:luk|lik|lu|li)?\s*paket", text)
        if not layout:
            layout = re.search(r"paket.{0,12}?(\d{1,2})\s*[x*]\s*(\d{1,2})", text)
        if layout:
            inputs.bundle_rows = int(layout.group(1))
            inputs.bundle_cols = int(layout.group(2))
        # Kesit türü korunur; paket bunun üstüne biner.
        if inputs.shape is None:
            inputs.shape = "bundle"
        elif inputs.bundle_rows:
            pass  # shape profile/tube kalır, is_bundle() satırlardan anlar

    def _extract_machine_speed_limit(self, text: str,
                                     inputs: NormalizedInputs) -> None:
        """"Makine hızım en fazla 90 m/dak" -> üst sınır."""
        match = re.search(
            r"(?:en\s*fazla|maksimum|max|ust\s*sinir|cikabildigi)\D{0,24}?"
            r"(\d{1,3}(?:[.,]\d+)?)\s*m\s*/?\s*(?:dak|dk|min)",
            text,
        )
        if not match:
            match = re.search(
                r"(?:makine|makina)\s*hiz\w*\D{0,20}?(\d{1,3}(?:[.,]\d+)?)\s*m\s*/?\s*(?:dak|dk|min)",
                text,
            )
        if match:
            inputs.machine_speed_max_m_min = self._num(match.group(1))

    def _extract_simple(self, text: str, inputs: NormalizedInputs) -> None:
        for value, pattern in _COOLANT_PATTERNS:
            if re.search(pattern, text):
                inputs.coolant = value
                break
        for value, pattern in _PRIORITY_PATTERNS:
            if re.search(pattern, text):
                inputs.priority = value
                break

    @staticmethod
    def _num(raw: str) -> float:
        return float(str(raw).replace(",", "."))
