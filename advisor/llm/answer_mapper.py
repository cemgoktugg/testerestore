"""
═══════════════════════════════════════════════════════════════════════════
🎯 ANSWER_MAPPER.PY - KULLANICI CEVABINI DOĞRULANMIŞ ALAN DEĞERİNE ÇEVİRİR
═══════════════════════════════════════════════════════════════════════════

AMAÇ:
Serbest metin cevabı ("karbon çelik profil kesiyorum, 15mm") kural motorunun
anladığı alan/değer çiftlerine çevirir:
    metal_family=CARBON_STEEL
    metal_part_type=PROFILE
    profile_wall_thickness_bucket=T6

TASARIM KARARI — NEDEN ŞEMA rules.json'DAN ÜRETİLİYOR:
Geçerli değerler (enum'lar) burada SABİT KODLANMAZ; her çağrıda rules.json
içindeki soruların options listesinden okunur. Böylece rules.json'a yeni bir
seçenek eklendiğinde eşleştirici kendiliğinden öğrenir ve "parser SMALL
üretiyor ama kural motoru M1 bekliyor" tipi sessiz uyumsuzluklar yapısal
olarak imkânsız hale gelir.

GARANTİ:
LLM ne döndürürse döndürsün, state'e yazılmadan önce her değer ilgili sorunun
options listesine karşı doğrulanır. Doğrulamayı geçemeyen değer YAZILMAZ,
`rejected` içinde raporlanır.
"""
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from openai import OpenAI

from llm.openai_client import get_default_model

logger = logging.getLogger(__name__)

# Kullanıcı "bilmiyorum" dediğinde seçilen ortak değer
UNKNOWN = "UNKNOWN"

# Makine modeli eşleşmesi için kabul eşiği
MACHINE_MATCH_THRESHOLD = 0.75

# Ölçü sorularında LLM'in ham mm değerini yazacağı yardımcı alanın son eki.
# Kovayı (T4, D2 ...) LLM değil Python seçer — bkz. bucket_from_mm().
MM_SUFFIX = "__value_mm"

# "≤ 2 mm", "5 – 8 mm", "> 250 mm", "100 - 150 mm" gibi etiketleri çözer
_RANGE_PATTERN = re.compile(
    r"^\s*(?:(?P<op>[<>≤≥]=?)\s*(?P<single>\d+(?:[.,]\d+)?)"
    r"|(?P<low>\d+(?:[.,]\d+)?)\s*[-–—]\s*(?P<high>\d+(?:[.,]\d+)?))\s*mm",
    re.IGNORECASE,
)


def _parse_range(label: str):
    """
    Etiketten (alt_sinir, ust_sinir) çıkar. Sınırsız uç None döner.

    '≤ 2 mm'      -> (None, 2.0)
    '5 – 8 mm'    -> (5.0, 8.0)
    '> 250 mm'    -> (250.0, None)
    """
    match = _RANGE_PATTERN.match(label)
    if not match:
        return None

    def num(text):
        return float(text.replace(",", "."))

    if match.group("single") is not None:
        value = num(match.group("single"))
        op = match.group("op")
        if op in ("<", "≤", "<=", "≤="):
            return (None, value)
        return (value, None)          # >, ≥
    return (num(match.group("low")), num(match.group("high")))


def bucket_from_mm(value_mm: float, options) -> Optional[str]:
    """
    Ölçüyü (mm) rules.json'daki etiket aralıklarına göre kovaya yerleştir.

    Bu işi LLM'e bırakmak hataya açık: "6 mm" duyan model, kovanın ADI T6
    olduğu için T6'yı (aslında '> 12 mm') seçebiliyor. Aralık karşılaştırması
    burada aritmetik olarak yapılır.

    Aralıklar üst sınır dahil kabul edilir (5–8 mm için 8 -> bu kova).
    """
    fallback = None
    for opt in options:
        bounds = _parse_range(opt.label)
        if bounds is None:
            continue
        low, high = bounds
        if low is None:
            if value_mm <= high:
                return opt.value
        elif high is None:
            if value_mm > low:
                return opt.value
            fallback = fallback or opt.value
        elif low < value_mm <= high:
            return opt.value
    return None


