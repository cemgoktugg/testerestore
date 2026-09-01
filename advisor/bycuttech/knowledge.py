# -*- coding: utf-8 -*-
"""
BYCUTTECH bilgi bankası yükleyici.

Ansiklopedi v2 (~150 KB JSON), kaynak kayıt defteri ve doğrulanmış
olgular süreç ömrü boyunca BİR KEZ yüklenir ve indekslenir. Her istekte
yeniden parse edilirse hem gecikme hem çöp toplama maliyeti çıkar;
görev tanımı bunu açıkça yasaklıyor.

Önbellek anahtarı dosya yolu + mtime + boyut. Dosya değişirse anahtar
değişir ve indeks kendiliğinden yenilenir; böylece "cache yüzünden bayat
veri" durumu oluşmaz (sürümleme gereksinimi).

Paket konumu:
    advisor/bycuttech_rag_v2/  ← doğrulanmış kopya (SHA-256 manifest ile)
Docker'da çalışma dizini /app olduğu için yol modül konumundan türetilir,
cwd'ye güvenilmez.
"""
from __future__ import annotations

import json
import logging
import re
import threading
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# advisor/bycuttech/knowledge.py -> advisor/
_ADVISOR_ROOT = Path(__file__).resolve().parent.parent

# Paketin aranacağı yerler. İlk sıradaki, manifest ile doğrulanmış kopyadır.
# advisor/ kökündeki dosyalar bilerek KULLANILMIYOR: oraya yapılan kopyalama
# sırasında dosya adları bir kaymış (bycuttech_encyclopedia_v1.json içinde
# markdown var). Doğru içerik yalnızca bycuttech_rag_v2/ altında.
_PACKAGE_DIRS = (
    _ADVISOR_ROOT / "bycuttech_rag_v2",
    _ADVISOR_ROOT / "data" / "bycuttech_rag_v2",
)

ENCYCLOPEDIA_FILE = "bycuttech_encyclopedia_v2.json"
REGISTRY_FILE = "premium_source_registry.json"
FACTS_FILE = "premium_verified_facts.json"
RUNTIME_PROMPT_FILE = "RUNTIME_SYSTEM_PROMPT.md"
EVALUATION_FILE = "evaluation_cases.json"


class KnowledgePackageError(RuntimeError):
    """Bilgi paketi bulunamadı veya bozuk."""


def package_dir() -> Path:
    """Doğrulanmış paket dizinini bul."""
    for candidate in _PACKAGE_DIRS:
        if (candidate / ENCYCLOPEDIA_FILE).is_file():
            return candidate
    raise KnowledgePackageError(
        f"bycuttech_rag_v2 paketi bulunamadı. Bakılan yerler: "
        f"{[str(p) for p in _PACKAGE_DIRS]}"
    )


def _fingerprint(path: Path) -> Tuple[str, int, int]:
    stat = path.stat()
    return (str(path), int(stat.st_mtime), stat.st_size)


def _split_designations(raw: str) -> List[str]:
    """
    "201, 202, 301-305, 308" -> ['201','202','301','302','303','304','305','308']

    Aralıklar açılmak ZORUNDA: kataloglarda AISI 304 hiçbir yerde tek başına
    yazmıyor, yalnızca "301-305" aralığının içinde geçiyor. Aralık açılmazsa
    en yaygın paslanmaz kalitesi bulunamaz.
    """
    tokens: List[str] = []
    for chunk in re.split(r"[,;]", raw or ""):
        chunk = chunk.strip()
        if not chunk:
            continue
        # Sayısal aralık: 301-305, 8615-8622, H10-H19, W1-W5, A2-A6, D2-D7
        m = re.fullmatch(r"([A-Za-z]*)(\d+)\s*-\s*([A-Za-z]*)(\d+)", chunk)
        if m:
            pre_a, start, pre_b, end = m.group(1), m.group(2), m.group(3), m.group(4)
            # Önek ya aynı olmalı ya da ikincisi boş ("W1-W5", "301-305")
            if pre_b and pre_b.upper() != pre_a.upper():
                tokens.append(chunk.upper())
                continue
            prefix = pre_a.upper()
            lo, hi = int(start), int(end)
            # Aralık makul mü? "1140-600" gibi ters ya da devasa aralıkları açma.
            if lo <= hi and (hi - lo) <= 200 and len(start) == len(end):
                tokens.extend(f"{prefix}{n}" for n in range(lo, hi + 1))
                continue
        tokens.append(chunk.upper())
    return tokens


