# -*- coding: utf-8 -*-
"""
BYCUTTECH Şerit Testere AI — iç cevap sözleşmesi (typed).

Bu modülün tek işi, cevap üretilmeden ÖNCE oluşturulan planın tipini
sabitlemek. Plan tipli olmazsa "sayıyı kim üretti" sorusunun cevabı
kaybolur; LLM'in uydurduğu bir değerle kural motorunun ürettiği değer
aynı sözlükte yan yana durur ve ayırt edilemez.

Sözleşmenin özü:
    Sayısal her alanın yanında onu üreten kaynak (`source_ids`) ve
    güven seviyesi taşınır. `confidence == "verification_required"` ise
    cevapta sayı GÖSTERİLMEZ; eksik bilgi sorulur ya da teknik inceleme
    istenir.

Not: Proje Python; görev tanımındaki TypeScript `TechnicalAnswerPlan`
sözleşmesi buraya birebir alan adlarıyla taşındı (camelCase yerine
Python'un snake_case'i kullanıldı, `to_dict()` API sınırında camelCase
üretir).
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Literal, Optional

# Güven seviyeleri.
#   high                  : doğrulanmış tablodan birebir okundu
#   medium                : okundu ama en az bir varsayım var (ör. kapsam sınırı)
#   verification_required : çelişki/açık QA/kapsam dışı → sayı verilmez
Confidence = Literal["high", "medium", "verification_required"]

# Konuşmanın kapsam durumu.
Scope = Literal["in_domain", "out_of_domain", "mixed"]

# Cevabın olgunluk durumu.
#   exact                       : tüm zorunlu girdi var, kesin öneri üretildi
#   conditional                 : öneri var ama bir kısmı kapsam dışı (ör. Q ekstrapole edilemez)
#   need_input                  : zorunlu girdi eksik, soru sorulacak
#   technical_review_required   : çelişki ya da matriste olmayan kombinasyon
#   out_of_scope                : şerit testere dışı
AnswerStatus = Literal[
    "exact", "conditional", "need_input",
    "technical_review_required", "out_of_scope",
]


@dataclass(frozen=True)
class Range:
    """Kapalı sayı aralığı. Tek değerli tablolarda min == max olur."""

    min: float
    max: float
    unit: str

    def to_dict(self) -> Dict[str, Any]:
        return {"min": self.min, "max": self.max, "unit": self.unit}

    def format_tr(self) -> str:
        if self.min == self.max:
            return f"{self._n(self.min)} {self.unit}"
        return f"{self._n(self.min)}–{self._n(self.max)} {self.unit}"

    @staticmethod
    def _n(value: float) -> str:
        return str(int(value)) if float(value).is_integer() else str(value)


@dataclass(frozen=True)
class SourceRef:
    """
    Bir teknik değerin arkasındaki kaynak.

    Görev tanımındaki zorunlu metadata alanlarının tamamı burada taşınır;
    kullanıcı "kaynak nedir" diye sorduğunda yalnızca GERÇEKTEN kullanılan
    kayıtlar gösterilebilsin diye plan içinde id olarak tutulur.
    """

    source_id: str
    title: str = ""
    publisher: str = ""
    url: str = ""
    scope: str = ""
    verification_status: str = ""
    brand_scope: Optional[str] = None
    last_checked: str = ""
    confidence: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NormalizedInputs:
    """
    Kullanıcı mesajlarından çıkarılmış, normalize edilmiş teknik girdiler.

    Oturum boyunca BİRİKİR. Kullanıcı bir değeri açıkça değiştirmedikçe
    eski değer korunur (RUNTIME_SYSTEM_PROMPT §3). "Peki Ø120 olursa?"
    yalnızca çapı değiştirir, malzemeyi ve makineyi değiştirmez.
    """

    # Malzeme
    material_input: Optional[str] = None        # kullanıcının yazdığı ham metin
    material_grade: Optional[str] = None        # normalize edilmiş kalite (ör. "304")
    material_normalized: Optional[str] = None   # gösterim adı (ör. "AISI 304")
    material_family_tr: Optional[str] = None    # tablodaki aile adı
    # Kalite YAKLAŞIK bir eşdeğerle çözüldüyse (ör. S235 -> A36)
    # sayısal sonuç tek dayanak olarak kullanılamaz; güven düşürülür.
    #
    # Optional[bool]: varsayılanı False YAPMA. to_dict() yalnızca None
    # değerleri eler; False bir "değer" sayıldığı için boş bir oturumda
    # bile normalized_inputs dolu görünür ve selamlama gibi sosyal
    # cevaplar "teknik içerik var" sanılıp bastırılır.
    material_is_approximate: Optional[bool] = None
    hardness_value: Optional[float] = None
    hardness_unit: Optional[str] = None         # "HB" | "HRC"

    # Kesit
    shape: Optional[str] = None                 # solid | tube | profile | sheet | bundle
    diameter_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    wall_thickness_mm: Optional[float] = None
    bundle_rows: Optional[int] = None
    bundle_cols: Optional[int] = None

    # Makine / bıçak
    machine_query: Optional[str] = None
    machine_manufacturer: Optional[str] = None
    machine_model: Optional[str] = None
    blade_length_mm: Optional[float] = None
    blade_width_mm: Optional[float] = None
    blade_thickness_mm: Optional[float] = None
    machine_speed_max_m_min: Optional[float] = None
    # Makine karbür bıçak çalıştırabiliyor mu? 45 HRC üstü malzemede
    # bimetal yerine karbüre geçebilmenin ÖN KOŞULU (HARD-001). Serbest
    # metinden değil, ayrı bir girdi olarak taşınır ki kural motoru
    # metin arayarak karar vermesin.
    machine_carbide_capable: Optional[bool] = None

    # Kullanıcının açıkça istediği ürün/varyant (TECH-010: var olmayan
    # kombinasyon istenirse reddedilebilsin diye ayrı tutulur)
    requested_product_id: Optional[str] = None
    requested_tpi: Optional[str] = None
    requested_width_mm: Optional[float] = None
    requested_thickness_mm: Optional[float] = None

    # Koşullar
    coolant: Optional[str] = None               # flood | mist | dry | unknown
    priority: Optional[str] = None              # speed | life | finish | balanced

    def is_bundle(self) -> bool:
        return self.shape == "bundle" or bool(self.bundle_rows and self.bundle_cols)

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class TechnicalAnswerPlan:
    """
    Cevap üretilmeden önceki tipli plan.

    AnswerComposer YALNIZCA bu plandaki değerleri metne çevirir. Planda
    olmayan bir sayı cevapta da olamaz — "LLM sayı uydurmasın" kuralının
    kod tarafındaki karşılığı budur.
    """

    intent: str = "technical_recommendation"
    in_scope: bool = True
    scope: Scope = "in_domain"
    status: AnswerStatus = "need_input"
    confidence: Confidence = "verification_required"

    normalized_inputs: Dict[str, Any] = field(default_factory=dict)
    missing_inputs: List[str] = field(default_factory=list)
    questions_to_ask: List[str] = field(default_factory=list)

    product_family: Optional[str] = None        # ürün id (ör. "intenss_pro")
    product_name: Optional[str] = None          # gösterim adı (ör. "INTENSS PRO")
    verified_variant: Optional[str] = None      # "27x0.90" gibi gerçek varyant
    cutting_edge: Optional[str] = None          # "M42 bimetal" / "karbür uçlu"

    tpi: Optional[str] = None
    tpi_basis: Optional[str] = None             # neden bu TPI seçildi
    contact_length_mm: Optional[float] = None
    # Değişken diş adımında ("4/6") kesitteki diş sayısı tek bir değer
    # DEĞİLDİR; adım boyunca değişir. {"min","max","nominal","variable"}
    # olarak taşınır ki cevap yanıltıcı tek sayı göstermesin.
    teeth_in_cut: Optional[Dict[str, Any]] = None

    cutting_speed: Optional[Range] = None
    cutting_rate: Optional[Range] = None        # Q (cm²/dak) — lineer ilerleme DEĞİL
    estimated_time_min: Optional[Range] = None
    tension: Optional[Dict[str, Any]] = None
    break_in: Optional[Dict[str, Any]] = None
    coolant_advice: Optional[str] = None

    troubleshooting: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    safety_notes: List[str] = field(default_factory=list)
    source_ids: List[str] = field(default_factory=list)
    retrieved_notes: List[Dict[str, Any]] = field(default_factory=list)

    # Kapsam dışı/karma mesajlarda kullanıcıya iletilecek hazır metin
    scope_message: Optional[str] = None
    review_reason: Optional[str] = None

    def add_source(self, *source_ids: Optional[str]) -> None:
        for sid in source_ids:
            if sid and sid not in self.source_ids:
                self.source_ids.append(sid)

    def has_numeric_output(self) -> bool:
        return any([self.tpi, self.cutting_speed, self.cutting_rate,
                    self.verified_variant, self.tension])

    def to_dict(self) -> Dict[str, Any]:
        """API sınırı için serileştir (Range nesneleri düz sözlüğe iner)."""
        out: Dict[str, Any] = {
            "intent": self.intent,
            "inScope": self.in_scope,
            "scope": self.scope,
            "status": self.status,
            "confidence": self.confidence,
            "normalizedInputs": self.normalized_inputs,
            "missingInputs": list(self.missing_inputs),
            "productFamily": self.product_family,
            "productName": self.product_name,
            "verifiedVariant": self.verified_variant,
            "cuttingEdge": self.cutting_edge,
            "tpi": self.tpi,
            "tpiBasis": self.tpi_basis,
            "contactLengthMm": self.contact_length_mm,
            "teethInCut": self.teeth_in_cut,
            "cuttingSpeed": self.cutting_speed.to_dict() if self.cutting_speed else None,
            "cuttingRate": self.cutting_rate.to_dict() if self.cutting_rate else None,
            "estimatedTimeMin": (self.estimated_time_min.to_dict()
                                 if self.estimated_time_min else None),
            "tension": self.tension,
            "breakIn": self.break_in,
            "warnings": list(self.warnings),
            "assumptions": list(self.assumptions),
            "safetyNotes": list(self.safety_notes),
            "sourceIds": list(self.source_ids),
        }
        return {k: v for k, v in out.items() if v not in (None, [], {})}