@dataclass
class MappingResult:
    """Bir kullanıcı mesajının kural motoru alanlarına çevrilmiş hali."""

    intent: str = "ANSWER"                                  # ANSWER | OFF_TOPIC
    values: Dict[str, Any] = field(default_factory=dict)    # doğrulanmış, yazılabilir
    rejected: Dict[str, Any] = field(default_factory=dict)  # LLM üretti ama geçersiz
    machine_query: Optional[str] = None                     # kullanıcının yazdığı ham makine metni
    machine_found: Optional[Dict] = None                    # veritabanında bulunan kayıt
    # Model adı birden çok makineye uyduğunda (ör. "H-1300" beş üreticide
    # var ve bıçak boyları 11380–12300 mm arasında değişiyor) tek bir kayıt
    # seçmek yanlış bıçak siparişi demektir. Adaylar burada taşınır ki
    # DialogManager kullanıcıya hangisi olduğunu sorabilsin.
    machine_candidates: List[Dict] = field(default_factory=list)
    machine_manufacturer: Optional[str] = None              # cümlede tanınan üretici
    # Marka bir tahminse ("Bimak" -> Beka-Mak) kullanıcıya gösterilecek açıklama
    machine_brand_note: Optional[str] = None
    # Eşleşme türü: full | model | partial | capacity_class | fuzzy
    machine_match_type: Optional[str] = None
    off_topic_text: Optional[str] = None                    # ürün dışı soru metni

    @property
    def has_values(self) -> bool:
        return bool(self.values)


