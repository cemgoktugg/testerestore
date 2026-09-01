# -*- coding: utf-8 -*-
"""
DeterministicRuleEngine — sayısal teknik kararların TEK kaynağı.

Buradaki hiçbir değer tahmin edilmez; hepsi ansiklopedi v2'deki
doğrulanmış tablolardan okunur ya da açık formülle hesaplanır. LLM bu
modülün çıktısını yalnızca doğal dile çevirir.

Karar sırası RUNTIME_SYSTEM_PROMPT §5'teki sırayla birebir aynıdır:
    1. malzeme normalize   2. zorunlu alan doğrula   3. makine/bıçak sınırı
    4. ürün ailesi          5. TPI adayları          6. varyant matrisi filtresi
    7. hız + Q              8. süre                  9. soğutma/alıştırma/gerginlik
   10. çelişki/QA → teknik inceleme

Kritik güvenlik kuralları (ihlali yanlış bıçak siparişi demektir):
    • Hiçbir TPI varsayılan DEĞİLDİR — 8/12 dâhil.
    • Ürün varyant matrisinde olmayan kombinasyon önerilmez.
    • Kesim tablosu 50–125 mm kapsamının dışına Q ekstrapole edilmez.
    • 45 HRC üstünde bimetal varsayılan seçilmez.
    • Kesitte en az 3 diş bulunmalıdır.
"""
from __future__ import annotations

import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from bycuttech.materials import MaterialResolver
from bycuttech.models import NormalizedInputs, Range, TechnicalAnswerPlan

logger = logging.getLogger(__name__)

# Kesim tablosunun geçerli olduğu iş parçası ölçüsü. Kayıtların kendi
# workpiece_dimension_mm alanından okunur; bu sabit yalnızca yedektir.
_DEFAULT_SCOPE_MM = (50.0, 125.0)

# Aynı birimdeki sertlik sapması bu oranı aşarsa tablo satırı geçersiz
# sayılır. Kesim hızı sertlikle güçlü biçimde değişir; 150 HB için
# doğrulanmış bir hızı 400 HB'lik parçaya vermek bıçağı ilk kesimde
# bitirir.
_HARDNESS_TOLERANCE = 0.25

# İş sertleşen / tok aileler: örtüşen TPI adayları arasında DAHA İNCE
# seçilir (TPI-005). Yumuşak-yapışkan olanlarda daha KABA (TPI-004).
_WORK_HARDENING_HINTS = (
    "östenitik", "ostenitik", "paslanmaz", "nikel", "titanyum",
    "mangan", "refrakter", "çökelme", "cokelme",
)
_GUMMY_HINTS = ("alüminyum", "aluminyum", "bakır", "bakir", "kurşun", "kursun")

# ---------------------------------------------------------------------- #
# ONAYLI DİŞ ADIMI EŞLEMELERİ
#
# Genel tablonun önerdiği diş adımı BYCUTTECH ürününde üretilmiyorsa,
# yalnızca burada AÇIKÇA tanımlanmış bir eşleme varsa ikame yapılır.
#
# Sayısal yakınlığa göre otomatik ikame BİLEREK KALDIRILDI: "8/11 yoksa
# 8/12 ver" gibi bir kural matematiksel olarak makul görünse de teknik
# olarak yanlış ürün seçimi üretebilir; diş adımı yalnızca sayı değil,
# diş geometrisi ve talaş boşluğu demektir. Bu tablo boş kaldığı sürece
# sistem ikame yapmaz, "teknik doğrulama gerekli" der.
#
# Bir satır eklemek BYCUTTECH mühendislik onayı gerektirir. Biçim:
#   "<tablodaki adım>": {"to": "<üründeki adım>", "basis": "<onay kaydı>"}
# ---------------------------------------------------------------------- #
APPROVED_TPI_SUBSTITUTIONS: Dict[str, Dict[str, str]] = {
    # Örnek (ETKİN DEĞİL — onay gelince açılacak):
    # "8/11": {"to": "8/12", "basis": "BYC-ENG-2026-001 onaylı eşleme"},
}


def tpi_numeric(tpi: str) -> float:
    """
    TPI etiketini karşılaştırılabilir sayıya çevir.

    "4/6" -> 5.0 (ortalama), "3" -> 3.0, "1.4/2" -> 1.7.
    Büyük sayı = daha ince diş.
    """
    parts = [float(p) for p in re.findall(r"\d+(?:\.\d+)?", tpi or "")]
    return sum(parts) / len(parts) if parts else 0.0


def tpi_coarsest(tpi: str) -> float:
    """Değişken diş adımında en kaba uç (diş sayımı için güvenli taraf)."""
    parts = [float(p) for p in re.findall(r"\d+(?:\.\d+)?", tpi or "")]
    return min(parts) if parts else 0.0


def is_variable_pitch(tpi: str) -> bool:
    """"4/6" değişken, "3" sabit diş adımıdır."""
    return len(re.findall(r"\d+(?:\.\d+)?", tpi or "")) > 1


# 1 inç = 25.4 mm (tam tanım). TPI "teeth per inch" olduğu için temas
# uzunluğu önce inç'e çevrilir.
MM_PER_INCH = 25.4


def teeth_in_cut(contact_mm: float, tpi: str) -> Optional[Dict[str, Any]]:
    """
    Kesitte çalışan diş sayısını hesapla.

        diş = (temas_uzunluğu_mm / 25.4) × TPI

    DEĞİŞKEN diş adımında tek sayı vermek YANILTICIDIR: "4/6" bir bıçak
    boyunca 4 TPI'den 6 TPI'ye değişir, yani Ø100'de kesitteki diş sayısı
    15.7 ile 23.6 arasında salınır. Tek değer gösterilirse kullanıcı ya
    fazla iyimser (23.6) ya fazla kötümser (15.7) bir tabloya bakar.

    Bu yüzden değişken adımda min–max aralığı ve nominal ortalama birlikte
    döner. "En az 3 diş" kuralı her zaman MİNİMUM üzerinden denetlenir —
    en kaba uçta bile 3 diş kalmalıdır.

    Returns:
        {"min", "max", "nominal", "variable"} ya da TPI okunamazsa None.
    """
    values = [float(p) for p in re.findall(r"\d+(?:\.\d+)?", tpi or "")]
    if not values or not contact_mm:
        return None

    inches = float(contact_mm) / MM_PER_INCH
    counts = sorted(inches * v for v in values)
    variable = len(values) > 1
    nominal = inches * (sum(values) / len(values))

    return {
        "min": round(counts[0], 1),
        "max": round(counts[-1], 1),
        "nominal": round(nominal, 1),
        "variable": variable,
    }


