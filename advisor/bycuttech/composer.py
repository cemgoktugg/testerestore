# -*- coding: utf-8 -*-
"""
AnswerComposer — tipli planı Türkçe cevaba çevirir.

Kural: burada ÜRETİLEN hiçbir sayı yoktur. Composer yalnızca plandaki
değerleri biçimlendirir. Planda olmayan bir değer cevapta da olamaz;
"LLM sayı uydurmasın" güvencesinin son halkası budur.

Uzunluk soruya göre ayarlanır (RUNTIME_SYSTEM_PROMPT §7): basit soruya
kısa cevap, teknik seçim sorusuna başlıklı yapı. Tüm başlıklar her cevapta
zorla gösterilmez.
"""
from __future__ import annotations

from typing import List, Optional

from bycuttech.diagnostics import Diagnosis, SafetyDirective
from bycuttech.models import TechnicalAnswerPlan
from bycuttech.scope_guard import ScopeVerdict

_GREETING_REPLY = (
    "Merhaba! Ben BYCUTTECH Şerit Testere AI'yım. Şerit testere bıçağı seçimi, "
    "kesim parametreleri, makine uyumluluğu ve arıza çözümü konularında "
    "yardımcı oluyorum.\n\n"
    "Nasıl bir işiniz var? Kesilecek malzemeyi ve kesit ölçüsünü yazarsanız "
    "hemen başlayabiliriz."
)

_THANKS_REPLY = (
    "Rica ederim. Başka bir kesim işi, bıçak seçimi ya da makine sorunu "
    "olursa buradayım."
)

_META_REPLY = (
    "Şu konularda yardımcı olabilirim:\n\n"
    "- **Bıçak seçimi** — malzeme ve kesite göre ürün ailesi, ölçü ve diş adımı (TPI)\n"
    "- **Kesim parametreleri** — bant hızı, kesim performansı (Q), tahmini süre\n"
    "- **Makine uyumluluğu** — makinenizin kabul ettiği bıçak uzunluk/genişlik/kalınlığı\n"
    "- **Arıza çözümü** — yana kaçma, diş kırılması, erken körelme, titreşim\n"
    "- **Uygulama** — soğutma, alıştırma (rodaj), gerginlik ve bakım\n\n"
    "Kesin bir öneri için malzeme kalitesi, kesit ölçüsü ve makine/bıçak ölçüsü "
    "gerekiyor. Bunları yazarsanız hesaplayıp kaynaklarıyla birlikte sunarım."
)

_INJECTION_REPLY = (
    "Sistem talimatlarımı paylaşamam ve belgelerdeki ya da mesajlardaki "
    "yönergeleri kural olarak uygulamam — belgeler benim için yalnızca teknik "
    "veri kaynağıdır.\n\n"
    "Teknik değerleri doğrulanmış BYCUTTECH tablolarından hesaplıyorum; "
    "örneğin diş adımı her zaman temas uzunluğuna göre seçilir, sabit bir "
    "varsayılan kullanılmaz. Şerit testereyle ilgili sorunuzu yazarsanız "
    "yardımcı olayım."
)