class KnowledgeBase:
    """
    Ansiklopedi v2 + kaynak defteri + doğrulanmış olguların tipli indeksi.

    Salt okunurdur; paylaşılan tek örnek olarak kullanılması güvenlidir.
    """

    def __init__(self, directory: Optional[Path] = None):
        self.dir = Path(directory) if directory else package_dir()
        self.fingerprints: List[Tuple[str, int, int]] = []

        self.encyclopedia = self._load(ENCYCLOPEDIA_FILE)
        self.registry = self._load(REGISTRY_FILE, required=False) or {}
        self.facts_doc = self._load(FACTS_FILE, required=False) or {}

        self.schema_version: str = self.encyclopedia.get("schema_version", "0")

        # --- ham bölümler ---
        self.products: List[Dict] = self.encyclopedia.get("products", [])
        self.product_router: List[Dict] = sorted(
            self.encyclopedia.get("product_router", []),
            key=lambda r: -int(r.get("priority", 0)),
        )
        self.cutting_conditions: List[Dict] = self.encyclopedia.get("cutting_conditions", [])
        self.tpi_solid_rules: List[Dict] = self.encyclopedia.get("tpi_solid_rules", [])
        self.tpi_tube_rules: List[Dict] = self.encyclopedia.get("tpi_tube_profile_rules", [])
        self.break_in_rules: List[Dict] = self.encyclopedia.get("break_in_rules", [])
        self.tension_rules: List[Dict] = self.encyclopedia.get("tension_rules", [])
        self.decision_rules: List[Dict] = sorted(
            self.encyclopedia.get("decision_rules", []),
            key=lambda r: -int(r.get("priority", 0)),
        )
        self.troubleshooting: List[Dict] = self.encyclopedia.get("troubleshooting", [])
        self.articles: List[Dict] = self.encyclopedia.get("articles", [])
        self.qa_issues: List[Dict] = self.encyclopedia.get("qa_issues", [])
        self.sources_meta: Dict[str, Dict] = self.encyclopedia.get("sources", {})
        self.premium_sources: List[Dict] = (
            self.registry.get("sources")
            or self.encyclopedia.get("premium_sources", [])
        )
        self.premium_facts: List[Dict] = (
            self.facts_doc.get("facts")
            or self.encyclopedia.get("premium_verified_facts", [])
        )
        self.conflict_rules: List[Dict] = (
            self.facts_doc.get("conflict_rules")
            or self.encyclopedia.get("premium_conflict_rules", [])
        )

        self._build_indexes()

    # ------------------------------------------------------------------ #

    def _load(self, filename: str, required: bool = True) -> Optional[Dict]:
        path = self.dir / filename
        if not path.is_file():
            if required:
                raise KnowledgePackageError(f"Bilgi paketi dosyası yok: {path}")
            logger.warning("Opsiyonel bilgi dosyası bulunamadı: %s", path)
            return None
        self.fingerprints.append(_fingerprint(path))
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def _build_indexes(self) -> None:
        # --- ürün indeksi ---
        self.products_by_id: Dict[str, Dict] = {p["id"]: p for p in self.products}
        self.product_by_alias: Dict[str, Dict] = {}
        for product in self.products:
            names = [product.get("canonical_name", ""), product["id"]]
            names += product.get("aliases", []) or []
            for name in names:
                key = self._norm_key(name)
                if key:
                    self.product_by_alias[key] = product

        # --- malzeme kalitesi -> kesim koşulu ---
        # Bir kalite birden çok sertlik kaydında geçebilir (ör. 304 yalnız
        # 150 HB'de, ama 4140 farklı sertliklerde). Liste tutuluyor ki
        # sertlik verilmediğinde "belirsiz" olduğunu anlayabilelim.
        self.conditions_by_grade: Dict[str, List[Dict]] = defaultdict(list)
        for cond in self.cutting_conditions:
            for grade in _split_designations(cond.get("grade_designations", "")):
                self.conditions_by_grade[grade].append(cond)

        # --- boru/profil TPI matrisi: (çap, cidar) -> tpi ---
        self.tube_matrix: Dict[Tuple[float, float], Dict] = {}
        self.tube_diameters: List[float] = []
        self.tube_walls: List[float] = []
        for rule in self.tpi_tube_rules:
            dia = float(rule["diameter_or_profile_width_mm"])
            wall = float(rule["wall_thickness_mm"])
            self.tube_matrix[(dia, wall)] = rule
            self.tube_diameters.append(dia)
            self.tube_walls.append(wall)
        self.tube_diameters = sorted(set(self.tube_diameters))
        self.tube_walls = sorted(set(self.tube_walls))

        # --- kaynak defteri ---
        self.source_by_id: Dict[str, Dict] = {
            s["source_id"]: s for s in self.premium_sources if s.get("source_id")
        }
        self.facts_by_id: Dict[str, Dict] = {
            f["fact_id"]: f for f in self.premium_facts if f.get("fact_id")
        }
        self.facts_by_predicate: Dict[str, List[Dict]] = defaultdict(list)
        for fact in self.premium_facts:
            self.facts_by_predicate[fact.get("predicate", "")].append(fact)

        # --- açık QA maddeleri (kesin sayı vermeyi engelleyenler) ---
        self.open_qa: List[Dict] = [
            q for q in self.qa_issues
            if q.get("status") not in ("corrected", "normalized")
        ]

        # --- arıza semptom indeksi ---
        self.troubleshooting_by_id: Dict[str, Dict] = {
            t["id"]: t for t in self.troubleshooting
        }

    @staticmethod
    def _norm_key(text: str) -> str:
        return re.sub(r"[^A-Z0-9]", "", (text or "").upper())

    # ------------------------------------------------------------------ #
    # Sorgu yardımcıları
    # ------------------------------------------------------------------ #

    def product(self, product_id: str) -> Optional[Dict]:
        return self.products_by_id.get(product_id)

    def find_product(self, text: str) -> Optional[Dict]:
        """Serbest metinde ürün adı ara ("Primalloy 19x0.90" -> primalloy)."""
        key = self._norm_key(text)
        if not key:
            return None
        if key in self.product_by_alias:
            return self.product_by_alias[key]
        # En uzun eşleşen alias kazanır ("INTENSSPRODIE" > "INTENSSPRO" > "INTENSS")
        best: Optional[Dict] = None
        best_len = 0
        for alias, product in self.product_by_alias.items():
            if len(alias) >= 6 and alias in key and len(alias) > best_len:
                best, best_len = product, len(alias)
        return best

    def source_ref(self, source_id: str) -> Dict[str, Any]:
        """Kaynak metadata'sını birleşik biçimde döndür."""
        entry = self.source_by_id.get(source_id)
        if entry:
            return {
                "source_id": source_id,
                "title": entry.get("title", ""),
                "publisher": entry.get("publisher", ""),
                "url": entry.get("url", ""),
                "scope": str(entry.get("scope", "")),
                "verification_status": entry.get("integration_status", ""),
                "brand_scope": entry.get("publisher"),
                "last_checked": self.registry.get("checked_at", ""),
                "confidence": entry.get("source_tier", ""),
                "numeric_authority": bool(entry.get("numeric_authority")),
            }
        # Ansiklopedinin kendi kısa kaynakları (catalog, cutting_table, ...)
        meta = self.sources_meta.get(source_id, {})
        return {
            "source_id": source_id,
            "title": meta.get("title", source_id),
            "publisher": "B.Y.cuttech GmbH",
            "url": meta.get("url", ""),
            "scope": meta.get("scope", ""),
            "verification_status": "owned_source",
            "brand_scope": "BYCUTTECH",
            "last_checked": self.encyclopedia.get("generated_date", ""),
            "confidence": "S",
            "numeric_authority": True,
        }

    def stats(self) -> Dict[str, int]:
        return {
            "products": len(self.products),
            "product_variants": sum(len(p.get("variants", [])) for p in self.products),
            "cutting_conditions": len(self.cutting_conditions),
            "tpi_rules": len(self.tpi_solid_rules) + len(self.tpi_tube_rules),
            "premium_sources": len(self.premium_sources),
            "premium_verified_facts": len(self.premium_facts),
            "decision_rules": len(self.decision_rules),
            "troubleshooting": len(self.troubleshooting),
            "open_qa_issues": len(self.open_qa),
            "indexed_grades": len(self.conditions_by_grade),
        }


