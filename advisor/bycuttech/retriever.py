# -*- coding: utf-8 -*-
"""
HybridRetriever — kavramsal sorular için kaynaklı metin getirme.

MİMARİ KARARIN ÖZÜ: retrieval sayısal kararın YERİNE GEÇMEZ.
Bant hızı, Q, TPI, varyant ve gerginlik yapılandırılmış tablolardan
okunur. Bu modül yalnızca "TPI nedir", "XTR teknolojisi ne işe yarar",
"bimetal bıçak nasıl yapılmış" gibi açıklama isteyen sorulara yanıt
verecek metni bulur.

Neden sayısal veriyi serbest metne çevirmiyoruz: bir kesim tablosu
chunk'a bölündüğünde "30-37 m/dak" ile "21-24 m/dak" vektör uzayında
birbirine çok yakın düşer ve retrieval yanlış satırı getirebilir. Tablo
verisi tabloda kalır (source_ingestion_policy).

Arama katmanları:
    1. Metadata filtresi  — ürün/marka/kapsam eşleşmesi
    2. Anahtar kelime     — BM25 benzeri terim skorlaması
    3. Semantik           — mevcut RAGEngine varsa (opsiyonel)
    4. Birleştirme + tekilleştirme + kaynak güven puanı
"""
from __future__ import annotations

import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from bycuttech.materials import strip_accents
from bycuttech.models import TechnicalAnswerPlan

logger = logging.getLogger(__name__)

# Sonucun kabul edilmesi için sorunun ANLAM TAŞIYAN kelimelerinin en az
# bu oranı parçada geçmeli.
#
# Neden mutlak TF-IDF eşiği değil: ham skor sorgu uzunluğuna ve korpus
# büyüklüğüne göre kayıyor. Ölçüldüğünde "TPI nedir" için doğru makale
# 0.161, alakasız "kuantum tünelleme bıçak ömrünü nasıl etkiler?" sorusu
# ise 0.191 alıyordu — yani sabit eşik doğruyu eliyor, yanlışı geçiriyordu.
# Kapsam oranı bu iki durumu net ayırıyor (1.00 ve 0.20).
_MIN_TERM_COVERAGE = 0.34

# Kapsam eşiğini geçen sonuçlar arasında sıralama için kullanılan asgari
# skor; yalnızca gürültüyü kesmeye yarar.
_MIN_SCORE = 0.02

# Sorunun anlam tasiyan kelimelerinin bu orandan fazlasi bilgi
# bankasinda HIC gecmiyorsa konu taninmiyor demektir.
_MAX_UNKNOWN_RATIO = 0.3

# Turkce ek aldigi icin kok karsilastirmasi yapiliyor. 4 karakter,
# olculdugunde p/b gibi unsuz degisimlerini de tolere eden en kisa
# guvenli uzunluk ('hesaplanir' <-> 'hesabi').
_STEM = 4

# Kavramsal soru işaretleri. Bunlar yoksa retrieval hiç çalıştırılmaz;
# teknik öneri akışında gereksiz gürültü üretmesin.
_CONCEPTUAL = re.compile(
    r"\bnedir\b|\bne\s*demek\b|\bnasil\b|\bhesaplan|"
    r"\bne\s*ise\s*yarar\b|\baciklar?\s*misin\b|\bfark[ıi]\s*ne\b|"
    r"\bneden\s*(kullan|tercih|gerek)|\bavantaj|\bhangi\s*durumda\b|"
    r"\bteknoloji\b|\byapisi\b|\byapisinda\b|\bformul"
)

# Türkçe durak kelimeleri — terim skorlamasında sayılmamalı.
_STOPWORDS = {
    "bir", "bu", "su", "ve", "ile", "icin", "ne", "nedir", "nasil", "mi",
    "mu", "da", "de", "ki", "en", "cok", "az", "ama", "veya", "gibi",
    "olan", "olur", "var", "yok", "ben", "sen", "biz", "siz", "onu",
    "bana", "beni", "daha", "sonra", "once", "kadar", "her", "hangi",
    # Soru kelimeleri kapsam oranını sulandırır: "nasıl" her soruda geçer
    # ama hiçbir metinde bulunmaz, bu da doğru parçayı eşiğin altına iter.
    "nasil", "neden", "nicin", "kim", "nerede", "misin", "musun",
}


