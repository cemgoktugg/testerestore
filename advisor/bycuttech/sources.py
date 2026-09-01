# -*- coding: utf-8 -*-
"""
ConflictResolver — kaynak önceliği ve marka kapsamı.

İki ayrı işi var:

1) ÖNCELİK: Aynı konuda birden çok kaynak varsa hangisinin sözü geçer?
   Sıra RUNTIME_SYSTEM_PROMPT §6'dan gelir; en tepede TAM MAKİNE MODELİNİN
   üretici kılavuzu vardır. Makine kılavuzu bıçak ölçüsü, hız ve gerginlik
   konusunda her zaman katalog tablosunu geçer.

2) MARKA KAPSAMI: Bir üreticinin ürününe özel kuralı BAŞKA bir markanın
   ürününe taşımak yasak (CR-BREAKIN-001). Örnek: "Morse karbür bıçak
   alıştırma istemiyor" bilgisi BYCUTTECH ADVANZ için geçerli değildir;
   BYCUTTECH'in kendi alıştırma kuralı uygulanır. Bu, kullanıcının pahalı
   bir karbür bıçağı alıştırmadan çalıştırıp ilk kesimde bozmasını önler.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from bycuttech.materials import strip_accents
from bycuttech.models import SourceRef, TechnicalAnswerPlan

logger = logging.getLogger(__name__)

# Kaynak önceliği — küçük sayı = daha yetkili (§6).
_AUTHORITY_ORDER: Dict[str, int] = {
    "machine_manual": 1,
    "owned_product_catalog": 2,
    "owned_cutting_table": 3,
    "owned_product_tension_table": 3,
    "owned_troubleshooting_table": 3,
    "manufacturer_technical_guide": 4,
    "manufacturer_selection_tool": 4,
    "standard_body": 5,
    "supplier_application_guide": 6,
    "secondary": 8,
}

# Sohbette adı geçebilecek diğer bıçak markaları. Bunlara ait kurallar
# BYCUTTECH ürününe uygulanmaz.
_OTHER_BRANDS = (
    "morse", "m.k. morse", "starrett", "lenox", "wikus", "bahco",
    "doall", "röntgen", "rontgen", "amada bıçak", "simonds",
)


@dataclass
class BrandScopeVerdict:
    """Marka kapsamı ihlali tespiti."""

    foreign_brand: Optional[str] = None
    topic: Optional[str] = None
    message: Optional[str] = None

    @property
    def violated(self) -> bool:
        return self.foreign_brand is not None


class ConflictResolver:
    """Kaynak çatışmalarını çözer ve marka kapsamını korur."""

    def __init__(self, knowledge_base):
        self.kb = knowledge_base

    # ------------------------------------------------------------------ #
    # 1) Öncelik
    # ------------------------------------------------------------------ #

    def authority_rank(self, source_id: str) -> int:
        entry = self.kb.source_by_id.get(source_id)
        if not entry:
            # Ansiklopedinin kendi kaynakları BYCUTTECH'e ait tablolardır.
            return _AUTHORITY_ORDER["owned_cutting_table"]
        return _AUTHORITY_ORDER.get(entry.get("authority_type", ""),
                                    _AUTHORITY_ORDER["secondary"])

    def rank_sources(self, source_ids: List[str]) -> List[str]:
        """Kaynakları yetkiye göre sırala (en yetkili başta)."""
        return sorted(set(source_ids), key=self.authority_rank)

    def source_refs(self, source_ids: List[str]) -> List[SourceRef]:
        """Plan'daki id listesini tam metadata'ya çevir."""
        refs: List[SourceRef] = []
        for sid in self.rank_sources(source_ids):
            meta = self.kb.source_ref(sid)
            refs.append(SourceRef(
                source_id=meta["source_id"],
                title=meta.get("title", ""),
                publisher=meta.get("publisher", ""),
                url=meta.get("url", ""),
                scope=str(meta.get("scope", "")),
                verification_status=meta.get("verification_status", ""),
                brand_scope=meta.get("brand_scope"),
                last_checked=meta.get("last_checked", ""),
                confidence=meta.get("confidence", ""),
            ))
        return refs

    def numeric_authority_ok(self, source_ids: List[str]) -> bool:
        """
        Sayısal karar için en az bir YETKİLİ kaynak var mı?

        Perakendeci blogu, forum ya da kaynağı belirsiz PDF sayısal karar
        veremez (§6). Ansiklopedinin kendi tabloları BYCUTTECH'e ait
        olduğu için yetkilidir.
        """
        for sid in source_ids:
            entry = self.kb.source_by_id.get(sid)
            if entry is None:
                return True          # ansiklopedinin kendi tablosu
            if entry.get("numeric_authority"):
                return True
        return False

    # ------------------------------------------------------------------ #
    # 2) Marka kapsamı
    # ------------------------------------------------------------------ #

    def check_brand_scope(self, message: str,
                          plan: TechnicalAnswerPlan) -> BrandScopeVerdict:
        """
        Kullanıcı başka markanın kuralını BYCUTTECH ürününe uygulamak
        istiyor mu?

        ADV-005: "Morse karbür bıçak alıştırma istemiyor; BYCUTTECH Advanz
        için de yapmayayım mı?" -> HAYIR. Marka kuralları karışmaz.
        """
        text = strip_accents(message or "").lower()
        brand = next((b for b in _OTHER_BRANDS
                      if strip_accents(b).lower() in text), None)
        if not brand:
            return BrandScopeVerdict()

        topic = None
        if re.search(r"alistirma|rodaj|run.?in|break.?in", text):
            topic = "alıştırma"
        elif re.search(r"gerginlik|gerdirme|tension", text):
            topic = "gerginlik"
        elif re.search(r"\btpi\b|dis adim|diş adım", text):
            topic = "diş adımı"

        if topic is None:
            return BrandScopeVerdict()

        product = plan.product_name or "BYCUTTECH ürünleri"
        return BrandScopeVerdict(
            foreign_brand=brand.title(),
            topic=topic,
            message=(
                f"{brand.title()} markasının {topic} politikası yalnızca kendi "
                f"bıçakları için geçerlidir; {product} için o kuralı "
                f"uygulamıyoruz. BYCUTTECH'in kendi {topic} kuralı aşağıdadır."
            ),
        )

    def machine_manual_note(self, plan: TechnicalAnswerPlan,
                            machine_model: Optional[str]) -> Optional[str]:
        """
        Makine kılavuzunun üstünlüğünü hatırlat.

        Gerginlik, hız ve bıçak ölçüsü sınırlarında kılavuz her zaman
        kataloğun üstündedir (CR-TENSION-001). Kılavuz elimizde yoksa bunu
        gizlemek yerine açıkça söyleriz.
        """
        if not (plan.tension or plan.cutting_speed):
            return None
        if machine_model:
            return (f"{machine_model} kılavuzunda farklı bir sınır belirtiliyorsa "
                    "kılavuz geçerlidir; buradaki değerler ürün tablosundandır.")
        return ("Makine kılavuzunuzdaki hız ve gerginlik sınırları bu tablonun "
                "üstündedir; kılavuzla karşılaştırmanızı öneririz.")

    # ------------------------------------------------------------------ #

    def applicable_facts(self, predicate: str,
                         brand: str = "BYCUTTECH") -> List[Dict[str, Any]]:
        """
        Bir yüklem için YALNIZCA kapsamı uyan doğrulanmış olguları getir.

        Marka kapsamlı olgular (ör. WIKUS TPI tabloları) başka markanın
        ürününe otomatik uygulanmaz; yalnızca genel ilke olarak
        işaretlenmişse kullanılabilir.
        """
        result = []
        for fact in self.kb.facts_by_predicate.get(predicate, []):
            scope = fact.get("scope") or {}
            fact_brand = scope.get("brand")
            if fact_brand and fact_brand.upper() != brand.upper():
                if not scope.get("general_principle"):
                    continue
            result.append(fact)
        return result
