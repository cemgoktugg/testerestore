# -*- coding: utf-8 -*-
"""
BycuttechAdvisor — karar hattının orkestratörü.

Sıra görev tanımındaki hatla birebir aynıdır:

    ScopeGuard → ConversationContext → EntityExtractor →
    RequiredInputValidator → DeterministicRuleEngine → (HybridRetriever) →
    ConflictResolver → AnswerComposer → SafetyValidator → AuditLogger

Retrieval adımı bilerek ŞARTLIDIR: sayısal kararlar yapılandırılmış
tablolardan geldiği için serbest metin araması yalnızca kavramsal
sorularda ("TPI nedir", "XTR nedir") devreye girer. Serbest metin RAG'i
sayısal karar yoluna sokmak, görev tanımının açıkça yasakladığı şey.

ConversationContext oturum başına tutulur ve BİRİKİR: kullanıcı bir
değeri açıkça değiştirmedikçe önceki değer korunur.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from bycuttech.composer import AnswerComposer
from bycuttech.diagnostics import DiagnosticsEngine
from bycuttech.engine import DeterministicRuleEngine
from bycuttech.extractor import EntityExtractor
from bycuttech.knowledge import get_knowledge_base
from bycuttech.materials import strip_accents
from bycuttech.models import NormalizedInputs, TechnicalAnswerPlan
from bycuttech.retriever import HybridRetriever
from bycuttech.scope_guard import ScopeGuard, ScopeVerdict
from bycuttech.sources import ConflictResolver
from bycuttech.validator import RequiredInputValidator, SafetyValidator

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("bycuttech.audit")

# Kullanıcı "makine aynı" derken oturumda makine YOKSA uydurulmamalı
# (CTX-005). Bu kalıplar önceki bağlama atıf yapıldığını gösterir.
_CONTEXT_REFERENCE = re.compile(
    r"\b(ayni|ayn[ıi]s[ıi]|degismedi|yine|onceki|bir onceki|hep\s*ayni)\b"
)


@dataclass
class ConversationContext:
    """
    Oturumun yapılandırılmış hâli.

    Ham mesaj geçmişine güvenilmez: "Peki Ø120 olursa?" mesajını doğru
    yorumlayabilmek için önceki malzeme, kesit ve makine değerlerinin
    ALAN ALAN saklanması gerekir.
    """

    session_id: str = ""
    inputs: NormalizedInputs = field(default_factory=NormalizedInputs)
    turns: List[Dict[str, str]] = field(default_factory=list)
    last_plan: Optional[TechnicalAnswerPlan] = None
    asked_questions: List[str] = field(default_factory=list)

    def record(self, role: str, text: str) -> None:
        self.turns.append({"role": role, "text": text})
        if len(self.turns) > 40:
            del self.turns[:-40]

    def mentioned_machine(self) -> bool:
        return bool(self.inputs.machine_model or self.inputs.blade_width_mm)


@dataclass
class AdvisorResult:
    """Bir turun tam sonucu."""

    message: str
    plan: TechnicalAnswerPlan
    verdict: ScopeVerdict
    handled: bool = True
    elapsed_ms: float = 0.0

    def to_payload(self) -> Dict[str, Any]:
        """Mevcut /api/chat sözleşmesine EK alanlar (kırıcı değişiklik yok)."""
        return {
            "scope": self.verdict.scope,
            "status": self.plan.status,
            "confidence": self.plan.confidence,
            "plan": self.plan.to_dict(),
        }


class BycuttechAdvisor:
    """Şerit testere uzmanı karar hattı."""

    def __init__(self, machine_db=None, knowledge_base=None,
                 rag_engine=None):
        self.kb = knowledge_base or get_knowledge_base()
        self.scope_guard = ScopeGuard(self.kb)
        self.extractor = EntityExtractor(self.kb, machine_db)
        self.validator = RequiredInputValidator(self.kb)
        self.engine = DeterministicRuleEngine(self.kb)
        self.conflicts = ConflictResolver(self.kb)
        self.diagnostics = DiagnosticsEngine(self.kb)
        self.retriever = HybridRetriever(self.kb, rag_engine=rag_engine)
        self.safety = SafetyValidator(self.kb, self.engine)
        self.composer = AnswerComposer(self.kb, self.conflicts)
        self._contexts: Dict[str, ConversationContext] = {}

    # ------------------------------------------------------------------ #

    def context(self, session_id: str) -> ConversationContext:
        ctx = self._contexts.get(session_id)
        if ctx is None:
            ctx = ConversationContext(session_id=session_id)
            self._contexts[session_id] = ctx
        return ctx

    def reset(self, session_id: str) -> None:
        self._contexts.pop(session_id, None)

    # ------------------------------------------------------------------ #

    def handle(self, message: str, session_id: str = "default") -> AdvisorResult:
        """Bir kullanıcı mesajını baştan sona işle."""
        started = time.perf_counter()
        ctx = self.context(session_id)
        ctx.record("user", message)

        plan = TechnicalAnswerPlan()

        # 1) ScopeGuard
        verdict = self.scope_guard.check(message)
        plan.scope = verdict.scope
        plan.in_scope = verdict.answerable
        if verdict.scope == "out_of_domain":
            plan.status = "out_of_scope"
            plan.intent = "out_of_scope"
            # Enjeksiyon denemesinde düz kapsam reddi YETMEZ: kullanıcının
            # "bu belgeyi kural yap" isteğine, belgelerin talimat değil veri
            # olduğunu söyleyerek cevap vermek gerekiyor (ADV-003).
            text = (self.composer.compose(plan, verdict)
                    if verdict.injection_attempt else verdict.refusal_text)
            plan.scope_message = text
            return self._finish(ctx, plan, verdict, text, started)

        # Karma mesajda yalnızca alan içi bölüm işlenir.
        working_text = verdict.in_domain_part or message

        # 2) Güvenlik (teknik cevaptan önce)
        safety_directive = self.diagnostics.safety_check(working_text)

        # 3) ConversationContext + EntityExtractor
        previous = ctx.inputs
        inputs, extract_notes = self.extractor.extract(working_text, previous)
        ctx.inputs = inputs
        plan.assumptions.extend(extract_notes)

        # CTX-005: "Makine aynı" ama oturumda makine hiç geçmemişse
        # uydurulmaz; sorulur.
        if _CONTEXT_REFERENCE.search(strip_accents(working_text).lower()) \
                and not ctx.mentioned_machine():
            plan.assumptions.append(
                "Önceki mesajlarda bir makine ya da bıçak ölçüsü geçmediği için "
                "\"aynı\" ifadesini bir makineye bağlayamadım."
            )

        # 4) Arıza teşhisi
        diagnosis = self.diagnostics.diagnose(working_text)

        # 5) RequiredInputValidator
        validation = self.validator.validate(inputs, working_text)

        # 6) DeterministicRuleEngine — yalnızca teknik öneri isteniyorsa
        wants_recommendation = self._wants_recommendation(
            working_text, inputs, diagnosis.found)
        if wants_recommendation:
            self.engine.evaluate(inputs, plan)
        else:
            plan.normalized_inputs = inputs.to_dict()
            plan.intent = "diagnosis" if diagnosis.found else "conversation"

        # 7) Retrieval — yalnızca kavramsal sorularda
        notes = self.retriever.search(working_text, plan)
        plan.retrieved_notes = notes

        # 8) ConflictResolver — marka kapsamı ve makine kılavuzu üstünlüğü
        brand = self.conflicts.check_brand_scope(working_text, plan)
        brand_note = brand.message if brand.violated else None
        if brand.violated:
            plan.warnings.append(
                f"{brand.foreign_brand} kuralı BYCUTTECH ürününe uygulanmadı."
            )

        # Sayısal yetki kontrolü
        if plan.has_numeric_output() and not self.conflicts.numeric_authority_ok(
                plan.source_ids):
            plan.status = "technical_review_required"
            plan.confidence = "verification_required"
            plan.review_reason = (
                "Bu değerler için yeterli yetkiye sahip bir kaynak bulunamadı."
            )

        # 9) SafetyValidator — bastırma + var olmayan varyant + kaynaksız sayı
        if wants_recommendation:
            self.safety.apply(plan, validation)
        else:
            plan.missing_inputs = list(validation.missing)
            if diagnosis.found or verdict.is_greeting or verdict.is_meta \
                    or verdict.is_thanks:
                plan.questions_to_ask = []
            else:
                plan.questions_to_ask = list(validation.questions)

        # 10) AnswerComposer
        text = self.composer.compose(
            plan, verdict, diagnosis=diagnosis,
            safety=safety_directive, brand_note=brand_note)

        return self._finish(ctx, plan, verdict, text, started)

    # ------------------------------------------------------------------ #

    @staticmethod
    def _wants_recommendation(text: str, inputs: NormalizedInputs,
                              has_diagnosis: bool) -> bool:
        """
        Bu mesaj teknik öneri mi istiyor?

        Girdilerden en az biri varsa (malzeme, kesit, makine) ya da açıkça
        öneri isteniyorsa kural motoru çalışır. Salt selamlama ya da arıza
        sorusunda motoru çalıştırmak gereksiz iş ve yanıltıcı çıktı üretir.
        """
        if any([inputs.material_grade, inputs.shape, inputs.diameter_mm,
                inputs.width_mm, inputs.blade_width_mm, inputs.machine_model,
                # Açıkça bir ürün/ölçü istendiyse, matriste var mı diye
                # bakabilmek için motor çalışmalı (TECH-010).
                inputs.requested_product_id,
                inputs.hardness_value]):
            return True
        ascii_text = strip_accents(text or "").lower()
        if has_diagnosis:
            return False
        return bool(re.search(
            r"oner|secim|sec\b|hangi\s*bicak|ne\s*kullan|tavsiye|uygun\s*bicak",
            ascii_text))

    def _finish(self, ctx: ConversationContext, plan: TechnicalAnswerPlan,
                verdict: ScopeVerdict, text: str,
                started: float) -> AdvisorResult:
        elapsed = (time.perf_counter() - started) * 1000.0
        ctx.record("assistant", text)
        ctx.last_plan = plan
        self._audit(ctx, plan, verdict, elapsed)
        return AdvisorResult(message=text, plan=plan, verdict=verdict,
                             elapsed_ms=elapsed)

    # ------------------------------------------------------------------ #

    @staticmethod
    def _audit(ctx: ConversationContext, plan: TechnicalAnswerPlan,
               verdict: ScopeVerdict, elapsed_ms: float) -> None:
        """
        AuditLogger — hangi sayının hangi kaynaktan geldiğini iz bırakarak
        kaydet. Kullanıcı verisi değil, karar izi tutulur.
        """
        audit_logger.info(
            "session=%s scope=%s status=%s confidence=%s product=%s tpi=%s "
            "sources=%s missing=%s ms=%.1f",
            ctx.session_id, verdict.scope, plan.status, plan.confidence,
            plan.product_family, plan.tpi, ",".join(plan.source_ids),
            ",".join(plan.missing_inputs), elapsed_ms,
        )