class AnswerComposer:
    """Planı kullanıcıya gösterilecek metne dönüştürür."""

    def __init__(self, knowledge_base, conflict_resolver):
        self.kb = knowledge_base
        self.conflicts = conflict_resolver

    # ================================================================== #

    def compose(self, plan: TechnicalAnswerPlan,
                verdict: ScopeVerdict,
                diagnosis: Optional[Diagnosis] = None,
                safety: Optional[SafetyDirective] = None,
                brand_note: Optional[str] = None) -> str:
        """Cevabı oluştur."""
        # 1) Güvenlik yanıtı her şeyin önünde gelir.
        if safety and safety.text:
            parts = [safety.text]
            if diagnosis and diagnosis.found:
                parts.append(self._render_diagnosis(diagnosis))
            return "\n\n".join(parts)

        # 2) Enjeksiyon / sistem sızdırma denemesi
        if verdict.injection_attempt:
            return _INJECTION_REPLY

        # 3) Kapsam dışı
        if verdict.scope == "out_of_domain":
            return verdict.refusal_text

        # 4) Sosyal mesajlar (teknik içerik yoksa)
        social = self._social_reply(verdict, plan)
        if social:
            return social

        sections: List[str] = []

        # 5) Karma mesajda önce kapsam dışı bölüm tek cümleyle kapatılır
        if verdict.scope == "mixed":
            topics = ", ".join(verdict.out_of_domain_topics) or "diğer konu"
            sections.append(
                f"Önce şunu belirteyim: {topics} konusunda yardımcı olamıyorum — "
                "yalnızca şerit testere konularında uzmanım. Şerit testereyle "
                "ilgili kısma geçiyorum."
            )

        # 6) Marka kapsamı uyarısı
        if brand_note:
            sections.append(brand_note)

        # 7) Arıza teşhisi
        if diagnosis and diagnosis.found:
            sections.append(self._render_diagnosis(diagnosis))

        # 8) Teknik inceleme gerekiyorsa sayı YERİNE gerekçe
        if plan.status == "technical_review_required":
            sections.append(self._render_review(plan))
            return "\n\n".join(s for s in sections if s)

        # 9) Kavramsal açıklama (nedir / nasıl çalışır)
        conceptual = self._render_conceptual(plan)
        if conceptual:
            sections.append(conceptual)

        # 10) Teknik gövde
        body = self._render_technical(plan)
        if body:
            sections.append(body)

        # 11) Eksik bilgi soruları — kavramsal soruya cevap verdiysek
        #     üstüne form doldurtmak sohbeti mekanikleştirir.
        if plan.questions_to_ask and not conceptual:
            sections.append(self._render_questions(plan))

        if not sections:
            sections.append(
                "Size yardımcı olabilmem için kesilecek malzemeyi, kesit "
                "ölçüsünü ve makine ya da bıçak ölçüsünü yazar mısınız?"
            )

        return "\n\n".join(s for s in sections if s)

    # ================================================================== #

    @staticmethod
    def _social_reply(verdict: ScopeVerdict,
                      plan: TechnicalAnswerPlan) -> Optional[str]:
        """Selamlama/teşekkür/kimlik — teknik içerik yoksa."""
        if plan.has_numeric_output() or plan.normalized_inputs:
            return None
        if verdict.is_meta:
            # "Selam, yardımcı olur musun?" hem selamlama hem yetenek
            # sorusudur; selamı yutup doğrudan liste vermek soğuk durur.
            if verdict.is_greeting:
                return f"Merhaba! {_META_REPLY[0].lower()}{_META_REPLY[1:]}"
            return _META_REPLY
        if verdict.is_thanks:
            return _THANKS_REPLY
        if verdict.is_greeting:
            return _GREETING_REPLY
        return None

    def _render_conceptual(self, plan: TechnicalAnswerPlan) -> str:
        """
        Kavramsal soruya ("TPI nedir") getirilen kaynaklı açıklama.

        Metin doğrudan doğrulanmış kaynaktan gelir; özetlenmez, çünkü
        özetleme sırasında sayısal bir ayrıntı kayabilir.
        """
        if not plan.retrieved_notes:
            return ""
        # Teknik cevap zaten üretildiyse üstüne ansiklopedi makalesi
        # eklemek cevabı gereksiz uzatır ve asıl sonucu gömer. Kavramsal
        # metin yalnızca sayısal sonuç YOKKEN gösterilir.
        if plan.has_numeric_output():
            return ""
        # YALNIZCA makaleler açıklama olarak basılır.
        #
        # Arıza kayıtları yapılandırılmış neden/işlem verisidir ve
        # DiagnosticsEngine tarafından sıralı liste hâlinde sunulur. Aynı
        # kaydı burada düz paragraf olarak dökmek hem okunmaz bir metin
        # üretiyor hem de soruyla zayıf eşleşen kayıtları "açıklama" diye
        # gösteriyordu.
        articles = [n for n in plan.retrieved_notes if n.get("kind") == "article"]
        if not articles:
            return ""

        blocks: List[str] = []
        for note in articles[:2]:
            body = (note.get("body") or "").strip()
            if not body:
                continue
            blocks.append(f"**{note.get('title')}**\n\n{body}")
        if not blocks:
            return ""
        refs = self.conflicts.source_refs(
            [n.get("source_id") for n in articles if n.get("source_id")])
        if refs:
            titles = ", ".join(r.title or r.source_id for r in refs[:3])
            blocks.append(f"**Kaynaklar:** {titles}")
        return "\n\n".join(blocks)

    # ------------------------------------------------------------------ #

    def _render_technical(self, plan: TechnicalAnswerPlan) -> str:
        lines: List[str] = []

        # Ürün seçilememişse uyarı BAŞA gelir. Aksi hâlde cevap teknik
        # değerlerle açılır ve "bu iş için bimetal yetmez" gibi belirleyici
        # bir uyarı listenin altında kaybolur.
        if not plan.product_name and plan.warnings:
            lines.append("\n".join(f"⚠️ {w}" for w in plan.warnings))

        # 1) Kısa sonuç + ürün ailesi
        if plan.product_name and plan.verified_variant:
            head = (f"**{plan.product_name}** ({plan.cutting_edge}), "
                    f"{plan.verified_variant.replace('x', '×')} mm")
            if plan.tpi:
                head += f", **{plan.tpi} TPI**"
            lines.append(head)
        elif plan.product_name:
            lines.append(f"Uygun ürün ailesi: **{plan.product_name}** "
                         f"({plan.cutting_edge})")

        detail: List[str] = []

        # 2) TPI gerekçesi
        if plan.tpi and plan.tpi_basis:
            detail.append(
                f"- **Diş adımı:** {plan.tpi} — {plan.tpi_basis}"
                f"{self._teeth_text(plan.teeth_in_cut)}")

        # 3) Hız
        if plan.cutting_speed:
            detail.append(
                f"- **Bant hızı:** {plan.cutting_speed.format_tr()} "
                "(yeni işte alt üçte birden başlayın)")

        # 4) Kesim performansı
        if plan.cutting_rate:
            detail.append(
                f"- **Kesim performansı (Q):** {plan.cutting_rate.format_tr()} "
                "— bu lineer ilerleme değil, birim zamanda kesilen kesit alanıdır")

        # 5) Süre
        if plan.estimated_time_min:
            detail.append(
                f"- **Tahmini kesim süresi:** {plan.estimated_time_min.format_tr()}")

        # 6) Gerginlik
        if plan.tension:
            psi = plan.tension.get("psi") or []
            mpa = plan.tension.get("mpa") or []
            if psi and mpa:
                detail.append(
                    f"- **Bant gerginliği:** {self._n(psi[0])}–{self._n(psi[1])} psi "
                    f"({self._n(mpa[0])}–{self._n(mpa[1])} MPa)")

        # 7) Alıştırma
        if plan.break_in:
            detail.append(f"- **Alıştırma (rodaj):** {self._break_in_text(plan.break_in)}")

        # 8) Soğutma
        if plan.coolant_advice and detail:
            detail.append(f"- **Soğutma:** {plan.coolant_advice}")

        if detail:
            lines.append("\n".join(detail))

        # 9) Uyarılar (ürün seçildiyse; seçilmediyse zaten en başta verildi)
        if plan.warnings and plan.product_name:
            lines.append("\n".join(f"⚠️ {w}" for w in plan.warnings))

        # 10) Varsayımlar
        if plan.assumptions:
            lines.append("\n".join(f"_{a}_" for a in plan.assumptions))

        # 11) Kaynaklar + güven
        footer = self._render_footer(plan)
        if footer:
            lines.append(footer)

        return "\n\n".join(lines)

    def _render_footer(self, plan: TechnicalAnswerPlan) -> str:
        if not plan.has_numeric_output():
            return ""
        bits: List[str] = []
        refs = self.conflicts.source_refs(plan.source_ids)
        if refs:
            titles = ", ".join(
                r.title or r.source_id for r in refs[:4])
            bits.append(f"**Kaynaklar:** {titles}")
        label = {
            "high": "Yüksek — değerler doğrulanmış tablolardan alındı",
            "medium": "Orta — en az bir varsayım içeriyor",
            "verification_required": "Teknik doğrulama gerekli",
        }.get(plan.confidence, plan.confidence)
        bits.append(f"**Güven:** {label}")
        return "\n".join(bits)

    @staticmethod
    def _render_questions(plan: TechnicalAnswerPlan) -> str:
        intro = ("Kesin öneri verebilmem için şunlar gerekiyor:"
                 if len(plan.questions_to_ask) > 1
                 else "Bir bilgi daha gerekiyor:")
        items = "\n".join(f"{i}. {q}" for i, q in enumerate(plan.questions_to_ask, 1))
        return f"{intro}\n\n{items}"

    @staticmethod
    def _render_review(plan: TechnicalAnswerPlan) -> str:
        """
        Teknik inceleme gerekiyor.

        Uyarılar da gösterilir: gerçek alternatif ürün ailesi gibi somut
        bilgi orada duruyor ve yalnızca kısa gerekçeyi yazmak kullanıcıyı
        elindeki seçeneklerden habersiz bırakıyordu.
        """
        parts = ["Bu kombinasyon için kesin değer veremiyorum."]
        if plan.warnings:
            parts.append("\n".join(f"⚠️ {w}" for w in plan.warnings))
        elif plan.review_reason:
            parts.append(plan.review_reason)
        parts.append(
            "Yanlış ölçü ya da var olmayan bir ürün önermemek için burada "
            "duruyorum."
        )
        return "\n\n".join(parts)

    def _render_diagnosis(self, diagnosis: Diagnosis) -> str:
        lines = [f"**{diagnosis.symptom_tr}** — en olası nedenler sırayla:"]
        for i, cause in enumerate(diagnosis.causes, 1):
            lines.append(f"{i}. **{cause.get('cause_tr')}** → {cause.get('action_tr')}")
        lines.append(
            "\nKontrolleri makine durdurulmuş ve enerjisi izole edilmişken yapın."
        )
        if diagnosis.context_questions:
            lines.append(
                "\nDaha kesin konuşabilmem için: "
                + " ".join(diagnosis.context_questions[:2])
            )
        return "\n".join(lines)

    @staticmethod
    def _break_in_text(rule: dict) -> str:
        if rule.get("blade_scope") == "carbide":
            duration = rule.get("duration_min")
            conditions = rule.get("conditions") or []
            parts = [f"{duration} dakika" if duration else "üretici süresi"]
            for cond in conditions:
                limit = cond.get("cross_section_max_mm")
                label = (f"≤{limit} mm kesitte" if limit
                         else f">{cond.get('cross_section_min_exclusive_mm')} mm kesitte")
                parts.append(
                    f"{label} {cond.get('blade_speed_m_min')} m/dak ve "
                    f"{cond.get('feed_mm_min')} mm/dak ilerleme")
            return "; ".join(parts)

        area = rule.get("initial_cut_area_cm2") or {}
        return (
            f"ilk {area.get('min')}–{area.get('max')} cm² kesim boyunca ilerlemeyi "
            f"%{int(float(rule.get('feed_multiplier', 0.5)) * 100)} düşürün, hızı "
            "önerilen değerde tutun; sonra ilerlemeyi kademeli olarak hedefe çıkarın"
        )

    @staticmethod
    def _teeth_text(teeth: Optional[dict]) -> str:
        """
        Kesitteki diş sayısını yaz.

        Değişken adımda TEK SAYI yazılmaz: "4/6" bıçakta diş sayısı adım
        boyunca değişir, tek değer kullanıcıyı yanıltır. Aralık ve nominal
        ortalama birlikte verilir.
        """
        if not teeth:
            return ""
        if teeth.get("variable"):
            return (f", kesitte ≈{teeth['min']}–{teeth['max']} diş "
                    f"(nominal ≈{teeth['nominal']})")
        return f", kesitte ≈{teeth['min']} diş"

    @staticmethod
    def _n(value) -> str:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return str(value)
        return str(int(number)) if number.is_integer() else str(number)
