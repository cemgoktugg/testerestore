"""
Bilgi kütüphanesi yönlendiricisi: hızlı arama + küçük modelle seçim.

1) llm/kb.py ilk 8 adayı getirir (API yok, ms; doğru kayıt %85 ilk 8'de).
2) Küçük model (varsayılan gpt-4o-mini) yalnızca SEÇER: mesajdaki soruyu
   doğrudan cevaplayan en fazla 2 kayıt ya da hiçbiri. Cevap YAZMAZ.
3) Müşteriye kütüphanedeki onaylı metin (answer_tr) gider → uydurma sayı,
   ürün adı veya süre riski yok; site rehberleriyle aynı bilgi.

Çok emin aramada (yüksek puan + açık fark) model çağrılmaz.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable, List, Optional

from llm.kb import Hit, KnowledgeBase

logger = logging.getLogger(__name__)

RERANK_MODEL = os.environ.get("ADVISOR_KB_RERANK_MODEL", "gpt-4o-mini")
CANDIDATES = 8
MIN_RECALL_SCORE = float(os.environ.get("ADVISOR_KB_RECALL_MIN", "0.18"))
# Bu eşiklerin üstünde model çağrılmadan doğrudan cevap (LOO ile ayarlandı)
DIRECT_SCORE = float(os.environ.get("ADVISOR_KB_DIRECT_SCORE", "0.6"))
DIRECT_MARGIN = float(os.environ.get("ADVISOR_KB_DIRECT_MARGIN", "0.15"))

_SYSTEM = (
    "Sen bir bilgi kütüphanesi seçicisisin. Bir şerit testere mağazasının müşteri mesajı ve "
    "numaralı kütüphane kayıtları verilir.\n"
    "GÖREV: Mesajdaki soruyu DOĞRUDAN ve tam olarak cevaplayan kaydı seç (en fazla 2; ikinciyi "
    "yalnızca mesaj iki ayrı soru içeriyorsa ekle).\n"
    "Boş liste döndür, eğer:\n"
    "- hiçbir kayıt soruyu doğrudan cevaplamıyorsa (yalnızca konu benzerliği yetmez),\n"
    "- mesaj bir soru değil de bir seçim sorusuna cevapsa (ör. 'Var', '40 mm', 'Paslanmaz', makine adı),\n"
    "- müşteri kendi işine özel bıçak/ölçü/fiyat önerisi istiyorsa (malzeme + ölçü verip 'hangi bıçak' gibi).\n"
    "Yalnızca JSON yaz: {\"ids\": [\"kayit.id\", ...]}"
)


class KnowledgeRouter:
    def __init__(self, kb: Optional[KnowledgeBase], client: Any = None,
                 select_fn: Optional[Callable[[str, List[Hit]], List[str]]] = None):
        """
        Args:
            kb: Bilgi kütüphanesi
            client: openai.OpenAI örneği (seçim için); yoksa yalnızca doğrudan eşik kullanılır
            select_fn: Testler için seçim fonksiyonu (client yerine)
        """
        self.kb = kb
        self.client = client
        self.select_fn = select_fn or (self._select_llm if client is not None else None)
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def route(self, message: str) -> List[Hit]:
        """Mesaja cevap olacak kütüphane kayıtları (boş liste = kütüphane cevaplamıyor)."""
        if self.kb is None or not self.kb.entries:
            return []
        hits = [h for h in self.kb.search(message, k=CANDIDATES) if h.score >= MIN_RECALL_SCORE]
        if not hits:
            return []
        top = hits[0]
        if top.score >= DIRECT_SCORE and (len(hits) == 1 or top.score - hits[1].score >= DIRECT_MARGIN):
            return [top]
        if self.select_fn is None:
            return []
        try:
            ids = self.select_fn(message, hits)
        except Exception as exc:          # seçim başarısızsa sohbet huniden devam eder
            logger.warning(f"kütüphane seçimi başarısız: {exc}")
            return []
        by_id = {h.entry.id: h for h in hits}
        return [by_id[i] for i in ids if i in by_id][:2]

    # ------------------------------------------------------------------ #

    def _select_llm(self, message: str, hits: List[Hit]) -> List[str]:
        lines = []
        for h in hits:
            e = h.entry
            lines.append(f"- id: {e.id}\n  başlık: {e.title_tr}\n  cevap: {e.answer_tr[:220]}")
        user = f"Müşteri mesajı: {message}\n\nKayıtlar:\n" + "\n".join(lines)
        resp = self.client.chat.completions.create(
            model=RERANK_MODEL,
            messages=[{"role": "system", "content": _SYSTEM}, {"role": "user", "content": user}],
            temperature=0,
            max_tokens=60,
            response_format={"type": "json_object"},
            timeout=8,
        )
        usage = getattr(resp, "usage", None)
        if usage is not None:
            self.total_prompt_tokens += int(getattr(usage, "prompt_tokens", 0) or 0)
            self.total_completion_tokens += int(getattr(usage, "completion_tokens", 0) or 0)
        data = json.loads(resp.choices[0].message.content or "{}")
        ids = data.get("ids") or []
        return [str(i) for i in ids if isinstance(i, str)]
