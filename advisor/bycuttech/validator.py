# -*- coding: utf-8 -*-
"""
RequiredInputValidator + SafetyValidator.

RequiredInputValidator, kesin öneri için hangi bilginin eksik olduğunu
belirler ve eksikliğe göre HANGİ ÇIKTININ BASTIRILACAĞINI söyler. Bastırma
listesi decision_rules'daki REQ-001..003 kurallarının kod karşılığıdır:

    malzeme kalitesi yok   -> sayısal hız ve Q verilmez
    kesit/ölçü yok         -> TPI verilmez
    makine/bıçak ölçüsü yok-> genişlik, kalınlık, gerginlik verilmez

SafetyValidator ise plan hazır olduktan SONRA çalışır ve "uydurulmuş"
çıktıyı yakalar: var olmayan varyant, kapsam dışı ekstrapolasyon, kaynağı
olmayan sayı. Bu son savunma hattıdır — buradan geçemeyen değer
kullanıcıya gösterilmez.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from bycuttech.materials import FAMILY_HINTS, MaterialResolver
from bycuttech.models import NormalizedInputs, TechnicalAnswerPlan

# Eksik alan -> kullanıcıya sorulacak kısa Türkçe soru.
_QUESTIONS: Dict[str, str] = {
    "material_grade": "Malzemenin tam kalitesi nedir? (ör. 304, S235, 4140)",
    "alloy_grade": "Alaşımın tam kodu nedir? (ör. 6061, 5052, 7075)",
    "hardness_or_condition": "Malzeme hangi kondisyonda? (tavlanmış / sertleştirilmiş, "
                             "biliyorsanız HB veya HRC değeri)",
    "shape": "Kesit türü nedir? (dolu mil, boru, kutu profil, lama, sac)",
    "dimensions": "Kesit ölçüleri nedir? (dolu için çap, profil için genişlik×yükseklik)",
    "wall_thickness": "Et (cidar) kalınlığı kaç mm?",
    "machine_or_blade_size": "Makine marka/modeli nedir? Bilmiyorsanız bıçak ölçüsü "
                             "(uzunluk×genişlik×kalınlık) yeterli.",
}

# Kalite yerine "alaşım kodu" sorulacak aileler.
_ALLOY_FAMILIES = {"aluminyum", "bakir", "nikel", "titanyum"}


def _merge(first: List[str], second: List[str]) -> List[str]:
    """Sırayı koruyarak birleştir, tekrarları at."""
    seen = set()
    out: List[str] = []
    for item in list(first) + list(second):
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


@dataclass
class ValidationResult:
    """Eksik girdiler ve bunların doğurduğu bastırma kuralları."""

    missing: List[str] = field(default_factory=list)
    suppress: Set[str] = field(default_factory=set)
    questions: List[str] = field(default_factory=list)

    @property
    def complete(self) -> bool:
        return not self.missing


class RequiredInputValidator:
    """Kesin öneri için zorunlu girdileri denetler."""

    MAX_QUESTIONS = 3   # tek mesajda en fazla üç kısa soru (§4)

    def __init__(self, knowledge_base):
        self.kb = knowledge_base
        self.materials = MaterialResolver(knowledge_base)

    def validate(self, inputs: NormalizedInputs,
                 raw_message: str = "") -> ValidationResult:
        result = ValidationResult()

        self._check_material(inputs, raw_message, result)
        self._check_geometry(inputs, result)
        self._check_machine(inputs, result)

        # Tek mesajda en fazla üç soru; sıralama zorunluluk sırasına göre.
        result.questions = [
            _QUESTIONS[key] for key in result.missing if key in _QUESTIONS
        ][: self.MAX_QUESTIONS]
        return result

    # ------------------------------------------------------------------ #

    def _check_material(self, inputs: NormalizedInputs, raw_message: str,
                        result: ValidationResult) -> None:
        if not inputs.material_grade:
            family = self.materials.family_only_mention(
                inputs.material_input or raw_message)
            key = "alloy_grade" if family in _ALLOY_FAMILIES else "material_grade"
            result.missing.append(key)
            # REQ-001: kalite yoksa sayısal hız/Q ÜRETİLMEZ.
            result.suppress.update({"cutting_speed", "cutting_rate", "estimated_time"})
            return

        # Kalite var; kondisyon ayrıca gerekli mi?
        records = self.materials.conditions_for(inputs.material_grade)
        if inputs.hardness_value is None and \
                self.materials.requires_condition(inputs.material_grade, records):
            result.missing.append("hardness_or_condition")
            result.suppress.update({"cutting_speed", "cutting_rate", "estimated_time"})

    def _check_geometry(self, inputs: NormalizedInputs,
                        result: ValidationResult) -> None:
        if not inputs.shape:
            result.missing.append("shape")
            result.missing.append("dimensions")
            result.suppress.add("tpi")        # REQ-002
            return

        if inputs.shape == "solid":
            if not (inputs.diameter_mm or inputs.width_mm):
                result.missing.append("dimensions")
                result.suppress.add("tpi")
            return

        if inputs.shape in ("tube", "profile"):
            if not (inputs.width_mm or inputs.diameter_mm):
                result.missing.append("dimensions")
                result.suppress.add("tpi")
            # Boru/profilde cidar OLMADAN TPI seçilemez: matris dış ölçü ve
            # cidarı BİRLİKTE kullanır, yalnız çapa bakmak diş kırar.
            if inputs.wall_thickness_mm is None:
                result.missing.append("wall_thickness")
                result.suppress.add("tpi")
            return

        if inputs.shape == "sheet" and not (inputs.wall_thickness_mm or inputs.height_mm):
            result.missing.append("dimensions")
            result.suppress.add("tpi")

    def _check_machine(self, inputs: NormalizedInputs,
                       result: ValidationResult) -> None:
        has_blade = (inputs.blade_width_mm is not None
                     and inputs.blade_thickness_mm is not None)
        if not has_blade:
            result.missing.append("machine_or_blade_size")
            # REQ-003: makine/bıçak ölçüsü yoksa genişlik-kalınlık-gerginlik verilmez.
            result.suppress.update({"blade_dimensions", "tension", "variant"})


class SafetyValidator:
    """
    Plan hazır olduktan sonraki son kontrol.

    Buradaki her kural, ihlal edildiğinde kullanıcının yanlış ürün sipariş
    etmesine veya güvensiz bir işlem yapmasına yol açabilecek bir maddedir.
    """

    def __init__(self, knowledge_base, engine):
        self.kb = knowledge_base
        self.engine = engine

    def apply(self, plan: TechnicalAnswerPlan,
              validation: Optional[ValidationResult] = None) -> TechnicalAnswerPlan:
        if validation:
            self._suppress(plan, validation)

        self._verify_variant_exists(plan)
        self._verify_numbers_have_sources(plan)
        self._strip_numbers_when_unverified(plan)
        self._finalize_status(plan, validation)
        return plan

    @staticmethod
    def _strip_numbers_when_unverified(plan: TechnicalAnswerPlan) -> None:
        """
        Teknik inceleme gerekiyorsa sayısal alanları PLANDAN da sil.

        Composer bu durumda zaten sayı yazmıyor, ama plan API yükünde
        (`/api/chat` -> `plan`) dışarı çıkıyor. Orada duran bir hız değeri
        er ya da geç bir arayüzde gösterilir; sözleşme "verification_required
        ise sayı yok" diyorsa bu her katmanda geçerli olmalı.
        """
        if plan.status != "technical_review_required":
            return
        plan.cutting_speed = None
        plan.cutting_rate = None
        plan.estimated_time_min = None
        plan.tension = None

    # ------------------------------------------------------------------ #

    @staticmethod
    def _suppress(plan: TechnicalAnswerPlan, validation: ValidationResult) -> None:
        """Eksik girdinin yasakladığı çıktıları plandan SİL."""
        suppress = validation.suppress
        if "tpi" in suppress:
            plan.tpi = None
            plan.tpi_basis = None
            plan.teeth_in_cut = None
        if "cutting_speed" in suppress:
            plan.cutting_speed = None
        if "cutting_rate" in suppress:
            plan.cutting_rate = None
        if "estimated_time" in suppress:
            plan.estimated_time_min = None
        if "tension" in suppress:
            plan.tension = None
        if "variant" in suppress:
            plan.verified_variant = None

        # Motorun kendi eklediği eksikler (ör. HARD-001'in karbür uygunluğu
        # sorusu) KORUNUR. Üzerine yazmak, kural motorunun tespit ettiği
        # kritik soruyu sessizce yutuyordu.
        plan.missing_inputs = _merge(plan.missing_inputs, validation.missing)
        plan.questions_to_ask = _merge(
            plan.questions_to_ask, validation.questions
        )[:RequiredInputValidator.MAX_QUESTIONS]

    def _verify_variant_exists(self, plan: TechnicalAnswerPlan) -> None:
        """
        Önerilen ürün + ölçü + TPI kombinasyonu gerçekten üretiliyor mu?

        Üretilmiyorsa öneri geri çekilir ve teknik inceleme istenir. SKU
        uydurmanın önündeki asıl bariyer budur (FIT-001, ADV-004).
        """
        if not (plan.product_family and plan.verified_variant):
            return
        try:
            width, thickness = (float(x) for x in plan.verified_variant.split("x"))
        except (ValueError, AttributeError):
            return

        if not self.engine.variant_exists(plan.product_family, width, thickness, plan.tpi):
            plan.status = "technical_review_required"
            plan.confidence = "verification_required"
            plan.review_reason = (
                f"{plan.product_name} {plan.verified_variant} ölçüsünde "
                f"{plan.tpi} diş adımı ürün matrisinde bulunmuyor."
            )
            plan.verified_variant = None
            plan.tpi = None

    @staticmethod
    def _verify_numbers_have_sources(plan: TechnicalAnswerPlan) -> None:
        """
        Sayısal çıktı varsa arkasında en az bir kaynak OLMALI.

        Kaynaksız sayı, tanım gereği doğrulanmamış sayıdır; gösterilmez.
        """
        if plan.has_numeric_output() and not plan.source_ids:
            plan.cutting_speed = None
            plan.cutting_rate = None
            plan.estimated_time_min = None
            plan.tpi = None
            plan.verified_variant = None
            plan.confidence = "verification_required"
            plan.status = "technical_review_required"
            plan.review_reason = (
                "Teknik değerler için doğrulanmış kaynak bulunamadı."
            )

    @staticmethod
    def _finalize_status(plan: TechnicalAnswerPlan,
                         validation: Optional[ValidationResult]) -> None:
        """Nihai durumu belirle (zaten inceleme/koşullu ise dokunma)."""
        if plan.status in ("technical_review_required", "out_of_scope"):
            return
        if validation and validation.missing:
            plan.status = "need_input"
            if plan.confidence == "high":
                plan.confidence = "medium"
            return
        if plan.status == "conditional":
            return
        if plan.tpi or plan.cutting_speed:
            plan.status = "exact"