@dataclass
class RetrievedChunk:
    """Getirilen bir bilgi parçası ve kaynağı."""

    text: str
    title: str
    source_id: str
    score: float
    kind: str          # article | troubleshooting | fact

    # Cevaba konacak metin bu uzunlukta kesilir; tam paragraf sınırında
    # kesmek için son cümle sonuna kadar geri sarılır.
    BODY_LIMIT = 700

    def to_dict(self) -> Dict[str, Any]:
        return {"title": self.title, "source_id": self.source_id,
                "score": round(self.score, 3), "kind": self.kind,
                "body": self._trimmed_body()}

    def _trimmed_body(self) -> str:
        text = (self.text or "").strip()
        if len(text) <= self.BODY_LIMIT:
            return text
        cut = text[: self.BODY_LIMIT]
        stop = max(cut.rfind(". "), cut.rfind("\n"))
        return (cut[: stop + 1] if stop > 200 else cut).strip() + " …"


class HybridRetriever:
    """Metadata + anahtar kelime + (opsiyonel) semantik arama."""

    MAX_RESULTS = 3

    def __init__(self, knowledge_base, rag_engine=None):
        self.kb = knowledge_base
        self.rag_engine = rag_engine
        self._corpus = self._build_corpus()
        self._df = self._document_frequencies()

    # ------------------------------------------------------------------ #

    def _build_corpus(self) -> List[RetrievedChunk]:
        """
        Aranabilir metin gövdesini kur.

        Chunk sınırları İÇERİK sınırlarıdır: her makale, her arıza kaydı ve
        her doğrulanmış olgu kendi bütünlüğünü korur. Sabit uzunlukta
        rastgele bölme yapılmaz — teknik başlıklar ve tablo satırları
        ortadan ikiye ayrılırsa anlam kaybolur.
        """
        corpus: List[RetrievedChunk] = []

        for article in self.kb.articles:
            corpus.append(RetrievedChunk(
                text=article.get("body_tr", ""),
                title=article.get("title_tr", article.get("slug", "")),
                source_id=article.get("source", "catalog"),
                score=0.0,
                kind="article",
            ))

        for entry in self.kb.troubleshooting:
            causes = "; ".join(
                f"{c.get('cause_tr')}: {c.get('action_tr')}"
                for c in entry.get("causes_and_actions", [])
            )
            corpus.append(RetrievedChunk(
                text=f"{entry.get('symptom_tr')}. {causes}",
                title=entry.get("symptom_tr", entry.get("id", "")),
                source_id=entry.get("source", "troubleshooting"),
                score=0.0,
                kind="troubleshooting",
            ))

        # DOĞRULANMIŞ OLGULAR BİLEREK BU HAVUZA GİRMİYOR.
        #
        # İki sebep:
        #  1. Sunum — olgular yapılandırılmış veridir. Metin havuzuna
        #     konunca kullanıcıya "bimetal_variable_tpi_contact_range
        #     {'tpi': '10/14', 'min_mm': 0}" gibi ham döküm gösteriliyordu.
        #  2. Marka kapsamı — olguların çoğu WIKUS kapsamlı. Kullanıcı
        #     "TPI nasıl seçilir" diye sorduğunda başka markanın tablosunu
        #     cevap diye sunmak, ConflictResolver'ın koruduğu marka
        #     kapsamını sunum katmanında delmek olur.
        #
        # Olgular kural motoruna ConflictResolver.applicable_facts()
        # üzerinden, kapsam filtresinden geçerek ulaşır.
        return corpus

    def _document_frequencies(self) -> Counter:
        df: Counter = Counter()
        for chunk in self._corpus:
            for term in set(self._tokenize(chunk.text + " " + chunk.title)):
                df[term] += 1
        return df

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        tokens = re.findall(r"[a-z0-9/]+", strip_accents(text or "").lower())
        return [t for t in tokens if len(t) > 2 and t not in _STOPWORDS]

    # ------------------------------------------------------------------ #

    def search(self, message: str,
               plan: Optional[TechnicalAnswerPlan] = None) -> List[Dict[str, Any]]:
        """
        Kavramsal soru için kaynaklı metin getir.

        Teknik öneri akışında (sayısal karar) çağrılsa bile yalnızca
        açıklayıcı sorularda sonuç döndürür; sayısal değerlere karışmaz.
        """
        if not message or not _CONCEPTUAL.search(strip_accents(message).lower()):
            return []

        query_terms = set(self._tokenize(message))
        if not query_terms:
            return []

        # Sorunun ÖZNESİNİ tanıyor muyuz?
        #
        # Kapsam oranı tek başına yetmiyor: "kuantum tünelleme bıçak ömrünü
        # nasıl etkiler?" sorusunda çevredeki alan kelimeleri (bıçak, ömür)
        # eşleştiği için oran yükseliyor ve alakasız bir makale geçiyordu.
        # Asıl sinyal, bilgi bankasının HİÇ tanımadığı kelimelerin payı:
        # yüksekse konu bizim alanımızda değildir, cevap uydurulmaz.
        if self._unknown_ratio(query_terms) >= _MAX_UNKNOWN_RATIO:
            return []

        results = self._keyword_search(message)
        results = self._merge_semantic(message, results)

        # Düşük güvenli sonuç cevaba girmez (görev tanımı §12).
        # Asıl kapı KAPSAM: parça, sorunun anlam taşıyan kelimelerinin
        # yeterli bir bölümünü içermeli. Bilmediğimiz bir konu sorulduğunda
        # ("kuantum tünelleme") hiçbir parça bu kapıdan geçemez ve sistem
        # uydurma yerine sessiz kalır.
        results = [
            r for r in results
            if r.score >= _MIN_SCORE
            and self._term_coverage(r, query_terms) >= _MIN_TERM_COVERAGE
        ]
        results.sort(key=lambda r: -r.score)

        # Tekilleştirme: aynı kaynaktan aynı başlık iki kez gelmesin.
        seen = set()
        unique: List[RetrievedChunk] = []
        for chunk in results:
            key = (chunk.source_id, chunk.title)
            if key in seen:
                continue
            seen.add(key)
            unique.append(chunk)
            if len(unique) >= self.MAX_RESULTS:
                break

        if plan is not None:
            for chunk in unique:
                plan.add_source(chunk.source_id)

        return [c.to_dict() for c in unique]

    def _unknown_ratio(self, query_terms: set) -> float:
        """Sorunun kelimelerinin ne kadarı korpusta hiç geçmiyor?"""
        if not query_terms:
            return 1.0
        unknown = 0
        for term in query_terms:
            stem = term[:_STEM]
            if not any(known.startswith(stem) for known in self._df):
                unknown += 1
        return unknown / len(query_terms)

    def _term_coverage(self, chunk: RetrievedChunk, query_terms: set) -> float:
        """
        Sorunun kelimelerinin ne kadarı bu parçada geçiyor?

        Türkçe ek aldığı için ("bıçağın" / "bıçak") tam kelime yerine kök
        benzerliği aranıyor: kelimelerden biri diğerinin başlangıcıysa
        eşleşme sayılır.
        """
        if not query_terms:
            return 0.0
        chunk_terms = set(self._tokenize(chunk.text + " " + chunk.title))
        hits = 0
        for term in query_terms:
            stem = term[:_STEM]
            if any(t == term or t.startswith(stem) or term.startswith(t[:_STEM])
                   for t in chunk_terms):
                hits += 1
        return hits / len(query_terms)

    def _keyword_search(self, message: str) -> List[RetrievedChunk]:
        """TF-IDF ağırlıklı terim skorlaması (BM25'in sade hâli)."""
        query_terms = self._tokenize(message)
        if not query_terms:
            return []

        total = max(len(self._corpus), 1)
        scored: List[RetrievedChunk] = []

        for chunk in self._corpus:
            terms = self._tokenize(chunk.text + " " + chunk.title)
            if not terms:
                continue
            counts = Counter(terms)
            score = 0.0
            for term in query_terms:
                tf = counts.get(term, 0)
                if not tf:
                    continue
                idf = math.log((total + 1) / (self._df.get(term, 0) + 1)) + 1.0
                score += (tf / len(terms)) * idf
            if score <= 0:
                continue
            score *= self._authority_weight(chunk.source_id)
            scored.append(RetrievedChunk(
                text=chunk.text, title=chunk.title,
                source_id=chunk.source_id, score=score, kind=chunk.kind))
        return scored

    def _authority_weight(self, source_id: str) -> float:
        """Kaynak güven puanı: sahip olunan kaynaklar öne çıkar."""
        entry = self.kb.source_by_id.get(source_id)
        if entry is None:
            return 1.2                       # BYCUTTECH'in kendi tabloları
        tier = entry.get("source_tier", "")
        return {"S": 1.2, "A": 1.0}.get(tier, 0.8)

    def _merge_semantic(self, message: str,
                        results: List[RetrievedChunk]) -> List[RetrievedChunk]:
        """
        Mevcut RAGEngine varsa semantik sonuçları harmanla.

        RAG kapalıysa (varsayılan) bu adım sessizce atlanır — sistem
        anahtar kelime + yapılandırılmış veriyle çalışmaya devam eder.
        """
        if self.rag_engine is None:
            return results
        try:
            hits = self.rag_engine.retrieve(message, top_k=3)
        except Exception as exc:
            logger.warning("Semantik arama atlandı: %s", exc)
            return results

        for hit in hits or []:
            metadata = hit.get("metadata", {}) or {}
            results.append(RetrievedChunk(
                text=hit.get("content", ""),
                title=metadata.get("parent_source", "doküman"),
                source_id=metadata.get("source_id", "encyclopedia"),
                score=float(hit.get("score", 0.0)),
                kind="semantic",
            ))
        return results
