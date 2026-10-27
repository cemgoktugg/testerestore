"""
Bilgi kütüphanesi (advisor/knowledge/*.json) — yükleme ve LLM'siz arama.

Kütüphane, danışmanın ve sitenin tek doğruluk kaynağıdır: her kayıt doğal
müşteri soru varyantları (questions_tr), kısa "siz" hitaplı cevap (answer_tr),
kaynaklı olgular (facts) ve site bağlantıları taşır.

Arama (2026-10-27 deneyleriyle seçildi): kayıt düzeyinde TF-IDF, iki özellik
türünün ortalaması —
  - kelime kökleri (Türkçe sadeleştirme + ünsüz yumuşaması + ilk 5 harf),
  - harf 3–5 grupları (ek ve yazım hatasına dayanıklı).
Kayıt metni = soru varyantları ×2 + başlık ×2 + cevap. Varyant düzeyinde BM25
(ilk-3 %53) ve anlam vektörleri (embedding, ilk-3 %66) bu yöntemden (ilk-3 %74)
zayıf kaldı. Puan 0–1 arası kosinüs benzerliği. API çağrısı yok, birkaç ms.
"""
from __future__ import annotations

import glob
import io
import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_DIR = os.environ.get("ADVISOR_KB_DIR") or os.path.join(_ROOT, "knowledge")

_TR = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiuCGIOSUAIU")

# Anlam taşımayan sık sözcükler (sadeleşmiş biçim)
_STOP = set("""
ve veya ile icin bir bu su o da de mi mu miyim misiniz musunuz ne nasil neden niye hangi kac
ben biz siz sen bana bize size benim bizim sizin var yok acaba lutfen merhaba selam tesekkurler
olur olursa olarak gibi kadar daha cok az en her hic ama fakat yani zaten sadece hem ise eger
kullan kullanmak yapmak yapilir olmali gerek gerekir lazim istiyorum isterim
demek demektir nedemek anlami anlama anlamina nedir neymis
""".split())

# "6/10", "1,4/2" gibi diş yazımı → TPI kavramı (terim kaydı ve TPI kayıtları bulunsun)
_TPI_NOTATION = re.compile(r"^\d{1,2}(?:[.,]\d{1,2})?/\d{1,2}(?:[.,]\d{1,2})?$")

# Kök kesilince başka sözcükle çakışanlar tam tutulur ("paslanmaz" ≠ "paslanır")
_PROTECT = ("paslanmaz", "sertles", "sogutma", "aluminyum")
# Ünsüz yumuşaması (bıçak → bıçağı, kılavuz → kılavuzu): iki tarafta aynı dönüşüm
_SOFT = str.maketrans("gdb", "ktp")
_WORD = re.compile(r"[a-z0-9]+(?:[.,/][0-9]+)*")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").translate(_TR).lower()).strip()


def _stem(tok: str) -> str:
    if tok[:1].isdigit():
        return tok
    for p in _PROTECT:
        if tok.startswith(p):
            return p.translate(_SOFT)
    tok = tok.translate(_SOFT)
    return tok[:5] if len(tok) > 5 else tok


def _words(text: str) -> List[str]:
    return [w for w in _WORD.findall(norm(text)) if w not in _STOP]


def _features(text: str) -> Tuple[Counter, Counter]:
    words = _words(text)
    words += ["tpi" for w in words if _TPI_NOTATION.match(w)]
    stems = Counter(_stem(w) for w in words)
    grams: Counter = Counter()
    for w in words:
        if w[:1].isdigit():
            grams[w] += 1               # ölçü/sayı tamamıyla eşleşsin
            continue
        s = f"^{w.translate(_SOFT)}$"
        for n in (3, 4, 5):
            for i in range(max(1, len(s) - n + 1)):
                grams[s[i:i + n]] += 1
    return stems, grams


@dataclass
class Entry:
    id: str
    domain: str
    title_tr: str
    answer_tr: str
    questions_tr: List[str]
    intents: List[str] = field(default_factory=list)
    links: List[str] = field(default_factory=list)
    related_products: List[str] = field(default_factory=list)
    requires_data: List[str] = field(default_factory=list)
    facts: List[Dict[str, Any]] = field(default_factory=list)
    safety: bool = False


@dataclass
class Hit:
    entry: Entry
    score: float


class _Space:
    """Tek özellik türü için kayıt düzeyi TF-IDF uzayı."""

    def __init__(self, docs: List[Counter]):
        self.tf = docs
        df: Counter = Counter()
        for d in docs:
            df.update(d.keys())
        n = len(docs)
        self.idf = {t: math.log((n + 1) / (c + 0.5)) for t, c in df.items()}
        self.norms = [self._norm(d) for d in docs]
        self.index: Dict[str, List[int]] = {}
        for i, d in enumerate(docs):
            for t in d:
                self.index.setdefault(t, []).append(i)

    def _norm(self, d: Counter) -> float:
        return math.sqrt(sum((tf * self.idf.get(t, 0.0)) ** 2 for t, tf in d.items())) or 1.0

    def scores(self, q: Counter, override: Optional[Tuple[int, Counter]] = None) -> Dict[int, float]:
        qn = math.sqrt(sum((tf * self.idf.get(t, 0.0)) ** 2 for t, tf in q.items())) or 1.0
        out: Dict[int, float] = {}
        for t, qtf in q.items():
            w = self.idf.get(t)
            if not w:
                continue
            for i in self.index.get(t, ()):
                d = override[1] if override and override[0] == i else self.tf[i]
                f = d.get(t, 0)
                if f:
                    out[i] = out.get(i, 0.0) + qtf * w * f * w
        for i in list(out):
            dn = self._norm(override[1]) if override and override[0] == i else self.norms[i]
            out[i] /= qn * dn
        return out