class DeterministicRuleEngine:
    """Doğrulanmış tablolardan teknik karar üretir."""

    def __init__(self, knowledge_base):
        self.kb = knowledge_base
        self.materials = MaterialResolver(knowledge_base)

    # ================================================================== #
    # Ana giriş
    # ================================================================== #

    def evaluate(self, inputs: NormalizedInputs,
                 plan: TechnicalAnswerPlan) -> TechnicalAnswerPlan:
        """Girdileri değerlendirip planı doldur. Plan yerinde değiştirilir."""
        plan.normalized_inputs = inputs.to_dict()

        # 0) Kullanıcı açıkça bir ürün+ölçü+TPI istediyse önce onu doğrula.
        #    Var olmayan kombinasyonu sessizce başka bir ölçüye kaydırmak
        #    sipariş edilemeyecek bir öneri üretir (FIT-001, TECH-010).
        if self._reject_impossible_request(inputs, plan):
            return plan

        # 3) Makine / bıçak sınırı
        variant, variant_note = None, None

        # 4) Ürün ailesi
        product = self._route_product(inputs)

        # HARD-001: 45 HRC üstünde makinenin karbür uygunluğu doğrulanmadan
        # ürün seçilmez. Router burada bilerek boş döner; bimetale düşmek
        # yerine eksik bilgiyi soruyoruz.
        if product is None and self._is_hard(inputs):
            plan.warnings.append(
                f"{self._fmt(inputs.hardness_value)} HRC bu iş için bimetal "
                "sınırının üzerinde. Karbür uçlu bıçak (ADVANZ TS) gerekir; "
                "bimetal bu sertlikte hızla körelir."
            )
            plan.questions_to_ask.append(
                "Makineniz karbür uçlu bıçak çalıştırabiliyor mu? "
                "(karbür için yeterli rijitlik ve düşük titreşim gerekir)"
            )
            plan.missing_inputs.append("machine_carbide_capability")
            plan.confidence = "verification_required"
            plan.status = "need_input"
        if product:
            plan.product_family = product["id"]
            plan.product_name = product.get("canonical_name")
            plan.cutting_edge = product.get("cutting_edge")
            plan.add_source(product.get("source"))

            # 6) Varyant matrisi — bıçak ölçüsü biliniyorsa doğrula
            variant, variant_note = self._resolve_variant(product, inputs)
            if variant:
                plan.verified_variant = (
                    f"{self._fmt(variant['width_mm'])}x{self._fmt(variant['thickness_mm'])}"
                )
            elif variant_note:
                plan.warnings.append(variant_note)

        # 5+6) TPI
        self._apply_tpi(inputs, plan, variant)

        # 7) Hız ve Q
        self._apply_cutting_conditions(inputs, plan)

        # 8) Tahmini süre
        self._apply_estimated_time(inputs, plan)

        # 9) Soğutma / alıştırma / gerginlik
        self._apply_break_in(plan, product)
        self._apply_tension(inputs, plan, product)
        self._apply_coolant(inputs, plan)

        # 10) Açık QA maddesi varsa güveni düşür
        self._apply_open_qa(plan)

        return plan

    # ================================================================== #
    # 4) Ürün yönlendirme
    # ================================================================== #

    def _route_product(self, inputs: NormalizedInputs) -> Optional[Dict]:
        """
        product_router kurallarını öncelik sırasıyla dener.

        Router'daki `when` ifadeleri sembolik; her biri aşağıda açık bir
        yüklem olarak kodlanmıştır. Bilinmeyen bir `when` gelirse kural
        SESSİZCE doğru sayılmaz — atlanır ve loglanır.
        """
        for rule in self.kb.product_router:
            predicate = self._ROUTER_PREDICATES.get(rule.get("when"))
            if predicate is None:
                logger.warning("Bilinmeyen router kuralı atlandı: %s", rule.get("when"))
                continue
            try:
                if predicate(self, inputs):
                    product = self.kb.product(rule["recommend"])
                    if product:
                        return product
            except Exception as exc:
                logger.error("Router kuralı hatası (%s): %s", rule.get("when"), exc)
        return None

    # --- router yüklemleri ---

    def _is_hard(self, inputs: NormalizedInputs) -> bool:
        """45 HRC üstü mü? (HARD-001)"""
        if inputs.hardness_unit == "HRC" and inputs.hardness_value:
            return inputs.hardness_value > 45
        return False

    def _carbide_machine_ok(self, inputs: NormalizedInputs) -> bool:
        """
        Makinenin karbür uygunluğu ayrı bir GİRDİDİR, metin araması değil.

        Önceden ham mesaj içinde "karbür" aranıyordu; malzeme kalitesi
        çıkarılamayan mesajlarda o metin hiç dolmadığı için 48 HRC'lik
        sertleştirilmiş çelik bile bimetale düşüyordu (HARD-001 ihlali).
        """
        return bool(inputs.machine_carbide_capable)

    def _is_tube_or_profile(self, inputs: NormalizedInputs) -> bool:
        return inputs.shape in ("tube", "profile")

    def _is_solid(self, inputs: NormalizedInputs) -> bool:
        return inputs.shape == "solid"

    def _is_nonferrous_abrasive(self, inputs: NormalizedInputs) -> bool:
        family = (inputs.material_family_tr or "").lower()
        text = (inputs.material_input or "").lower()
        if re.search(r"döküm|dokum|kompozit|grafit|composite|graphite", text):
            return "alüminyum" in family or "aluminyum" in family or not family
        return False

    _ROUTER_PREDICATES = {
        "tube_or_profile_or_structural_or_profile_bundle":
            lambda self, i: self._is_tube_or_profile(i),
        "portable_or_small_wheel_vertical_machine_and_width_13mm":
            lambda self, i: i.blade_width_mm == 13,
        "contour_or_sheet_or_thin_profile_and_width_le_13mm":
            lambda self, i: (i.shape == "sheet"
                             or (i.blade_width_mm is not None and i.blade_width_mm <= 13)),
        "hardness_gt_45hrc_or_hard_abrasive_material_and_carbide_machine_capable":
            lambda self, i: self._is_hard(i) and self._carbide_machine_ok(i),
        "aluminum_casting_or_composite_or_graphite_or_abrasive_nonferrous":
            lambda self, i: self._is_nonferrous_abrasive(i),
        # Karbür MC5 ve M51 Primalloy yalnızca kullanıcı açıkça istediğinde
        # ya da makine karbüre uygun olduğunda devreye girer. "Ekonomik olarak
        # tercih edilir" gibi ticari koşullar oturumda yoksa varsayılmaz.
        "large_solid_difficult_alloy_or_high_productivity_and_rigid_carbide_machine":
            lambda self, i: (self._is_solid(i) and self._carbide_machine_ok(i)
                             and (i.diameter_mm or 0) >= 200),
        "large_solid_or_small_solid_bundle_and_m51_economically_preferred":
            lambda self, i: bool(re.search(
                r"m51|primalloy", (i.material_input or "").lower())),
        "solid_or_thick_wall_or_difficult_alloy_and_hardness_le_45hrc":
            lambda self, i: (self._is_solid(i) and not self._is_hard(i)),
        # 45 HRC ustu malzeme buraya DUSMEMELI: kural adi "general" olsa da
        # sert malzemede bimetal onermek HARD-001'in yasakladigi sey.
        # Sertlik filtresi olmadan, karbure uygun olmayan makinede 52 HRC'lik
        # is icin M42 bimetal oneriliyordu.
        "general_small_or_medium_solid":
            lambda self, i: (self._is_solid(i) and not self._is_hard(i)),
    }

    # ================================================================== #
    # 6) Varyant doğrulama
    # ================================================================== #

    def _resolve_variant(self, product: Dict,
                         inputs: NormalizedInputs) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Kullanıcının bıçak ölçüsünü ürünün GERÇEK varyant matrisinde ara.

        Matriste yoksa varyant üretilmez (FIT-001). Var olmayan bir ölçüyü
        "yakın olduğu için" kabul etmek, sipariş edilemeyecek bir ürün
        önermek demektir.
        """
        if inputs.blade_width_mm is None or inputs.blade_thickness_mm is None:
            return None, None

        for variant in product.get("variants", []):
            if (float(variant["width_mm"]) == float(inputs.blade_width_mm)
                    and float(variant["thickness_mm"]) == float(inputs.blade_thickness_mm)):
                return variant, None

        available = ", ".join(
            f"{self._fmt(v['width_mm'])}×{self._fmt(v['thickness_mm'])}"
            for v in product.get("variants", [])
        )
        return None, (
            f"{product.get('canonical_name')} ürününde "
            f"{self._fmt(inputs.blade_width_mm)}×{self._fmt(inputs.blade_thickness_mm)} mm "
            f"varyantı bulunmuyor. Mevcut varyantlar: {available}."
        )

    def _reject_impossible_request(self, inputs: NormalizedInputs,
                                   plan: TechnicalAnswerPlan) -> bool:
        """
        Kullanıcının istediği ürün+ölçü+TPI matriste yoksa reddet.

        Returns: True ise değerlendirme burada durur.
        """
        product_id = inputs.requested_product_id
        if not product_id or inputs.requested_width_mm is None:
            return False

        product = self.kb.product(product_id)
        if not product:
            return False

        width = float(inputs.requested_width_mm)
        thickness = float(inputs.requested_thickness_mm or 0)
        if self.variant_exists(product_id, width, thickness, inputs.requested_tpi):
            return False

        available = ", ".join(
            f"{self._fmt(v['width_mm'])}×{self._fmt(v['thickness_mm'])} "
            f"({'/'.join(v.get('available_tpi', []))})"
            for v in product.get("variants", [])
        )
        requested = f"{self._fmt(width)}×{self._fmt(thickness)}"
        if inputs.requested_tpi:
            requested += f" {inputs.requested_tpi} TPI"

        plan.product_family = product_id
        plan.product_name = product.get("canonical_name")
        plan.cutting_edge = product.get("cutting_edge")
        plan.status = "technical_review_required"
        plan.confidence = "verification_required"
        plan.review_reason = (
            f"{product.get('canonical_name')} ürününde {requested} kombinasyonu "
            f"üretilmiyor.\n\nBu üründe mevcut olanlar: {available}."
        )
        plan.add_source(product.get("source"))
        return True

    def variant_exists(self, product_id: str, width_mm: float,
                       thickness_mm: float, tpi: Optional[str] = None) -> bool:
        """Belirli bir ürün/ölçü/TPI kombinasyonu gerçekten var mı?"""
        product = self.kb.product(product_id)
        if not product:
            return False
        for variant in product.get("variants", []):
            if (float(variant["width_mm"]) == float(width_mm)
                    and float(variant["thickness_mm"]) == float(thickness_mm)):
                return tpi is None or tpi in variant.get("available_tpi", [])
        return False

    # ================================================================== #
    # 5) TPI seçimi
    # ================================================================== #

    def contact_length_mm(self, inputs: NormalizedInputs) -> Optional[float]:
        """
        Bıçağın malzemeyle temas uzunluğu — TPI seçiminin tek dayanağı.

        Dolu yuvarlakta çap, dikdörtgen kesitte genişlik esas alınır.
        Pakette tek parça değil TOPLAM paket geometrisi kullanılır
        (TPI-002); tek parçaya göre seçilen diş adımı pakette tıkanır.
        """
        if inputs.is_bundle() and inputs.bundle_cols:
            base = inputs.width_mm or inputs.diameter_mm
            if base:
                return float(base) * int(inputs.bundle_cols)
        if inputs.shape == "solid":
            return inputs.diameter_mm or inputs.width_mm
        if inputs.shape in ("profile", "tube"):
            return inputs.width_mm or inputs.diameter_mm
        if inputs.shape == "sheet":
            return inputs.width_mm
        return inputs.diameter_mm or inputs.width_mm

    def _solid_tpi_candidates(self, contact_mm: float) -> List[Dict]:
        return [r for r in self.kb.tpi_solid_rules
                if float(r["contact_min_mm"]) <= contact_mm <= float(r["contact_max_mm"])]

    def _tube_tpi(self, inputs: NormalizedInputs) -> Tuple[Optional[str], Optional[str], List[str]]:
        """
        Boru/profil matrisinden TPI oku.

        Dış ölçü ve cidar BİRLİKTE kullanılır; yalnız çapa bakmak ince
        cidarlı boruda diş kırar. Paket kesiminde bitişik iki parçanın
        cidarı üst üste bineceği için cidar iki katına çıkar (TPI-002).
        """
        notes: List[str] = []
        width = inputs.width_mm or inputs.diameter_mm
        wall = inputs.wall_thickness_mm
        if width is None or wall is None:
            return None, None, notes

        effective_wall = wall
        if inputs.is_bundle():
            effective_wall = wall * 2
            notes.append(
                "Paket kesiminde bitişik parçaların cidarı üst üste bindiği için "
                f"etkin cidar {self._fmt(wall)} mm yerine {self._fmt(effective_wall)} mm alındı."
            )

        # Birebir hücre varsa doğrudan kullan.
        exact = self.kb.tube_matrix.get((float(width), float(effective_wall)))
        if exact:
            basis = (f"boru/profil matrisi ({self._fmt(width)} mm dış ölçü, "
                     f"{self._fmt(effective_wall)} mm cidar)")
            return str(exact["recommended_tpi"]), basis, notes

        # Izgara dışındaysa KOMŞU hücreler arasından EN İNCE adımı seç.
        #
        # Yön neden "en ince": matriste çap büyüdükçe VE cidar kalınlaştıkça
        # diş adımı kabalaşıyor (ör. cidar 4 mm'de 25→500 mm çapta 12/16'dan
        # 5/7'ye iniyor). Boru/profilde baskın hasar biçimi ince cidarda diş
        # sıyırmasıdır; kaba tarafa yuvarlamak bu riski artırır. Önceki
        # sürüm çapı YUKARI yuvarlıyordu — bu, diş sayısını azaltan yön.
        #
        # Bu bir tahmin olduğu için sessiz kalmıyoruz: varsayım yazılıyor ve
        # cevabın güveni düşürülüyor (aşağıda status=conditional).
        neighbours = []
        for dia in self._bracket(self.kb.tube_diameters, float(width)):
            for wall in self._bracket(self.kb.tube_walls, float(effective_wall)):
                cell = self.kb.tube_matrix.get((dia, wall))
                if cell:
                    neighbours.append((dia, wall, cell))
        if not neighbours:
            return None, None, notes

        dia_key, wall_key, rule = max(
            neighbours, key=lambda n: tpi_numeric(str(n[2]["recommended_tpi"])))

        notes.append(
            f"{self._fmt(width)} mm × {self._fmt(effective_wall)} mm cidar "
            "boru/profil tablosunda birebir yok. Komşu hücreler arasından "
            f"diş sıyırmasına karşı daha güvenli olan {self._fmt(dia_key)} mm × "
            f"{self._fmt(wall_key)} mm hücresi (daha ince adım) kullanıldı — "
            "kesin değer için ölçüyü teyit ettirin."
        )
        basis = (f"boru/profil matrisi ({self._fmt(dia_key)} mm dış ölçü, "
                 f"{self._fmt(wall_key)} mm cidar — yaklaşık hücre)")
        return str(rule["recommended_tpi"]), basis, notes

    @staticmethod
    def _bracket(values: List[float], target: float) -> List[float]:
        """Hedefi saran alt ve üst ızgara değerleri (varsa)."""
        below = [v for v in values if v <= target]
        above = [v for v in values if v >= target]
        out = []
        if below:
            out.append(max(below))
        if above and (not below or max(below) != min(above)):
            out.append(min(above))
        return out

    def _apply_tpi(self, inputs: NormalizedInputs, plan: TechnicalAnswerPlan,
                   variant: Optional[Dict]) -> None:
        """TPI adaylarını üret, ürün matrisiyle filtrele, diş sayısını doğrula."""
        available: Optional[List[str]] = variant.get("available_tpi") if variant else None

        candidates: List[str] = []
        basis: Optional[str] = None

        contact_for_teeth = self.contact_length_mm(inputs)
        if contact_for_teeth:
            plan.contact_length_mm = round(float(contact_for_teeth), 1)

        if inputs.shape in ("tube", "profile"):
            tpi, basis, notes = self._tube_tpi(inputs)
            plan.assumptions.extend(notes)
            if tpi:
                candidates = [tpi]
                plan.add_source("catalog")
                # Dayanağı BURADA yaz: adım ürün matrisinde bulunmasa bile
                # kararın boru/profil tablosundan geldiği kaydı kalmalı,
                # yoksa "hangi tabloya bakıldı" izi kayboluyor.
                plan.tpi_basis = basis
        else:
            contact = self.contact_length_mm(inputs)
            if contact:
                plan.contact_length_mm = round(float(contact), 1)
                rules = self._solid_tpi_candidates(float(contact))
                candidates = [r["tpi"] for r in rules]
                basis = f"temas uzunluğu {self._fmt(contact)} mm"
                if rules:
                    plan.add_source(rules[0].get("source"))

        if not candidates:
            return

        chosen, choice_notes = self._filter_and_choose(
            candidates, available, inputs, plan)
        plan.assumptions.extend(choice_notes)

        if not chosen:
            if available:
                # Tablo bir adım öneriyor ama üründe yok ve onaylı eşleme de
                # yok. Sessizce yakın bir adıma kaymak yerine durumu açıkça
                # bildiriyoruz; kullanıcı var olmayan bir ürün sipariş etmesin.
                self._report_missing_pitch(candidates[0], plan, inputs)
            return

        plan.tpi = chosen
        plan.tpi_basis = basis

        # TPI-003: kesitte en az 3 diş.
        # Kontrol MİNİMUM diş sayısı üzerinden: değişken adımın en kaba
        # ucunda bile üç diş kalmalı, yoksa o bölgede diş kırılır.
        contact = plan.contact_length_mm or self.contact_length_mm(inputs)
        if contact:
            teeth = teeth_in_cut(float(contact), chosen)
            plan.teeth_in_cut = teeth
            if teeth and teeth["min"] < 3:
                detail = (f"{teeth['min']}–{teeth['max']}" if teeth["variable"]
                          else f"{teeth['min']}")
                plan.warnings.append(
                    f"Seçilen {chosen} diş adımıyla kesitte yaklaşık {detail} diş "
                    "kalıyor; en az 3 diş kuralı sağlanmıyor. Daha ince diş adımı "
                    "veya farklı kesit yönelimi gerekir."
                )
                plan.confidence = "verification_required"

    def _report_missing_pitch(self, wanted: str, plan: TechnicalAnswerPlan,
                              inputs: NormalizedInputs) -> None:
        """
        Tablonun önerdiği diş adımı üründe yoksa durumu açıkça bildir.

        Aynı ölçüde bu adımı GERÇEKTEN üreten başka bir ürün ailesi varsa
        alternatif olarak sunulur — ama uydurulmuş bir varyant değil,
        matriste birebir bulunan bir kayıt.
        """
        alternatives = self._families_with_pitch(
            wanted, inputs.blade_width_mm, inputs.blade_thickness_mm)

        message = (
            f"Kesit için tablo **{wanted}** diş adımı öneriyor, ancak "
            f"{plan.product_name or 'seçilen ürün'} "
            f"{plan.verified_variant or 'bu ölçü'} varyantında {wanted} "
            "üretilmiyor."
        )
        if alternatives:
            listed = ", ".join(alternatives)
            message += (
                f" Aynı ölçüde {wanted} adımını üreten aile(ler): {listed}. "
                "Bu alternatifin işinize uygunluğu teknik olarak doğrulanmalı."
            )
        else:
            message += (
                " Aynı ölçüde bu adımı üreten başka bir BYCUTTECH ailesi de "
                "bulunmuyor."
            )
        message += (
            " Sayısal olarak yakın bir adımı kendiliğinden önermiyorum; "
            "diş adımı yalnızca sayı değil, diş geometrisi ve talaş boşluğu "
            "demektir. Teknik ürün doğrulaması gerekiyor."
        )

        plan.warnings.append(message)
        plan.status = "technical_review_required"
        plan.confidence = "verification_required"
        plan.review_reason = (
            f"Tablo {wanted} öneriyor; bu ürün varyantında karşılığı yok ve "
            "onaylı bir mühendislik eşlemesi tanımlı değil."
        )

    def _families_with_pitch(self, tpi: str, width_mm: Optional[float],
                             thickness_mm: Optional[float]) -> List[str]:
        """Bu ölçü + diş adımını GERÇEKTEN üreten ürün ailelerini bul."""
        if width_mm is None or thickness_mm is None:
            return []
        found = []
        for product in self.kb.products:
            for variant in product.get("variants", []):
                if (float(variant["width_mm"]) == float(width_mm)
                        and float(variant["thickness_mm"]) == float(thickness_mm)
                        and tpi in variant.get("available_tpi", [])):
                    found.append(product.get("canonical_name", product["id"]))
                    break
        return found

    def _filter_and_choose(self, candidates: List[str],
                           available: Optional[List[str]],
                           inputs: NormalizedInputs,
                           plan: TechnicalAnswerPlan) -> Tuple[Optional[str], List[str]]:
        """
        Adayları ürün matrisiyle filtrele ve malzemeye göre birini seç.

        CR-TPI-001: genel TPI tablosu başka bir adım önerse bile son söz
        ürünün gerçekten ürettiği diş adımlarınındır.
        """
        notes: List[str] = []

        if available:
            usable = [t for t in candidates if t in available]

            # Tabloda önerilen adım bu üründe üretilmiyorsa YALNIZCA
            # onaylanmış bir mühendislik eşlemesi varsa ikame edilir.
            if not usable:
                for candidate in candidates:
                    approved = APPROVED_TPI_SUBSTITUTIONS.get(candidate)
                    if approved and approved["to"] in available:
                        notes.append(
                            f"Tablo {candidate} öneriyor; bu üründe {candidate} "
                            f"üretilmiyor. Onaylı mühendislik eşlemesi uyarınca "
                            f"{approved['to']} kullanıldı ({approved['basis']})."
                        )
                        return approved["to"], notes
                # Onaylı eşleme yok → SAYISAL YAKINLIKLA İKAME EDİLMEZ.
                return None, notes

            candidates = usable

        if len(candidates) == 1:
            return candidates[0], notes

        family = (inputs.material_family_tr or "").lower()
        if any(hint in family for hint in _WORK_HARDENING_HINTS):
            chosen = max(candidates, key=tpi_numeric)     # daha ince (TPI-005)
            notes.append(
                f"{inputs.material_family_tr} iş sertleşen bir malzeme olduğu için "
                f"örtüşen adaylar arasından daha ince adım ({chosen}) seçildi."
            )
        elif any(hint in family for hint in _GUMMY_HINTS):
            chosen = min(candidates, key=tpi_numeric)     # daha kaba (TPI-004)
            notes.append(
                f"{inputs.material_family_tr} yapışkan talaş ürettiği için talaş "
                f"boşluğu daha büyük olan kaba adım ({chosen}) seçildi."
            )
        else:
            # Ne iş sertleşen ne yapışkan: özel bir yön yok. Ortadaki adayı
            # seçmek bir TAHMİN olurdu; talaş boşluğu en geniş adım alınır,
            # gerekçe açıkça yazılır.
            chosen = min(candidates, key=tpi_numeric)
            if inputs.material_family_tr:
                notes.append(
                    f"{inputs.material_family_tr} için örtüşen adaylar arasından "
                    f"talaş tahliyesi en rahat adım ({chosen}) seçildi."
                )
            else:
                notes.append(
                    f"Malzeme ailesi netleşmediği için örtüşen adaylar arasından "
                    f"talaş boşluğu en geniş adım ({chosen}) seçildi."
                )
        return chosen, notes

    # ================================================================== #
    # 7) Hız ve kesim performansı
    # ================================================================== #

    def _apply_cutting_conditions(self, inputs: NormalizedInputs,
                                  plan: TechnicalAnswerPlan) -> None:
        if not inputs.material_grade:
            return

        records = self.materials.conditions_for(
            inputs.material_grade, inputs.hardness_value, inputs.hardness_unit)
        if not records:
            return

        record = records[0]

        # Sertlik uyuşmazlığı kontrolü — tablo bu KONDİSYONU kapsıyor mu?
        mismatch = self._hardness_mismatch(inputs, record)
        if mismatch:
            plan.warnings.append(mismatch)
            plan.status = "conditional"
            plan.confidence = "verification_required"
            return

        plan.add_source(record.get("source"))
        for vs in record.get("verification_sources", []) or []:
            plan.add_source(vs)

        # Kapsam kontrolü (SCOPE-001): tablo yalnızca belirli kesit
        # aralığında geçerli; dışına Q EKSTRAPOLE EDİLMEZ.
        scope = record.get("workpiece_dimension_mm") or {}
        lo = float(scope.get("min", _DEFAULT_SCOPE_MM[0]))
        hi = float(scope.get("max", _DEFAULT_SCOPE_MM[1]))
        dimension = self.contact_length_mm(inputs)

        speed = record.get("blade_speed_m_min") or {}
        if speed:
            plan.cutting_speed = Range(float(speed["min"]), float(speed["max"]), "m/dak")

        # Ölçü BİLİNMİYORSA Q verilmez.
        #
        # Q tablosu yalnızca 50–125 mm kesit için doğrulanmış. Kesit ölçüsü
        # yokken kapsam içinde olup olmadığımızı DOĞRULAYAMAYIZ; "bilmiyorsak
        # kapsam içi say" varsayımı, 300 mm'lik bir iş için 100 mm'lik Q
        # değerini vermek anlamına gelir. Hız malzeme özelliğine bağlı
        # olduğu için verilmeye devam eder.
        if dimension is None:
            plan.assumptions.append(
                "Kesit ölçüsü henüz belli olmadığı için kesim performansı (Q) "
                f"ve süre verilmedi; tablo {self._fmt(lo)}–{self._fmt(hi)} mm "
                "kesit için doğrulanmış."
            )
        elif lo <= float(dimension) <= hi:
            rate = record.get("cutting_rate_cm2_min") or {}
            if rate:
                plan.cutting_rate = Range(float(rate["min"]), float(rate["max"]), "cm²/dak")
        else:
            plan.warnings.append(
                f"Kesim performansı (Q) tablosu {self._fmt(lo)}–{self._fmt(hi)} mm "
                f"kesit için doğrulanmış. {self._fmt(dimension)} mm bu kapsamın "
                "dışında olduğu için Q değeri verilmiyor — ekstrapolasyon yapılmaz."
            )
            plan.status = "conditional"

        # Doğrulama durumu güveni belirler — ama daha önce teknik inceleme
        # kararı verilmişse güven YÜKSELTİLMEZ. Hız tablosunun doğrulanmış
        # olması, ürün varyantının bulunmadığı gerçeğini ortadan kaldırmaz.
        if plan.status == "technical_review_required":
            return

        status = record.get("verification_status", "")
        if status == "verified":
            plan.confidence = "high"
        elif status == "corrected_or_flagged":
            plan.confidence = "high"
            # QA notu yalnızca GÖSTERDİĞİMİZ sayıyı ilgilendiriyorsa yüzeye
            # çıkar. Kayıtların bir kısmında düzeltme kalite yazımıyla ilgili
            # ("3472" -> "347"); bunu kullanıcıya hız/Q düzeltmesi gibi
            # sunmak yanıltıcı olur. printed_value hangi alanın düzeltildiğini
            # söylüyor; ondan karar veriyoruz.
            corrected_fields = set(record.get("printed_value") or {})
            shown_fields = {"blade_speed_m_min", "cutting_rate_cm2_min"}
            if record.get("qa_note") and (corrected_fields & shown_fields):
                plan.assumptions.append(
                    f"Katalog baskısındaki değer düzeltildi: {record['qa_note']}")
        else:
            plan.confidence = "medium"

        # Kalite yaklaşık bir eşdeğerle çözüldüyse (S235 -> A36) sayılar
        # doğrulanmış tablodan gelse bile DAYANAK yaklaşıktır; güven
        # "yüksek" olamaz.
        if inputs.material_is_approximate:
            plan.confidence = "medium"
            plan.warnings.append(
                f"{(inputs.material_input or '').strip()[:40]} için kesim "
                "tablosunda doğrudan satır yok; benzer sınıf bir malzemenin "
                "değerleri kullanıldı. Bu değerleri başlangıç noktası olarak "
                "alın ve ilk kesimde davranışa göre ayarlayın."
            )

        # Zor işlenen alaşımlarda kesime giriş kritiktir: ilk temasta
        # yüksek ilerleme diş kaybettirir ve iş sertleşmesi başlatır.
        family = (inputs.material_family_tr or "").lower()
        if any(hint in family for hint in self._CAREFUL_START_HINTS):
            plan.warnings.append(
                f"{inputs.material_family_tr} zor işlenen bir gruptur: kesime "
                "düşük ilerlemeyle ve dikkatli girin. İlk temasta yüksek "
                "ilerleme diş kaybına ve iş sertleşmesine yol açar."
            )

        # CTX-004: makine hız sınırı malzeme tablosunun ÜSTÜNDEDİR
        self._clamp_speed_to_machine(inputs, plan)

    def _hardness_mismatch(self, inputs: NormalizedInputs,
                           record: Dict) -> Optional[str]:
        """
        Kullanıcının verdiği sertlik, tablo satırının kapsamına uyuyor mu?

        İki ayrı risk:

        1. BİRİM UYUŞMAZLIĞI — HB, HRB ve HRC farklı ölçeklerdir ve
           aralarında malzemeden bağımsız, evrensel bir dönüşüm YOKTUR.
           ASTM E140 dönüşüm tabloları malzeme grubuna özeldir ve elimizde
           tam tablo yok; kayıtta yalnızca künye var. Bu yüzden birim
           çevirmiyoruz — çeviremediğimizi söylüyoruz.

        2. AYNI BİRİMDE ÇOK UZAK DEĞER — kesim tablosu 150 HB'lik AISI 304
           için yazılmışken kullanıcı 400 HB derse o satırın hızı geçerli
           değildir. Yakınlığa göre satır seçmek (materials.conditions_for)
           tek başına yeterli koruma değil; mesafe de denetlenmeli.
        """
        user_unit = (inputs.hardness_unit or "").upper()
        if not user_unit or inputs.hardness_value is None:
            return None

        record_unit = (record.get("hardness_unit") or "HB").upper()
        record_value = record.get("hardness_value")
        material = inputs.material_normalized or inputs.material_grade

        if user_unit != record_unit:
            return (
                f"Kesim tablosunda {material} yalnızca "
                f"{self._fmt(record_value)} {record_unit} kondisyonuyla "
                f"listelenmiş; siz {self._fmt(inputs.hardness_value)} "
                f"{user_unit} verdiniz. {user_unit} ile {record_unit} arasında "
                "malzemeden bağımsız güvenilir bir dönüşüm bulunmadığı için "
                "hız ve kesim performansı değeri vermiyorum. Malzemenin "
                f"{record_unit} cinsinden sertliğini verirseniz hesaplayabilirim."
            )

        # Aynı birim: %25'ten fazla sapma tabloyu geçersiz kılar.
        if record_value:
            deviation = abs(float(inputs.hardness_value) - float(record_value))
            if deviation / float(record_value) > _HARDNESS_TOLERANCE:
                return (
                    f"Kesim tablosundaki {material} satırı "
                    f"{self._fmt(record_value)} {record_unit} için doğrulanmış; "
                    f"verdiğiniz {self._fmt(inputs.hardness_value)} {user_unit} "
                    "bu değerden belirgin biçimde uzak. Tablo bu kondisyonu "
                    "kapsamadığı için sayısal hız ve kesim performansı "
                    "vermiyorum."
                )
        return None

    # Bu hızın üstünde makinenin yetişip yetişmediği ayrıca doğrulanmalı.
    # Çoğu metal şerit testere 100 m/dak üstüne çıkamaz; alüminyum tablosu
    # 120-135 m/dak öneriyor. Sınır bilinmiyorken bunu sessizce vermek,
    # kullanıcının erişemeyeceği bir hedefi "öneri" diye sunmaktır.
    _SPEED_VERIFY_THRESHOLD = 100.0

    # Zor işlenen aileler: kesime dikkatli girilmeli (iş sertleşmesi ve
    # ilk temasta diş kaybı riski yüksek).
    _CAREFUL_START_HINTS = ("nikel", "titanyum", "refrakter", "çökelme", "cokelme")

    def _clamp_speed_to_machine(self, inputs: NormalizedInputs,
                                plan: TechnicalAnswerPlan) -> None:
        limit = inputs.machine_speed_max_m_min

        if limit is None and plan.cutting_speed is not None \
                and plan.cutting_speed.max > self._SPEED_VERIFY_THRESHOLD:
            plan.warnings.append(
                f"Tablo {plan.cutting_speed.format_tr()} öneriyor; bu değer pek "
                "çok metal şerit testerenin üst sınırının üzerinde. Makinenizin "
                "bu bant hızına çıkabildiğini kontrol edin, çıkamıyorsa "
                "makinenin en yüksek hızını kullanın."
            )

        if limit is None or plan.cutting_speed is None:
            return
        speed = plan.cutting_speed
        if speed.max <= limit:
            return
        new_min = min(speed.min, limit)
        plan.cutting_speed = Range(new_min, limit, speed.unit)
        plan.warnings.append(
            f"Malzeme tablosu {speed.format_tr()} öneriyor ancak makinenizin üst "
            f"sınırı {self._fmt(limit)} m/dak. Makine sınırı esas alındı; tablonun "
            "üst ucuna çıkılamayacağı için kesim süresi uzayabilir."
        )

    # ================================================================== #
    # 8) Tahmini süre
    # ================================================================== #

    def _cut_area_cm2(self, inputs: NormalizedInputs) -> Optional[float]:
        """Kesilecek kesit alanı (cm²)."""
        multiplier = 1
        if inputs.is_bundle() and inputs.bundle_rows and inputs.bundle_cols:
            multiplier = int(inputs.bundle_rows) * int(inputs.bundle_cols)

        if inputs.shape == "solid" and inputs.diameter_mm:
            area_mm2 = math.pi * (float(inputs.diameter_mm) / 2.0) ** 2
        elif inputs.shape in ("profile", "tube"):
            if not (inputs.width_mm and inputs.height_mm and inputs.wall_thickness_mm):
                return None
            w, h, t = (float(inputs.width_mm), float(inputs.height_mm),
                       float(inputs.wall_thickness_mm))
            inner_w, inner_h = max(w - 2 * t, 0.0), max(h - 2 * t, 0.0)
            area_mm2 = w * h - inner_w * inner_h
        elif inputs.width_mm and inputs.height_mm:
            area_mm2 = float(inputs.width_mm) * float(inputs.height_mm)
        else:
            return None
        return area_mm2 / 100.0 * multiplier

    def _apply_estimated_time(self, inputs: NormalizedInputs,
                              plan: TechnicalAnswerPlan) -> None:
        if plan.cutting_rate is None:
            return
        area = self._cut_area_cm2(inputs)
        if not area or area <= 0:
            return
        rate = plan.cutting_rate
        if rate.max <= 0 or rate.min <= 0:
            return
        # Yüksek Q -> kısa süre; aralık ters çevrilir.
        plan.estimated_time_min = Range(
            round(area / rate.max, 1), round(area / rate.min, 1), "dak")
        plan.assumptions.append(
            f"Süre, {self._fmt(round(area, 1))} cm² kesit alanının Q aralığına "
            "bölünmesiyle hesaplandı; makine durumu, sıkma ve soğutma sonucu "
            "değiştirir, üretim garantisi değildir."
        )

    # ================================================================== #
    # 9) Alıştırma / gerginlik / soğutma
    # ================================================================== #

    def _apply_break_in(self, plan: TechnicalAnswerPlan,
                        product: Optional[Dict]) -> None:
        if not product:
            return
        edge = (product.get("cutting_edge") or "").lower()
        scope = "carbide" if "karbür" in edge or "karbur" in edge else "bimetal"
        for rule in self.kb.break_in_rules:
            if rule.get("blade_scope") != scope:
                continue
            plan.break_in = dict(rule)
            plan.add_source(rule.get("source"))
            return

    def _apply_tension(self, inputs: NormalizedInputs, plan: TechnicalAnswerPlan,
                       product: Optional[Dict]) -> None:
        """
        Gerginlik aralığı — ama makine kılavuzu her zaman üstündür
        (TENSION-001 / CR-TENSION-001).
        """
        if not product or inputs.blade_width_mm is None:
            return
        name = product.get("canonical_name")
        width = float(inputs.blade_width_mm)

        for rule in self.kb.tension_rules:
            if name not in rule.get("products", []):
                continue
            if not self._width_rule_matches(rule.get("width_rule", ""), width):
                continue
            plan.tension = {
                "psi": [rule["psi_min"], rule["psi_max"]],
                "kgf_cm2": [rule["kgf_cm2_min"], rule["kgf_cm2_max"]],
                "mpa": [rule["mpa_min"], rule["mpa_max"]],
                "override": rule.get("override"),
            }
            plan.add_source(rule.get("source"))
            plan.warnings.append(
                "Gerginlik değeri ürün tablosundandır; makine üreticisinin "
                "kılavuzunda farklı bir sınır varsa KILAVUZ geçerlidir."
            )
            return

        # Bu ürün için doğrulanmış gerginlik verisi YOK.
        #
        # Sessizce atlamak da, başka bir ürün ailesinin değerini aktarmak da
        # yanlış: gerginlik bıçak gövdesinin malzemesine ve geometrisine
        # bağlıdır, aileler arası taşınmaz. Eksikliği açıkça bildiriyoruz ve
        # plana yazıyoruz ki izlenebilir olsun.
        plan.missing_inputs.append("verified_tension_data")
        plan.warnings.append(
            f"{name} için doğrulanmış bant gerginliği tablosu elimizde yok; "
            "başka bir ürün ailesinin değerini buraya taşımıyorum. Gerginliği "
            "makine üreticisinin kılavuzundaki değere göre ayarlayın ve "
            "BYCUTTECH teknik ekibinden bu ürüne özel değeri teyit ettirin."
        )

    @staticmethod
    def _width_rule_matches(rule: str, width: float) -> bool:
        rule = (rule or "").strip()
        if rule.startswith("<="):
            return width <= float(rule[2:])
        if rule.startswith(">="):
            return width >= float(rule[2:])
        if "|" in rule:
            return any(abs(width - float(p)) < 0.01 for p in rule.split("|"))
        try:
            return abs(width - float(rule)) < 0.01
        except ValueError:
            return False

    def _apply_coolant(self, inputs: NormalizedInputs,
                       plan: TechnicalAnswerPlan) -> None:
        """
        Soğutma tavsiyesi.

        Yüzde oranı VERİLMEZ: karışım oranı ürünün teknik veri sayfasına ve
        makineye bağlıdır, göz kararı ayarlanamaz (SAFE-004). Ölçüm yöntemi
        önerilir.
        """
        if inputs.coolant == "dry":
            plan.warnings.append(
                "Kuru kesim bimetal şerit ömrünü belirgin biçimde kısaltır; "
                "malzeme kuru kesime uygun değilse soğutma önerilir."
            )
        plan.coolant_advice = (
            "Emülsiyon karışım oranını göz kararı değil refraktometre ile "
            "ayarlayın; doğru oran ürünün teknik veri sayfasında ve makine "
            "kılavuzunda belirtilir."
        )

    # ================================================================== #
    # 10) Açık QA
    # ================================================================== #

    def _apply_open_qa(self, plan: TechnicalAnswerPlan) -> None:
        """Ürün sahibinin incelemesini bekleyen madde varsa güveni düşür."""
        for issue in self.kb.open_qa:
            subject = (issue.get("subject") or "").lower()
            if plan.product_name and plan.product_name.lower() in subject:
                plan.confidence = "verification_required"
                plan.status = "technical_review_required"
                plan.review_reason = (
                    f"{plan.product_name} için açık bir teknik doğrulama maddesi var "
                    f"({issue.get('id')}): {issue.get('subject')}."
                )
                return

    # ================================================================== #

    @staticmethod
    def _nearest_at_least(values: List[float], target: float) -> Optional[float]:
        candidates = [v for v in values if v >= target]
        return min(candidates) if candidates else (max(values) if values else None)

    @staticmethod
    def _nearest_at_most(values: List[float], target: float) -> Optional[float]:
        candidates = [v for v in values if v <= target]
        return max(candidates) if candidates else (min(values) if values else None)

    @staticmethod
    def _fmt(value: Any) -> str:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return str(value)
        return str(int(number)) if number.is_integer() else str(number)
