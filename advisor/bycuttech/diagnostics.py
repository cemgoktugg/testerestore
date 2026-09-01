# -*- coding: utf-8 -*-
"""
Arıza teşhisi ve güvenlik kuralları.

Semptomlar ansiklopedideki `troubleshooting` tablosundan gelir; nedenler
tabloda verilen `order` sırasıyla listelenir — bu sıra "önce en olası ve
en ucuz kontrol" mantığıyla hazırlanmıştır.

Ayrıca doğrudan güvenlik yanıtı gerektiren birkaç durum var. Bunlar
tabloda değil; makine güvenliğiyle ilgili oldukları için burada açık
kurallar hâlinde tutuluyor ve teknik cevaptan ÖNCE verilirler.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from bycuttech.materials import strip_accents

# Kullanıcı ifadesi -> ansiklopedideki semptom id'si.
#
# Özne ile fiil arasına kelime girebilir ("bıçak NEDEN kırılır", "dişler
# KESİMDE kırıldı"); bu yüzden aralarda kısa bir boşluk payı bırakılıyor.
# Pay dar tutuldu, yoksa uzak iki kelime yanlışlıkla eşleşir.
_SYMPTOM_PATTERNS: List[tuple] = [
    ("blade_break", r"(bicak|serit|band)\w*\s*(\w+\s+){0,2}(kopt|kop\w*|kiril\w*|catla\w*)"),
    ("tooth_breakage", r"dis(ler)?\w*\s*(\w+\s+){0,2}(kopt|kop\w*|kiril\w*|doku\w*)|dis\s*kaybi"),
    ("tooth_back_breakout", r"dis(in)?\s*arka|arka\s*taraf.{0,12}kiril"),
    ("cut_deviation", r"yana\s*kac|sag[ae]\s*kac|sol[ae]\s*kac|kesim\s*kaciyor|egri\s*kes|"
                      r"sapma|duz\s*kesmiyor"),
    ("wandering_or_wavy_cut", r"dalgali|yon\s*degistir|kesim\s*dalgalan"),
    ("premature_tooth_wear", r"erken\s*(asin|korel)|cabuk\s*korel|hizli\s*asin|omru\s*kisa"),
    ("one_sided_tooth_wear", r"tek\s*taraf.{0,10}asin"),
    ("inaccurate_cut", r"olcu\s*(tutmuyor|hatali|sapiyor)|hatali\s*kesim|olcusel"),
    ("chips_in_gullet", r"talas\s*(sikis|birik|tikan)|dis\s*boslug.{0,10}talas"),
    ("blade_back_wear", r"sirt.{0,10}asin|bicak\s*sirti"),
    ("blade_surface_damage", r"govde.{0,12}(hasar|cizik)|yuzey.{0,10}hasar"),
    ("twisted_blade", r"burul|bicak\s*bukul|kivril"),
]

# Titreşim ve gürültü doğrudan bir tablo semptomu değil; en yakın
# eşdeğerlere yönlendirilir.
_VIBRATION = r"titresim|gurultu|ses\s*(cikariyor|geliyor)|zangirdi"

_SLOW_CUT = r"kesim\s*suresi\s*uz|yavas\s*kesiyor|uzun\s*suruyor|verim\s*dust"


@dataclass
class SafetyDirective:
    """Teknik cevaptan önce verilmesi gereken güvenlik yanıtı."""

    must_stop_machine: bool = False
    refuse_action: bool = False
    text: str = ""


# RUNTIME_SYSTEM_PROMPT §8: teşhiste önce ucuz ve güvenli TEMEL kontroller
# sıralanır. Ansiklopedinin semptom tablosu bunların hepsini içermiyor
# (ör. "yana kaçma" kaydında iş parçası sıkma yok) ama sahada kesim
# sapmasının en sık sebebi gevşek bağlamadır; atlanırsa kullanıcı bıçağı
# boş yere değiştirir.
# `dedup_key`: tabloda bu konu zaten varsa temel kontrol tekrar eklenmez.
# Anahtar kelimeyle eşleştiriliyor — ilk harflerle alt dize araması
# yanıltıcıydı ("iş" kelimesi "diş" içinde de geçiyor).
_BASELINE_CHECKS: List[Dict[str, str]] = [
    {"dedup_key": "sikma|mengene|baglama",
     "cause_tr": "İş parçası sıkma (mengene) gevşek",
     "action_tr": "Parçayı mengeneye tam oturtup sıkın; kesim sırasında en "
                  "ufak oynama kesimi saptırır."},
    {"dedup_key": "kilavuz",
     "cause_tr": "Kılavuzlar malzemeden uzak veya gevşek",
     "action_tr": "Kılavuz kollarını parçaya mümkün olduğunca yaklaştırıp sıkın."},
    {"dedup_key": "firca|talas",
     "cause_tr": "Talaş fırçası çalışmıyor",
     "action_tr": "Fırçanın diş boşluklarını temizlediğini doğrulayın; "
                  "tıkalı diş boşluğu hem sapma hem diş kırılması yapar."},
]

# Temel kontrollerin öne alınacağı semptomlar: kesim yönü/kalitesiyle
# ilgili olanlar. Diş kırılması gibi kayıtlarda tablo zaten kapsamlı.
_NEEDS_BASELINE = {
    "cut_deviation", "wandering_or_wavy_cut", "inaccurate_cut",
    "twisted_blade", "one_sided_tooth_wear",
}


@dataclass
class Diagnosis:
    """Bir arıza teşhisi sonucu."""

    symptom_id: Optional[str] = None
    symptom_tr: Optional[str] = None
    causes: List[Dict[str, str]] = field(default_factory=list)
    source: Optional[str] = None
    safety: Optional[SafetyDirective] = None
    context_questions: List[str] = field(default_factory=list)

    @property
    def found(self) -> bool:
        return self.symptom_id is not None


class DiagnosticsEngine:
    """Semptomdan nedene, nedenden düzeltici işleme."""

    MAX_CAUSES = 5

    def __init__(self, knowledge_base):
        self.kb = knowledge_base

    # ------------------------------------------------------------------ #

    def safety_check(self, message: str) -> Optional[SafetyDirective]:
        """
        Doğrudan güvenlik yanıtı gerektiren durumlar.

        Bunlar teknik öneriden ÖNCE gelir; kullanıcı yanlış cevabı
        uygularsa yaralanma ya da bıçak kopması riski var.
        """
        text = strip_accents(message or "").lower()

        # SAFE-003: makine çalışırken kasnak/kılavuz ayarı
        if re.search(r"(kasnak|kilavuz|bicak|serit).{0,40}"
                     r"(makine\s*calis|calisirken|calisir\s*durumda|calisiyorken)", text) or \
           re.search(r"(makine\s*calis\w*|calisirken).{0,40}(kasnak|kilavuz|ayarla|degistir)", text):
            return SafetyDirective(
                must_stop_machine=True,
                refuse_action=True,
                text=(
                    "**Hayır — makine çalışırken kasnak, kılavuz veya bıçak üzerinde "
                    "işlem yapmayın.** Önce makineyi durdurun, enerjiyi güvenli şekilde "
                    "izole edin (elektrik ve varsa hidrolik/pnömatik basınç) ve bıçağın "
                    "tamamen durduğundan emin olun. Ayar ve kontrol işlemleri yalnızca "
                    "bu adımlardan sonra yapılır.\n\n"
                    "Bu genel bir güvenlik kuralıdır; makine üreticinizin güvenlik "
                    "talimatı esastır ve buradaki açıklamanın yerine geçer."
                ),
            )

        # SAFE-002: kırık dişli kesiğe yeni bıçak sokmak
        if re.search(r"(dis|disler).{0,30}(kiril|kopt|kirildi)", text) and \
           re.search(r"(ayni|eski|o)\s*kesig|ayni\s*kesim|kaldigi\s*yerden|devam\s*ed", text):
            return SafetyDirective(
                must_stop_machine=False,
                refuse_action=True,
                text=(
                    "**Hayır, yeni bıçağı aynı kesiğe sokmayın.** Kırılan dişler kesik "
                    "içinde kalır; yeni bıçak bu sert parçalara çarptığı anda dişlerini "
                    "kaybeder, çoğu zaman ilk saniyelerde kopar.\n\n"
                    "Yapılması gereken: kesiği ve talaşı temizleyin, kırık diş "
                    "parçalarını çıkarın, ardından **yeni bir yerden kesime başlayın**. "
                    "Yarım kalan kesiği tamamlamak gerekiyorsa parçayı çevirip temiz "
                    "bir yüzeyden girin."
                ),
            )

        # SAFE-004: soğutma oranını göz kararı ayarlamak
        if re.search(r"sogutma|emulsiyon|kesme\s*sivi", text) and \
           re.search(r"goz\s*karar|tahmini|yaklasik\s*ayarla|olcmeden", text):
            return SafetyDirective(
                text=(
                    "Karışım oranını göz kararı ayarlamayın. Oran düşükse bıçak erken "
                    "körelir, yüksekse köpük ve talaş yapışması başlar.\n\n"
                    "**Refraktometre** ile ölçün. Doğru yüzde, kullandığınız soğutma "
                    "sıvısının teknik veri sayfasında (TDS) ve makine kılavuzunda "
                    "yazar; ürüne göre değiştiği için burada tek bir oran veremem."
                ),
            )
        return None

    # ------------------------------------------------------------------ #

    def diagnose(self, message: str) -> Diagnosis:
        """Mesajdaki semptomu tanı ve nedenleri sırala."""
        text = strip_accents(message or "").lower()

        symptom_id = None
        for candidate, pattern in _SYMPTOM_PATTERNS:
            if re.search(pattern, text):
                symptom_id = candidate
                break

        if symptom_id is None:
            if re.search(_VIBRATION, text):
                symptom_id = "wandering_or_wavy_cut"
            elif re.search(_SLOW_CUT, text):
                symptom_id = "premature_tooth_wear"

        if symptom_id is None:
            return Diagnosis()

        entry = self.kb.troubleshooting_by_id.get(symptom_id)
        if not entry:
            return Diagnosis()

        causes = sorted(entry.get("causes_and_actions", []),
                        key=lambda c: int(c.get("order", 99)))

        if symptom_id in _NEEDS_BASELINE:
            # Tabloda zaten geçen kontrolü tekrar etme; yalnızca eksikleri ekle.
            existing = " ".join(
                strip_accents(c.get("cause_tr", "")).lower() for c in causes)
            extra = [
                {k: v for k, v in check.items() if k != "dedup_key"}
                for check in _BASELINE_CHECKS
                if not re.search(check["dedup_key"], existing)
            ]
            causes = extra + causes

        return Diagnosis(
            symptom_id=symptom_id,
            symptom_tr=entry.get("symptom_tr"),
            causes=causes[: self.MAX_CAUSES],
            source=entry.get("source"),
            context_questions=[
                "Hangi malzemeyi, hangi kesitte kesiyorsunuz?",
                "Bıçak ölçüsü ve diş adımı nedir?",
                "Sorun yeni bıçakta mı başladı, yoksa bir süre sonra mı?",
            ],
        )