class KnowledgeBase:
    def __init__(self, kb_dir: Optional[str] = None):
        self.kb_dir = kb_dir or KB_DIR
        self.entries: List[Entry] = []
        self.synonyms: Dict[str, str] = {}
        self._load()
        self._build()

    # ------------------------------------------------------------------ #

    def _load(self) -> None:
        for path in sorted(glob.glob(os.path.join(self.kb_dir, "*.json"))):
            try:
                data = json.load(io.open(path, encoding="utf-8"))
            except Exception:
                continue
            if os.path.basename(path) == "glossary.json":
                self._load_glossary(data)
                continue
            if not isinstance(data, dict):
                continue
            for e in data.get("entries") or []:
                if not e.get("answer_tr") or not e.get("questions_tr"):
                    continue
                self.entries.append(Entry(
                    id=e["id"], domain=data.get("domain", ""), title_tr=e.get("title_tr", ""),
                    answer_tr=e["answer_tr"], questions_tr=list(e["questions_tr"]),
                    intents=e.get("intents") or [], links=e.get("links") or [],
                    related_products=e.get("related_products") or [],
                    requires_data=e.get("requires_data") or [], facts=e.get("facts") or [],
                    safety=bool(e.get("safety")),
                ))

    def _load_glossary(self, data: Any) -> None:
        terms = data.get("terms") if isinstance(data, dict) else data
        for t in terms or []:
            if not isinstance(t, dict):
                continue
            canon = t.get("term_tr") or t.get("term")
            if not canon:
                continue
            for s in (t.get("synonyms_tr") or []) + (t.get("misspellings") or []):
                key = norm(s)
                if key and key != norm(canon) and len(key) >= 3:
                    self.synonyms[key] = norm(canon)

    @staticmethod
    def _entry_text(e: Entry, drop: Optional[str] = None) -> str:
        qs = [q for q in e.questions_tr if q != drop]
        return " ".join(qs * 2 + [e.title_tr] * 2 + [e.answer_tr])

    def _build(self) -> None:
        feats = [_features(self._entry_text(e)) for e in self.entries]
        self._words = _Space([f[0] for f in feats])
        self._grams = _Space([f[1] for f in feats])

    def _expand(self, text: str) -> str:
        """Terim sözlüğü: eş anlamlı/yanlış yazımın yanına standart terimi ekle."""
        if not self.synonyms:
            return text
        n = f" {norm(text)} "
        extra = [canon for key, canon in self.synonyms.items() if f" {key} " in n]
        return text + (" " + " ".join(extra) if extra else "")

    # ------------------------------------------------------------------ #

    def search(self, text: str, k: int = 3, _exclude: Optional[Tuple[int, str]] = None) -> List[Hit]:
        if not self.entries:
            return []
        qw, qg = _features(self._expand(text))
        if not qw and not qg:
            return []
        ow = og = None
        if _exclude is not None:                      # değerlendirme: varyantı kaydından çıkar
            i, q = _exclude
            fw, fg = _features(self._entry_text(self.entries[i], drop=q))
            ow, og = (i, fw), (i, fg)
        sw = self._words.scores(qw, ow)
        sg = self._grams.scores(qg, og)
        total = {i: 0.5 * sw.get(i, 0.0) + 0.5 * sg.get(i, 0.0) for i in set(sw) | set(sg)}
        ranked = sorted(total.items(), key=lambda x: -x[1])[:k]
        return [Hit(self.entries[i], round(s, 4)) for i, s in ranked]

    def answer(self, text: str, min_score: float, min_margin: float) -> Optional[Hit]:
        """Yeterince emin ve ikinciden belirgin ayrışan tek kayıt; yoksa None."""
        hits = self.search(text, k=2)
        if not hits or hits[0].score < min_score:
            return None
        if len(hits) > 1 and hits[0].score - hits[1].score < min_margin:
            return None
        return hits[0]


_DEFAULT: Optional[KnowledgeBase] = None


def default_kb() -> KnowledgeBase:
    global _DEFAULT
    if _DEFAULT is None:
        _DEFAULT = KnowledgeBase()
    return _DEFAULT


def leave_one_out(kb: KnowledgeBase, min_score: float = 0.0, min_margin: float = 0.0,
                  k: int = 3) -> Dict[str, Any]:
    """
    Her soru varyantını kendi kaydından çıkarıp arama: doğrudan cevap eşiğinde
    doğruluk (precision), kapsama (recall) ve ilk-k isabeti.
    """
    total = answered = correct = topk = 0
    misses: List[Tuple[str, str, str]] = []
    for i, e in enumerate(kb.entries):
        for q in e.questions_tr:
            hits = kb.search(q, k=max(k, 2), _exclude=(i, q))
            total += 1
            topk += e.id in [h.entry.id for h in hits[:k]]
            if not hits or hits[0].score < min_score:
                continue
            if len(hits) > 1 and hits[0].score - hits[1].score < min_margin:
                continue
            answered += 1
            if hits[0].entry.id == e.id:
                correct += 1
            else:
                misses.append((q, e.id, hits[0].entry.id))
    return {"total": total, "answered": answered, "correct": correct,
            "precision": correct / answered if answered else 0.0,
            "recall": correct / total if total else 0.0,
            f"top{k}": topk / total if total else 0.0, "misses": misses}
