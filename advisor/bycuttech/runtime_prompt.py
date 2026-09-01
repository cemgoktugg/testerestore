# -*- coding: utf-8 -*-
"""
Çalışma zamanı sistem promptunun TEK doğruluk kaynağı.

Temel metin `bycuttech_rag_v2/RUNTIME_SYSTEM_PROMPT.md` dosyasıdır. Üstüne
yalnızca PROJEYE ÖZGÜ, o dosyada bulunmayan kurallar eklenir:

  • [UNKNOWN_QUESTION: …] etiket protokolü — llm/unknown_questions_handler.py
    bu etiketi ayrıştırıp cevaplanmamış soruyu uzman ekibe kuyruğa alıyor.
    Protokol promptta anlatılmazsa etiket hiç üretilmez ve özellik ölür.
  • Deterministik motor sözleşmesi — sayılar araç çıktısından gelir.

BİLEREK TAŞINMAYANLAR (prompts/system_prompt.py içindeki eski metin):
    Eski promptta gömülü kesme hızı tablosu ("Alüminyum: 80-120") ve TPI
    kestirmesi ("Orta kesit → 6/10, 8/12") vardı. Bunlar LLM'e sayı
    ÜRETTİRİYOR ve yeni sistemin temel kuralıyla — sayısal değerler yalnızca
    doğrulanmış tablolardan gelir — doğrudan çelişiyor. Üstelik oradaki
    aralıklar ansiklopedi v2'deki doğrulanmış değerlerle uyuşmuyor
    (ör. paslanmaz: promptta 25-40, doğrulanmış tabloda 30-37 m/dak).
    Eski dosya SİLİNMEDİ; yalnızca yeni akış tarafından kullanılmıyor.

Prompt yüklenemezse SESSİZCE eski/genel bir prompta düşülmez: hata
yükseltilir, çağıran katman güvenli davranışı uygular (§5).
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Dict, Optional

from bycuttech.knowledge import KnowledgePackageError, runtime_system_prompt

logger = logging.getLogger(__name__)

# Projeye özgü ek. Runtime promptunun KAPSAMADIĞI, yalnızca bu kod
# tabanında anlamı olan kurallar.
_PROJECT_ADDENDUM = """
---

## Proje Entegrasyonu (BYCUTTECH e-ticaret)

### Sayısal değerlerin kaynağı
Bant hızı, kesim performansı (Q), TPI, ürün varyantı, gerginlik ve tahmini
süre sana **araç çıktısı** olarak verilir. Bu değerleri kendin hesaplama,
yuvarlama veya tahmin etme. Araç çıktısında olmayan bir sayıyı cevaba
yazma; eksikse gereken bilgiyi sor.

### Cevaplayamadığın şerit testere soruları
Soru şerit testereyle ilgili AMA verilen kaynaklarda karşılığı yoksa,
cevabının içine tam olarak şu etiketi ekle:

    [UNKNOWN_QUESTION: kullanıcının sorusu]

Etiket sistem tarafından ayrıştırılır ve soru uzman ekibe iletilir;
kullanıcıya görünmez. Etiketi yalnızca gerçekten bilgi eksikse kullan,
kapsam dışı sorularda kullanma.

### Ürün ve sipariş
Ürün önerisi verirken yalnızca sana bildirilen doğrulanmış varyantı kullan.
SKU, stok ve fiyat bilgisini uydurma; bunlar mağaza sisteminden gelir.
Şerit testere uzunluğu bir sipariş parametresidir, ayrı bir ürün varyantı
değildir.

### Dil
Varsayılan dil Türkçedir. Kullanıcı başka bir dilde yazarsa o dilde
cevap ver.
"""

_lock = threading.Lock()
_cached: Optional[str] = None


class PromptUnavailableError(RuntimeError):
    """Sistem promptu yüklenemedi — sessiz fallback YOK."""


def build_runtime_prompt(context: Optional[Dict[str, Any]] = None) -> str:
    """
    Birleşik çalışma zamanı promptunu üret.

    Args:
        context: Oturumun yapılandırılmış durumu (varsa prompta eklenir).

    Raises:
        PromptUnavailableError: Paket promptu okunamazsa.
    """
    global _cached

    with _lock:
        if _cached is None:
            try:
                base = runtime_system_prompt()
            except KnowledgePackageError as exc:
                logger.error("Runtime sistem promptu yüklenemedi: %s", exc)
                raise PromptUnavailableError(str(exc)) from exc
            _cached = base.rstrip() + "\n" + _PROJECT_ADDENDUM

    if not context:
        return _cached

    return _cached + "\n---\n\n## Oturum durumu\n\n" + _format_context(context)


def _format_context(context: Dict[str, Any]) -> str:
    """
    Oturum durumunu okunur satırlara çevir.

    Ham JSON gömmek yerine etiketli satırlar kullanılıyor: model bir alanı
    "yok" ile "belirtilmemiş" arasında ayırt edebilsin ve boş alanları
    doldurulmuş sanmasın.
    """
    labels = {
        "material_normalized": "Malzeme",
        "material_family_tr": "Malzeme ailesi",
        "hardness_value": "Sertlik",
        "shape": "Kesit türü",
        "diameter_mm": "Çap (mm)",
        "width_mm": "Genişlik (mm)",
        "height_mm": "Yükseklik (mm)",
        "wall_thickness_mm": "Cidar (mm)",
        "machine_model": "Makine",
        "blade_length_mm": "Bıçak uzunluğu (mm)",
        "blade_width_mm": "Bıçak genişliği (mm)",
        "blade_thickness_mm": "Bıçak kalınlığı (mm)",
        "coolant": "Soğutma",
    }
    lines = [f"- {label}: {context[key]}"
             for key, label in labels.items() if context.get(key) is not None]
    return "\n".join(lines) if lines else "- (henüz teknik bilgi toplanmadı)"


def reset_cache() -> None:
    """Testler için: promptu yeniden okumaya zorla."""
    global _cached
    with _lock:
        _cached = None
