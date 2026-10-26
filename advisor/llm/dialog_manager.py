"""
═══════════════════════════════════════════════════════════════════════════
🎛️ DIALOG_MANAGER.PY - MOTOR YÖNETİR, LLM SADECE KONUŞUR
═══════════════════════════════════════════════════════════════════════════

TASARIM İLKESİ:
Konuşmanın yönünü LLM değil kural motoru belirler. Her turda:

    1. Motor sıradaki soruyu söyler          → engine.get_next_question()
    2. LLM kullanıcının cevabını eşler       → AnswerMapper (doğrulamalı)
    3. Motor state'i günceller ve kuralları çalıştırır
    4. Python cevabı KURAR, LLM sadece doğal giriş cümlesini yazar

NEDEN BÖYLE:
Önceki tasarımda LLM hem soruyu seçiyor hem öneriyi üretiyordu; motor
SKU üretmemişken bile "SKU: BM42-2710" gibi var olmayan kodlar uyduruyordu.
Burada teknik içeriğin TAMAMI (soru metni, şıklar, TPI, SKU, ölçüler)
Python tarafında motorun state'inden kurulur. LLM'in yazdığı metin
_strip_fabrications() denetiminden geçer; motor bir öneri üretmemişken
teknik özellik uyduran cümle kullanıcıya ULAŞMAZ.
"""
import logging
import re
from typing import Any, Dict, List, Optional

from llm import knowledge, tpi_refine
from llm.front_desk import norm
from llm.answer_mapper import AnswerMapper

logger = logging.getLogger(__name__)


# Motor öneri üretmemişken LLM metninde bulunmaması gereken kalıplar
_FABRICATION_PATTERNS = [
    re.compile(r"\bSKU\b", re.IGNORECASE),
    re.compile(r"\b\d{1,2}\s*/\s*\d{1,2}\b"),          # TPI: 6/10, 4/6
    re.compile(r"\bTPI\b", re.IGNORECASE),
    re.compile(r"\bM\s?42\b", re.IGNORECASE),
    re.compile(r"\bM\s?51\b", re.IGNORECASE),
    re.compile(r"\b\d+(?:[.,]\d+)?\s*mm\b", re.IGNORECASE),
]

_LEAD_IN_SYSTEM = (
    "Sen TestereStore'un şerit testere uzmanısın. Samimi ve kısa konuşursun; "
    "kullanıcıya her zaman 'siz' diye hitap edersin.\n\n"
    "GÖREVİN: Kullanıcıya sorulacak soruya SADECE tek cümlelik doğal bir giriş "
    "yaz. Sorunun kendisini YAZMA — o ayrıca eklenecek.\n\n"
    "YASAK:\n"
    "- Bıçak tipi, TPI, SKU, genişlik, kalınlık gibi TEKNİK DEĞER yazma.\n"
    "- Öneride bulunma, tahmin yürütme.\n"
    "- Soru sorma.\n\n"
    "Sadece bir cümle. Türkçe."
)

_RATIONALE_SYSTEM = (
    "Sen TestereStore'un şerit testere uzmanısın. Kullanıcıya 'siz' diye hitap edersin.\n\n"
    "GÖREVİN: Aşağıda SANA VERİLEN teknik verilere dayanarak, önerinin neden "
    "uygun olduğunu 1-2 cümleyle açıkla.\n\n"
    "KURALLAR:\n"
    "- SADECE sana verilen değerleri kullan. Yeni sayı/kod UYDURMA.\n"
    "- Kısa tut. Türkçe yaz. Başlık veya liste kullanma.\n"
)

_OFFTOPIC_SYSTEM = (
    "Sen TestereStore'un şerit testere uzmanısın. Kullanıcının sorusunu kısa ve "
    "net cevapla; kullanıcıya 'siz' diye hitap et.\n\n"
    "KURALLAR:\n"
    "- ASLA reddetme, özür dileme. Kullanıcı ürün önerisi istiyorsa memnuniyetle "
    "yardımcı olacağını söyle; gerekli soruyu sistem ayrıca soracak.\n"
    "- Teknik DEĞER (SKU, TPI, bıçak modeli, ölçü) yazma — bunları seçim motoru "
    "üretir, sen değil.\n"
    "- Emin olmadığın bilgiyi uydurma. Teslim süresi, stok, fiyat veya kargo "
    "ücreti hakkında sayı verme.\n"
    "- Soru şerit testereyle ilgisizse, kibarca yalnızca şerit testere konularında "
    "yardımcı olabildiğini söyle.\n"
    "- En fazla 2 cümle. Türkçe."
)


