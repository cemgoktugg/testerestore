# -*- coding: utf-8 -*-
"""
ScopeGuard — asistanın uzmanlık alanı dışına çıkmasını engeller.

Görev tanımı kapsam kontrolünün "yalnızca kelime aramasıyla" yapılmasını
yasaklıyor. Burada üç katman var:

  1. Selamlama/teşekkür/kimlik soruları  → alan İÇİ, doğal karşılık
  2. Açık alan dışı işaretler            → alan DIŞI (hava, borsa, kod…)
  3. Şerit testere terimleri             → alan İÇİ

Karma mesajlarda (hem içeride hem dışarıda) yalnızca şerit testereyle
ilgili bölüm cevaplanır; diğer bölüm tek cümleyle kapsam dışında bırakılır.

Türkçe yazım hatalarına tolerans: karşılaştırmalar aksansız ve küçük
harfe indirgenmiş metin üzerinde, kök eşleşmesiyle yapılır ("bicak",
"bıçak", "bicagi" hepsi yakalanır).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from bycuttech.materials import strip_accents

# Kapsam dışı bir soru geldiğinde verilecek cevap. Anlamı
# RUNTIME_SYSTEM_PROMPT §2'de sabitlenmiştir; metin oradan alınmıştır.
SCOPE_REFUSAL = (
    "Ben BYCUTTECH Şerit Testere AI asistanıyım. Yalnızca şerit testereler, "
    "bıçak seçimi, kesim koşulları, makineler ve arıza çözümü konularında "
    "yardımcı olabilirim. Şerit testereyle ilgili sorunuzu yazarsanız "
    "birlikte çözelim."
)

# --- alan içi terim kökleri (aksansız) ---
_IN_DOMAIN_ROOTS = (
    "serit", "testere", "bicak", "bicag", "band", "bant", "blade", "sawblade",
    "tpi", "dis ", "disli", "dis adim", "diş", "kesim", "kesme", "kes",
    "malzeme", "paslanmaz", "aluminyum", "celik", "dokum", "dokme", "profil",
    "boru", "lama", "kosebent", "dolu", "mil", "kesit", "cidar", "et kalinlig",
    "makine", "makina", "amada", "kasto", "behringer", "bomar", "everising",
    "bimetal", "m42", "m51", "karbur", "karbon celik", "flexback",
    "sogutma", "sogutucu", "emulsiyon", "refraktometre",
    "gerginlik", "gerdirme", "alistirma", "run-in", "rodaj",
    "kilavuz", "kasnak", "talas", "firca", "sikma", "mengene",
    "titresim", "asinma", "korelme", "kirilma", "kopma", "sapma", "dalgali",
    "yuzey kalite", "omur", "verim", "ilerleme", "hiz",
    "intenss", "tennax", "primalloy", "advanz", "univerz", "bycuttech",
    "sku", "urun", "siparis", "fiyat", "stok",
    "ahsap", "sunger", "tekstil", "kemik",
)

# --- açık alan dışı işaretler ---
_OUT_OF_DOMAIN_PATTERNS = (
    (r"\bhava\s*(nasil|durumu)", "hava durumu"),
    (r"\boled\b|\btelevizyon\b|\btv\b|\btelefon\b|\blaptop\b|\bbilgisayar\b", "elektronik ürün"),
    (r"\bbitcoin\b|\bkripto\b|\bborsa\b|\bhisse\b|\bdolar\s*kur|\byatirim\s*tavsiye", "finans"),
    (r"\bpython\b|\bjavascript\b|\bweb\s*sitesi\s*yaz|\bkod\s*yaz|\bwindows\s*neden", "yazılım"),
    (r"\bdiyet\b|\bkilo\s*ver|\bsaglik\s*tavsiye|\bilac\b", "sağlık"),
    (r"\bucak\s*bileti\b|\botel\s*bul|\btatil\s*oner", "seyahat"),
    # Türkçe ek alır ("şiiri", "şiirler") — sondaki \b ekleri dışarıda bırakır.
    (r"\bsiir|\bsarki\s*sozu|\bhikaye\s*yaz|\broman\s*yaz", "yaratıcı yazım"),
    (r"\bbaskenti\b|\bnufusu\b|\bkac\s*yilinda\b|\btarihte\b", "genel kültür"),
    (r"\bmac\s*skoru|\bfutbol\b|\bbasketbol\b", "spor"),
)

# Salt aritmetik ("2+2 kaç?"). Ölçü içeren teknik ifadelerle karışmaması
# için yalnızca başka hiçbir alan içi terim yokken uygulanır.
_PURE_MATH = re.compile(r"^\W*\d+\s*[\+\-\*/x]\s*\d+\s*(kac|nedir|esittir)?\s*\W*$")

_GREETING = re.compile(
    r"\b(merhaba|selam|hey|gunaydin|iyi\s*gunler|iyi\s*aksamlar|"
    r"nasilsin|naber|hello|hi)\b"
)
_THANKS = re.compile(
    r"\b(tesekkur|tesekkurler|sagol|saol|eyvallah|thanks|minnettar)\b")
_META = re.compile(
    r"(ne\s*konuda|neler\s*yapabil|kimsin|sen\s*kimsin|ne\s*ise\s*yarar|"
    r"yardimci\s*olur\s*musun|nasil\s*yardimci|ne\s*yapabilirsin|"
    r"bana\s*.{0,16}\s*secebilir\s*misin|yardim\s*eder\s*misin)"
)

# Prompt injection / sistem sızdırma girişimleri
_INJECTION = re.compile(
    r"(onceki\s*talimat|sistem\s*prompt|system\s*prompt|gizli\s*kural|"
    r"talimatlarini\s*unut|ignore\s*previous|reveal\s*your|"
    r"api\s*(key|anahtar)|environment\s*degisken|\.env\b|"
    r"baska\s*bir\s*kimlige|rolunu\s*degistir|sen\s*artik\b|"
    r"kural\s*yap|sistem\s*kurali\s*yap)"
)


@dataclass
class ScopeVerdict:
    """Kapsam kararı."""

    scope: str = "in_domain"                 # in_domain | out_of_domain | mixed
    is_greeting: bool = False
    is_thanks: bool = False
    is_meta: bool = False
    injection_attempt: bool = False
    in_domain_part: Optional[str] = None     # karma mesajda cevaplanacak bölüm
    out_of_domain_topics: List[str] = field(default_factory=list)
    refusal_text: str = SCOPE_REFUSAL

    @property
    def answerable(self) -> bool:
        return self.scope in ("in_domain", "mixed")


class ScopeGuard:
    """Mesajın şerit testere kapsamında olup olmadığına karar verir."""

    def __init__(self, knowledge_base=None):
        self.kb = knowledge_base

    def check(self, message: str) -> ScopeVerdict:
        verdict = ScopeVerdict()
        if not message or not message.strip():
            verdict.scope = "in_domain"
            return verdict

        text = strip_accents(message).lower()

        verdict.injection_attempt = bool(_INJECTION.search(text))
        verdict.is_greeting = bool(_GREETING.search(text))
        verdict.is_thanks = bool(_THANKS.search(text))
        verdict.is_meta = bool(_META.search(text))

        in_domain_hits = self._in_domain_hits(text)
        out_topics = [label for pattern, label in _OUT_OF_DOMAIN_PATTERNS
                      if re.search(pattern, text)]

        # Salt aritmetik alan dışıdır. Kontrol CÜMLE BAZINDA yapılır:
        # "Bıçak neden kırılır, ayrıca 2+2 kaç?" mesajının tamamına bakınca
        # teknik terim bulunur ve matematik bölümü fark edilmeden cevaplanır.
        if any(_PURE_MATH.match(clause.strip())
               for clause in re.split(r"[,;.?]|\bve\b|\bayrica\b|\bbir de\b", text)
               if clause.strip()):
            out_topics.append("matematik")

        verdict.out_of_domain_topics = out_topics

        # Enjeksiyon denemesi: kapsam davranışı sürdürülür, prompt sızdırılmaz.
        if verdict.injection_attempt:
            verdict.scope = "out_of_domain" if not in_domain_hits else "mixed"
            if in_domain_hits:
                verdict.in_domain_part = message
            return verdict

        if out_topics and in_domain_hits:
            verdict.scope = "mixed"
            verdict.in_domain_part = self._in_domain_clause(message)
            return verdict

        if out_topics:
            verdict.scope = "out_of_domain"
            return verdict

        # Selamlama / teşekkür / kimlik sorusu alan DIŞI DEĞİLDİR.
        if verdict.is_greeting or verdict.is_thanks or verdict.is_meta:
            verdict.scope = "in_domain"
            return verdict

        if in_domain_hits:
            verdict.scope = "in_domain"
            return verdict

        # Hiçbir sinyal yok: konuşmanın ortasında gelen kısa cevaplar
        # ("evet", "120", "aynı makine") alan içi kabul edilir; kapsam
        # dışına atmak sohbeti kopartır.
        verdict.scope = "in_domain" if len(text.split()) <= 4 else "out_of_domain"
        return verdict

    # ------------------------------------------------------------------ #

    @staticmethod
    def _in_domain_hits(text: str) -> List[str]:
        return [root for root in _IN_DOMAIN_ROOTS if root in text]

    @staticmethod
    def _in_domain_clause(message: str) -> str:
        """
        Karma mesajda yalnızca şerit testereyle ilgili bölümü ayıkla.

        "304 paslanmaz için bıçak öner, bir de hava nasıl?" ifadesinde
        ikinci yarıya hiç girilmemeli.
        """
        parts = re.split(r"[,;.]|\bve\b|\bayrica\b|\bbir de\b|\bhem de\b",
                         message, flags=re.IGNORECASE)
        kept = []
        for part in parts:
            ascii_part = strip_accents(part).lower()
            if not ascii_part.strip():
                continue
            if any(re.search(p, ascii_part) for p, _ in _OUT_OF_DOMAIN_PATTERNS):
                continue
            if _PURE_MATH.match(ascii_part.strip()):
                continue
            if ScopeGuard._in_domain_hits(ascii_part):
                kept.append(part.strip())
        return " ".join(kept).strip() or message