class AnswerMapper:
    """Serbest metni doğrulanmış alan değerlerine çeviren eşleştirici."""

    def __init__(
        self,
        api_key: str,
        model: Optional[str] = None,
        machine_db: Any = None,
    ):
        """
        Args:
            api_key: OpenAI API anahtarı
            model: Kullanılacak model (verilmezse LLM_MODEL, yoksa gpt-4o)
            machine_db: AdvancedMachineDatabase örneği (paylaşılan; tekrar yüklenmez)
        """
        self.client = OpenAI(api_key=api_key)
        self.model = model or get_default_model()
        self.machine_db = machine_db
        # Tur başına maliyet ölçümü için (llm/telemetry.py)
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    # ------------------------------------------------------------------
    # ŞEMA ÜRETİMİ
    # ------------------------------------------------------------------

    def _build_schema(self, questions: List[Any], state: Dict[str, Any]) -> Dict:
        """
        Cevaplanmamış sorulardan JSON şeması üret.

        Her soru bir property olur; seçenekli sorularda enum doğrudan
        rules.json'daki options listesinden gelir.
        """
        properties: Dict[str, Dict] = {}

        for q in questions:
            fieldname = q.writes_to
            # Zaten dolu alanları tekrar sorma
            if state.get(fieldname) not in (None, "", []):
                continue

            if q.type in ("single_select", "multi_select") and q.options:
                labels = ", ".join(f"{o.value}={o.label}" for o in q.options)
                properties[fieldname] = {
                    "type": "string",
                    "enum": [o.value for o in q.options],
                    "description": f"{q.text} Seçenekler: {labels}",
                }

                # Ölçü sorusuysa asıl istediğimiz ham sayı: kovayı Python seçer.
                # ("6 mm" -> T4; LLM'e bırakılınca kovanın adına bakıp T6 diyebiliyor)
                if any(_parse_range(o.label) for o in q.options):
                    properties[fieldname + MM_SUFFIX] = {
                        "type": "number",
                        "description": (
                            f"{q.text} Kullanıcı bir ÖLÇÜ söylediyse onu mm "
                            "cinsinden SAYI olarak yaz (örn '6 mm' -> 6). "
                            "Kova kodunu buraya yazma."
                        ),
                    }
            elif q.type == "number":
                properties[fieldname] = {
                    "type": "number",
                    "description": q.text,
                }
            else:  # text
                properties[fieldname] = {
                    "type": "string",
                    "description": (
                        q.text
                        + " Sadece marka ve model adını yaz, cümlenin tamamını değil."
                        + " Örnek giriş: 'AMADA HA-250 kullaniyorum' -> 'AMADA HA-250'."
                        + " Kullanıcı bilmediğini söylüyorsa UNKNOWN yaz."
                    ),
                }

        properties["intent"] = {
            "type": "string",
            "enum": ["ANSWER", "OFF_TOPIC"],
            "description": (
                "Kullanıcı sorulan soruya ya da ürün seçimine dair bilgi veriyorsa "
                "ANSWER. Konu dışı bir şey soruyorsa veya genel sohbet ediyorsa "
                "OFF_TOPIC."
            ),
        }

        return {
            "type": "object",
            "properties": properties,
            "required": ["intent"],
        }

    # ------------------------------------------------------------------
    # ANA GİRİŞ
    # ------------------------------------------------------------------

    def map_answer(
        self,
        message: str,
        questions: List[Any],
        state: Dict[str, Any],
        pending_question: Any = None,
    ) -> MappingResult:
        """
        Kullanıcı mesajını doğrulanmış alan değerlerine çevir.

        Args:
            message: Kullanıcının ham mesajı
            questions: rules.json'daki tüm Question nesneleri
            state: Kural motorunun mevcut state sözlüğü
            pending_question: Şu an sorulmuş olan soru (varsa)

        Returns:
            MappingResult — yalnızca doğrulamayı geçen değerler `values` içinde
        """
        schema = self._build_schema(questions, state)

        # Sorulacak alan kalmadıysa LLM'e gitmeye gerek yok
        if len(schema["properties"]) <= 1:
            return MappingResult(intent="OFF_TOPIC", off_topic_text=message)

        asked = ""
        if pending_question is not None:
            asked = (
                "\n\nKullanıcıya AZ ÖNCE şu soru soruldu: "
                f'"{pending_question.text}"\n'
                "Mesaj büyük ihtimalle bu sorunun cevabıdır — ama değilse zorlama, "
                "o alanı boş bırak."
            )

        system = (
            "Sen bir şerit testere bıçağı seçim asistanının veri çıkarım katmanısın.\n"
            "Kullanıcının mesajından SADECE açıkça söylenen bilgileri çıkar.\n\n"
            "KURALLAR:\n"
            "- Tahmin etme, varsayma, çıkarım yapma. Söylenmeyen alanı BOŞ BIRAK.\n"
            "- Ölçüleri doğru kovaya yerleştir (açıklamalardaki aralıklara bak).\n"
            "- Kullanıcı 'bilmiyorum / emin değilim' diyorsa UNKNOWN kullan.\n"
            "- Makine modeli için cümleden sadece marka+model kısmını ayıkla."
            + asked
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
                tools=[{
                    "type": "function",
                    "function": {
                        "name": "extract_answer",
                        "description": (
                            "Kullanıcı mesajından bıçak seçim bilgilerini çıkar"
                        ),
                        "parameters": schema,
                    },
                }],
                tool_choice={
                    "type": "function",
                    "function": {"name": "extract_answer"},
                },
                temperature=0,
            )
        except Exception as exc:
            logger.error(f"Answer mapping failed: {exc}")
            return MappingResult(intent="OFF_TOPIC", off_topic_text=message)

        usage = getattr(response, "usage", None)
        if usage is not None:
            self.total_prompt_tokens += int(getattr(usage, "prompt_tokens", 0) or 0)
            self.total_completion_tokens += int(getattr(usage, "completion_tokens", 0) or 0)

        calls = response.choices[0].message.tool_calls
        if not calls:
            return MappingResult(intent="OFF_TOPIC", off_topic_text=message)

        try:
            raw = json.loads(calls[0].function.arguments)
        except json.JSONDecodeError:
            logger.error("Answer mapper returned invalid JSON")
            return MappingResult(intent="OFF_TOPIC", off_topic_text=message)

        return self._validate(raw, questions, message)

    # ------------------------------------------------------------------
    # DOĞRULAMA — state'e yazmadan önceki tek kapı
    # ------------------------------------------------------------------

    def _validate(
        self,
        raw: Dict[str, Any],
        questions: List[Any],
        message: str,
    ) -> MappingResult:
        """LLM çıktısını rules.json'daki tanımlara karşı doğrula."""
        result = MappingResult(intent=raw.pop("intent", "ANSWER"))
        by_field = {q.writes_to: q for q in questions}

        # --- ölçü alanlarını önce işle: kovayı aritmetikle biz seçeriz ---
        measured: Dict[str, Any] = {}
        for key in [k for k in raw if k.endswith(MM_SUFFIX)]:
            value = raw.pop(key)
            target = key[: -len(MM_SUFFIX)]
            question = by_field.get(target)
            if question is None or value in (None, ""):
                continue
            try:
                mm = float(value)
            except (TypeError, ValueError):
                continue
            bucket = bucket_from_mm(mm, question.options or [])
            if bucket:
                measured[target] = bucket
            else:
                result.rejected[target] = value

        for fieldname, value in raw.items():
            # Ölçüden hesaplanan kova, LLM'in seçtiği kovayı geçersiz kılar
            if fieldname in measured:
                continue
            if value in (None, ""):
                continue

            question = by_field.get(fieldname)
            if question is None:
                result.rejected[fieldname] = value
                continue

            # --- makine modeli: veritabanına karşı doğrula ---
            if fieldname == "machine_model":
                # Kullanıcı bilmiyorsa akışı kilitleme: alanı UNKNOWN yazıp
                # yönlendiriciye bırak (bıçak uzunluğunu ayrıca soracaktır).
                if str(value).strip().upper() == UNKNOWN:
                    result.values[fieldname] = UNKNOWN
                    continue
                result.machine_query = str(value).strip()
                detail = self._resolve_machine(result.machine_query)
                result.machine_manufacturer = detail.get("manufacturer")
                result.machine_brand_note = detail.get("brand_note")
                result.machine_match_type = detail.get("match_type")
                found = detail.get("machine")
                if found:
                    result.machine_found = found
                    result.values[fieldname] = result.machine_query
                else:
                    # Adaylar yalnızca eşleşme YOKKEN taşınır; eşleşme varken
                    # de dolu bırakmak DialogManager'ı boşuna soru sormaya iter.
                    result.machine_candidates = detail.get("candidates") or []
                    result.rejected[fieldname] = value
                continue

            # --- seçenekli sorular: enum kontrolü ---
            if question.options:
                allowed = {o.value for o in question.options}
                if value in allowed:
                    # UNKNOWN da geçerli bir cevaptır (rules.json'da tanımlı) ve
                    # state'e YAZILIR; yazılmazsa yönlendirici aynı soruyu sonsuza
                    # kadar tekrar sorar.
                    result.values[fieldname] = value
                else:
                    result.rejected[fieldname] = value
                continue

            # --- sayısal sorular: tip ve aralık kontrolü ---
            if question.type == "number":
                try:
                    num = float(value)
                except (TypeError, ValueError):
                    result.rejected[fieldname] = value
                    continue
                limits = question.rules or {}
                if "min" in limits and num < limits["min"]:
                    result.rejected[fieldname] = value
                    continue
                if "max" in limits and num > limits["max"]:
                    result.rejected[fieldname] = value
                    continue
                result.values[fieldname] = int(num) if num.is_integer() else num
                continue

            result.values[fieldname] = value

        # Ölçüden hesaplanan kovalar son sözü söyler
        result.values.update(measured)

        if result.intent == "OFF_TOPIC" and not result.values:
            result.off_topic_text = message

        return result

    @staticmethod
    def _empty_machine_result() -> Dict:
        return {"status": "none", "machine": None,
                "candidates": [], "manufacturer": None}

    def _resolve_machine(self, query: str) -> Dict:
        """
        Makine metnini veritabanında ara.

        search_detailed() sonucunu olduğu gibi döndürür:
        {'status', 'machine', 'candidates', 'manufacturer'}. Belirsiz
        sorgularda 'machine' None'dır ama 'candidates' doludur — çağıran
        katman tahmin etmek yerine kullanıcıya sorabilsin diye.
        """
        if not self.machine_db or not query:
            return self._empty_machine_result()
        try:
            detailed = getattr(self.machine_db, "search_detailed", None)
            if detailed is None:
                # Eski/sahte bir veritabanı enjekte edilmişse tek sonuçlu
                # API'ye düş; belirsizlik bilgisi olmaz ama akış kırılmaz.
                found = self.machine_db.search(
                    query, threshold=MACHINE_MATCH_THRESHOLD
                )
                return {"status": "match" if found else "none",
                        "machine": found, "candidates": [],
                        "manufacturer": (found or {}).get("manufacturer")}
            return detailed(query, threshold=MACHINE_MATCH_THRESHOLD)
        except Exception as exc:
            logger.error(f"Machine lookup failed: {exc}")
            return self._empty_machine_result()