# ---------------------------------------------------------------------- #
# Süreç ömrü boyunca tek örnek + değişiklik algılayan önbellek
# ---------------------------------------------------------------------- #

_lock = threading.Lock()
_cached: Optional[KnowledgeBase] = None
_cached_key: Optional[List[Tuple[str, int, int]]] = None


def get_knowledge_base(directory: Optional[Path] = None,
                       force_reload: bool = False) -> KnowledgeBase:
    """
    Paylaşılan bilgi bankasını döndür.

    Dosyaların mtime/boyutu değişmişse otomatik yeniden yükler; aksi halde
    aynı örneği verir. Böylece hem "her istekte parse etme" yasağı hem de
    "cache yüzünden bayat veri sunma" yasağı birlikte karşılanır.
    """
    global _cached, _cached_key

    with _lock:
        if _cached is not None and not force_reload:
            try:
                current = [_fingerprint(Path(p)) for p, _, _ in _cached.fingerprints]
                if current == _cached_key:
                    return _cached
                logger.info("Bilgi paketi değişti, indeks yenileniyor.")
            except OSError:
                logger.warning("Bilgi paketi damgası okunamadı, yeniden yükleniyor.")

        kb = KnowledgeBase(directory)
        _cached = kb
        _cached_key = list(kb.fingerprints)
        logger.info("BYCUTTECH bilgi bankası yüklendi: %s", kb.stats())
        return kb


def runtime_system_prompt() -> str:
    """
    Canlı sistem promptunu paketten oku.

    Yüklenemezse SESSİZCE genel bir prompta düşülmez — görev tanımı bunu
    açıkça yasaklıyor. Hata yukarı fırlatılır; çağıran katman güvenli
    davranışı (kapsam dışı/teknik inceleme) uygular.
    """
    path = package_dir() / RUNTIME_PROMPT_FILE
    if not path.is_file():
        raise KnowledgePackageError(f"Runtime sistem promptu bulunamadı: {path}")
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise KnowledgePackageError(f"Runtime sistem promptu boş: {path}")
    return text


def evaluation_cases() -> Dict[str, Any]:
    """50 değerlendirme vakasını oku."""
    path = package_dir() / EVALUATION_FILE
    if not path.is_file():
        raise KnowledgePackageError(f"Değerlendirme vakaları bulunamadı: {path}")
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)