_POST_REC_SYSTEM = (
    "Sen TestereStore'un şerit testere uzmanısın; kullanıcıya 'siz' diye hitap "
    "edersin. Kullanıcıya zaten bir öneri "
    "sunuldu ve o önerinin değerleri aşağıda veriliyor.\n\n"
    "KURALLAR:\n"
    "- Teknik değerleri SADECE sana verilen listeden al; yeni kod/sayı UYDURMA.\n"
    "- Kullanıcı farklı bir ürün isterse, seçimi baştan yapmak gerektiğini söyle.\n"
    "- En fazla 4 cümle. Türkçe."
)


class DialogManager:
    """Kural motoru güdümlü konuşma yöneticisi."""

    def __init__(self, openai_client, api_key: str, model: Optional[str] = None,
                 machine_db: Any = None, store: Any = None):
        """
        Args:
            openai_client: Metin üretimi için OpenAIClient (retry'lı)
            api_key: OpenAI API anahtarı (AnswerMapper için)
            model: Kullanılacak model
            machine_db: Paylaşılan makine veritabanı örneği
            store: StoreClient — satılan diş adımları için (yoksa anlık görüntü)
        """
        self.openai_client = openai_client
        self.mapper = AnswerMapper(api_key=api_key, model=model, machine_db=machine_db)
        self.store = store

    # ==================================================================
    # ANA TUR DÖNGÜSÜ
    # ==================================================================

    def handle(self, session, message: str) -> Dict[str, Any]:
        """
        Bir kullanıcı mesajını işle ve cevabı üret.

        Args:
            session: ConversationalSession
            message: Kullanıcının mesajı

        Returns:
            Cevap + state + öneri + sıradaki soru içeren sözlük
        """
        engine = session.rules_engine
        pending = engine.get_next_question()

        # --- 1) Cevabı doğrulanmış alanlara çevir ---
        mapping = self.mapper.map_answer(
            message=message,
            questions=engine.config.questions,
            state=engine.get_state(),
            pending_question=pending,
        )

        # --- 2) Sadece doğrulamayı geçen değerleri state'e yaz ---
        for fieldname, value in mapping.values.items():
            engine.update_state(fieldname, value)

        # Malzeme kalitesi (St37, C45, 1.4301, 6082 …) tablodan → metal grubu.
        # Tablo LLM tahmininden önce gelir; müşteriye bir kez söylenir.
        grade_note = self._apply_grade(session, message, mapping)

        # Metal ailesi geldiyse kategori otomatik METAL olur
        if mapping.values.get("metal_family") and not engine.get_state().get("material_category"):
            engine.update_state("material_category", "METAL")

        self._remember_solid_diameter(session, message, mapping, pending)

        if mapping.values:
            engine.execute_rules()

        # Dolu kesitte gerçek çap (Starrett) + bu bıçakta satılan dişler.
        # Kurallar her çalıştığında TPI'yi kova değerine döndürür; bu yüzden
        # her turda uygulanır (idempotent).
        try:
            tpi_refine.refine(engine, session, self._price_tree())
        except Exception as exc:  # inceltme başarısızsa motorun değeri kalır
            logger.warning(f"TPI inceltme atlandı: {exc}")

        # --- 3) Motorun yeni durumunu oku ---
        state = engine.get_state()
        next_question = engine.get_next_question()
        recommendation = engine.get_recommendation()
        is_complete = engine.is_complete()

        # --- 4) Cevabı kur ---
        # Öneri hazır olsa bile yönlendiricinin bekleyen sorusu varsa önce onu
        # sor: soğutma gibi alanlar öneriyi ve uyarıları değiştirebilir.
        if is_complete and next_question is None:
            # Kart yalnızca öneri ilk kez hazır olduğunda ya da veriler
            # değiştiği için güncellendiğinde basılır. Sonraki mesajlar
            # ("teşekkürler", "bu neden 4/6?") normal sohbet olarak yanıtlanır.
            already_shown = getattr(session, "recommendation_shown", False)
            if mapping.values or not already_shown:
                reply = self._render_recommendation(recommendation, state)
                session.recommendation_shown = True
            else:
                reply = self._answer_after_recommendation(session, message, recommendation)
        else:
            reply = self._render_question(
                message=message,
                mapping=mapping,
                next_question=next_question,
                session=session,
            )

        if grade_note:
            reply = grade_note + "\n\n" + reply

        session.add_message("user", message)
        session.add_message("assistant", reply)

        return {
            "session_id": session.session_id,
            "message": reply,
            "state": state,
            "recommendation": recommendation if is_complete else None,
            "next_question": self._question_payload(next_question),
            "is_complete": is_complete,
            "extracted_fields": mapping.values,
            "rejected_fields": mapping.rejected,
            "machine_found": mapping.machine_found,
        }

    # ==================================================================
    # DOLU KESİT ÇAPI / SATILAN DİŞLER
    # ==================================================================

    @staticmethod
    def _remember_solid_diameter(session, message: str, mapping, pending) -> None:
        """
        Müşterinin yazdığı dolu kesit çapını (mm) oturumda tut. Önce eşleştiricinin
        ölçtüğü değer, yoksa metinden ("40 mm mil", "Ø40", çap sorusuna "40").
        Kova da sayıdan hesaplanır; LLM'in kova tahmini sayıyı ezemez.
        """
        field = "solid_max_diameter_bucket"
        expecting = getattr(pending, "writes_to", None) == field
        mm = mapping.measured_mm.get(field) if getattr(mapping, "measured_mm", None) else None
        if mm is None:
            mm = tpi_refine.parse_solid_diameter(message, expecting=expecting)
        if mm is None:
            return
        session.solid_diameter_mm = float(mm)
        engine = session.rules_engine
        state = engine.get_state()
        solid = "SOLID" in (state.get("part_type"), state.get("metal_part_type"),
                            mapping.values.get("metal_part_type"), mapping.values.get("part_type"))
        if expecting or solid:
            bucket = tpi_refine.bucket_for(float(mm))
            if mapping.values.get(field) != bucket:
                mapping.values[field] = bucket
                engine.update_state(field, bucket)

    @staticmethod
    def _apply_grade(session, message: str, mapping) -> Optional[str]:
        grade = knowledge.detect_grade(norm(message))
        if not grade:
            return None
        family = grade.get("family")
        engine = session.rules_engine
        if family:
            if mapping.values.get("metal_family") not in (None, family):
                logger.info(f"kalite tablosu LLM'i düzeltti: {mapping.values.get('metal_family')} -> {family}")
            mapping.values["metal_family"] = family
            engine.update_state("metal_family", family)
        if getattr(session, "grade_shown", None) == grade["id"]:
            return None
        session.grade_shown = grade["id"]
        return knowledge.grade_line(grade)

    def _price_tree(self) -> Optional[Dict[str, Any]]:
        store = self.store
        if store is None or not getattr(store, "enabled", False):
            return None
        try:
            return store.price_options()
        except Exception as exc:
            logger.warning(f"fiyat listesi alınamadı: {exc}")
            return None

    # ==================================================================
    # CEVAP KURMA
    # ==================================================================

    def _render_question(self, message: str, mapping, next_question, session) -> str:
        """Sıradaki soruyu doğal bir girişle birlikte sun."""
        parts: List[str] = []

        # Konu dışı soru sorulduysa önce ona cevap ver
        if mapping.intent == "OFF_TOPIC" and not mapping.has_values:
            answer = self._llm(
                _OFFTOPIC_SYSTEM,
                message,
                history=session.conversation_history[-6:],
            )
            if answer:
                parts.append(self._strip_fabrications(answer, allow=False))

        # Model adı birden çok makineye uyuyorsa TAHMİN ETME, sor.
        # Aynı model adını 102 grup paylaşıyor ve 61'inde bıçak ölçüleri
        # farklı; yanlış olanı seçersek müşteri makinesine takılmayan bıçak
        # sipariş eder. Ölçüleri de yazıyoruz, kullanıcı kendi makinesini
        # model adından değil ölçüsünden tanıyor olabilir.
        if mapping.machine_candidates and not mapping.machine_found:
            secenekler = "\n".join(
                f"- **{c.get('display_name') or c.get('model')}** — "
                f"{c.get('blade_length_mm')} × {c.get('blade_width_mm')} × "
                f"{c.get('blade_thickness_mm')} mm"
                for c in mapping.machine_candidates[:5]
            )
            kalan = len(mapping.machine_candidates) - 5
            if kalan > 0:
                secenekler += f"\n- …ve {kalan} model daha"
            parts.append(
                f"\"{mapping.machine_query}\" birden fazla makineye uyuyor ve "
                "bıçak ölçüleri farklı. Hangisi sizinki?\n\n"
                f"{secenekler}\n\n"
                "Tam modeli yazabilir ya da makinenizdeki bıçağın uzunluğunu "
                "(mm) söyleyebilirsiniz."
            )
            return "\n\n".join(p for p in parts if p)

        # Makine yazıldı ama veritabanında bulunamadıysa bunu açıkça söyle
        if mapping.machine_query and not mapping.machine_found:
            # Üretici tanındıysa soruyu daraltarak sor — kullanıcıya
            # "hiç bulamadım" demek, aslında 200 modelini bildiğimiz bir
            # markayı yazmışken gereksiz yere umut kırıcı.
            if mapping.machine_manufacturer:
                parts.append(
                    f"**{mapping.machine_manufacturer}** markasını tanıdım ama "
                    f"\"{mapping.machine_query}\" içinden modeli çıkaramadım. "
                    "Model kodunu tam yazar mısınız? "
                    "Bilmiyorsanız bıçak uzunluğunu mm cinsinden de yazabilirsiniz."
                )
            else:
                parts.append(
                    f"\"{mapping.machine_query}\" makinesini veritabanımda bulamadım. "
                    "Marka ve modeli tam yazar mısınız? (Örn: AMADA HA-250) "
                    "Bilmiyorsanız bıçak uzunluğunu mm cinsinden de yazabilirsiniz."
                )
            return "\n\n".join(p for p in parts if p)

        # Makine bulunduysa hangi ölçülerin geldiğini göster (motordan gelen gerçek veri)
        if mapping.machine_found:
            m = mapping.machine_found
            parts.append(
                f"✅ **{m.get('manufacturer')} {m.get('model')}** bulundu — "
                f"bıçak ölçüleri: {m.get('blade_length_mm')} × "
                f"{m.get('blade_width_mm')} × {m.get('blade_thickness_mm')} mm"
            )

        if next_question is None:
            # Sorulacak soru kalmadı ama motor öneri üretemedi — hangi verinin
            # eksik olduğunu açıkça söyle, kullanıcıyı sessizce bekletme.
            parts.append(
                "Elimdeki bilgilerle kesin bir ürün kodu üretemedim. "
                "Makinenizin bıçak uzunluğunu (mm) yazarsanız öneriyi "
                "tamamlayabilirim."
            )
            return "\n\n".join(p for p in parts if p)

        # Doğal giriş cümlesi (LLM) — teknik içerik yazması yasak
        if not parts:
            lead = self._llm(
                _LEAD_IN_SYSTEM,
                f"Sorulacak soru: {next_question.text}\nKullanıcının son mesajı: {message}",
                history=session.conversation_history[-4:],
            )
            if lead:
                parts.append(self._strip_fabrications(lead, allow=False))

        # LLM giriş cümlesinde soruyu tekrarladıysa temizle (soru ayrıca eklenecek)
        parts = [self._drop_duplicate_question(p, next_question) for p in parts]

        # Sorunun kendisi ve şıklar — TAMAMEN deterministik
        parts.append(self._format_question(next_question))
        return "\n\n".join(p for p in parts if p)

    @staticmethod
    def _drop_duplicate_question(text: str, question) -> str:
        """
        LLM metninden sorunun kendisini çıkar.

        Soru metni Python tarafından ayrıca ekleniyor; giriş cümlesi de aynı
        soruyu içerirse kullanıcı soruyu iki kez görüyor.
        """
        if not text or not question:
            return text

        needle = question.text.strip().rstrip("?").lower()
        if len(needle) < 12:          # çok kısa metinlerde yanlış eşleşme riski
            return text

        kept = []
        for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
            cleaned = sentence.replace("*", "").strip().rstrip("?").lower()
            if needle in cleaned or cleaned in needle:
                continue
            kept.append(sentence)
        return " ".join(kept).strip()

    def _answer_after_recommendation(self, session, message: str,
                                     rec: Dict[str, Any]) -> str:
        """
        Öneri sunulduktan sonraki serbest sorulara cevap ver.

        Bu noktada motor gerçek bir öneri üretmiş durumda; teknik değerlerden
        bahsetmek meşru, çünkü değerler prompt'a motordan veriliyor.
        """
        facts = (
            "Kullanıcıya sunulmuş olan öneri (SADECE bunlara dayan):\n"
            f"- Bıçak tipi: {rec.get('blade_type')}\n"
            f"- TPI: {rec.get('tooth_pitch')}\n"
            f"- Ölçü: {rec.get('blade_length_mm')} x {rec.get('blade_width_mm')} x "
            f"{rec.get('blade_thickness_mm')} mm\n"
            f"- SKU: {rec.get('sku')}\n"
            f"- Malzeme: {rec.get('material_family')} / {rec.get('part_type')}\n\n"
            f"Kullanıcının sorusu: {message}"
        )
        answer = self._llm(_POST_REC_SYSTEM, facts,
                           history=session.conversation_history[-6:])
        return answer or "Başka bir konuda yardımcı olabilir miyim?"

    def _format_question(self, question) -> str:
        """Soru metnini ve şıklarını rules.json'dan birebir kur."""
        lines = [f"**{question.text}**"]
        if question.options:
            for opt in question.options:
                lines.append(f"• {opt.label}")
        return "\n".join(lines)

    def _render_recommendation(self, rec: Dict[str, Any], state: Dict[str, Any]) -> str:
        """Öneri kartını motorun state'inden kur; gerekçeyi LLM yazar."""
        lines = [
            "✅ **Öneriniz hazır**",
            "",
            f"**Bıçak tipi:** {self._label(rec.get('blade_type'))}",
            f"**Diş aralığı (TPI):** {rec.get('tooth_pitch')}",
            f"**Ölçü:** {rec.get('blade_length_mm')} × {rec.get('blade_width_mm')} × "
            f"{rec.get('blade_thickness_mm')} mm",
            f"**Ürün kodu (SKU):** `{rec.get('sku')}`",
        ]

        if rec.get("coolant_note"):
            lines += ["", f"💧 {rec['coolant_note']}"]

        # Gerekçe — LLM'e SADECE motorun ürettiği veriler verilir
        facts = (
            f"Malzeme: {rec.get('material_family')}, "
            f"Parça tipi: {rec.get('part_type')}, "
            f"Bıçak tipi: {self._label(rec.get('blade_type'))}, "
            f"TPI: {rec.get('tooth_pitch')}, "
            f"Ölçü: {rec.get('blade_length_mm')}x{rec.get('blade_width_mm')}x"
            f"{rec.get('blade_thickness_mm')} mm"
        )
        rationale = self._llm(_RATIONALE_SYSTEM, facts)
        if rationale:
            lines += ["", f"💡 {rationale.strip()}"]

        for warning in rec.get("warnings") or []:
            lines += ["", f"⚠️ {warning}"]

        if rec.get("disclaimer"):
            lines += ["", f"_{rec['disclaimer']}_"]

        return "\n".join(lines)

    @staticmethod
    def _label(value: Optional[str]) -> str:
        """BI_METAL_M42_FLEXBACK -> Bi Metal M42 Flexback"""
        if not value:
            return "-"
        return value.replace("_", " ").title()

    @staticmethod
    def _question_payload(question) -> Optional[Dict[str, Any]]:
        """Soruyu arayüzün kullanabileceği sözlüğe çevir."""
        if question is None:
            return None
        return {
            "id": question.id,
            "text": question.text,
            "type": question.type,
            "writes_to": question.writes_to,
            "options": [
                {"value": o.value, "label": o.label} for o in (question.options or [])
            ],
        }

    # ==================================================================
    # LLM YARDIMCILARI
    # ==================================================================

    def _llm(self, system: str, user: str, history: Optional[List[Dict]] = None) -> str:
        """Kısa bir metin üret; hata olursa boş dön (akış durmaz)."""
        messages = [{"role": "system", "content": system}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user})
        try:
            response = self.openai_client.chat(messages=messages)
            return (response or {}).get("content", "") or ""
        except Exception as exc:
            logger.error(f"LLM text generation failed: {exc}")
            return ""

    @staticmethod
    def _strip_fabrications(text: str, allow: bool) -> str:
        """
        Motor öneri üretmemişken teknik değer içeren cümleleri at.

        `allow=True` ise (öneri hazır) metne dokunulmaz.
        """
        if allow or not text:
            return text

        kept = []
        for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
            if any(p.search(sentence) for p in _FABRICATION_PATTERNS):
                logger.warning(f"Uydurma teknik icerik atildi: {sentence[:80]}")
                continue
            kept.append(sentence)
        return " ".join(kept).strip()
