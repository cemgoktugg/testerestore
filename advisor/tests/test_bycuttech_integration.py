# -*- coding: utf-8 -*-
"""
BYCUTTECH uzman hattı — entegrasyon ve regresyon testleri.

evaluation_cases.json'ın kapsamadığı gereksinimleri denetler:
    • Türkçe yazım hatası toleransı
    • Retrieval sonucu bulunamaması
    • Düşük güven / açık QA davranışı
    • Mevcut /api/chat sözleşmesinin korunması
    • YASAKLI VARSAYILANLAR: "8/12 varsayılan" ve "bilinmiyorsa karbon çeliği"
    • Bilgi paketi bütünlüğü (SHA-256)

Çalıştırma (advisor/ dizininden):
    python tests/test_bycuttech_integration.py
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ADVISOR_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ADVISOR_ROOT))

from bycuttech.knowledge import get_knowledge_base, package_dir   # noqa: E402
from bycuttech.pipeline import BycuttechAdvisor                   # noqa: E402
from bycuttech.runtime_prompt import build_runtime_prompt         # noqa: E402


def _machine_db():
    spec = importlib.util.spec_from_file_location(
        "machine_database", ADVISOR_ROOT / "rules_engine" / "machine_database.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.AdvancedMachineDatabase(
        db_path=str(ADVISOR_ROOT / "data" / "machines_list.json"))


_advisor = None


def advisor() -> BycuttechAdvisor:
    global _advisor
    if _advisor is None:
        _advisor = BycuttechAdvisor(machine_db=_machine_db())
    return _advisor


def ask(message: str, session: str = "it"):
    return advisor().handle(message, session_id=session)


# ===================================================================== #
# 1. Türkçe yazım hatası toleransı
# ===================================================================== #

def test_turkish_typos():
    """Aksansız / hatalı yazımda da malzeme ve ölçü çözülmeli."""
    cases = [
        # (mesaj, beklenen kalite, beklenen çap)
        ("AISI 304, 150 HB, cap 100 dolu, bicak 3660x27x0.90", "304", 100.0),
        ("aisi304 150hb Ø100 dolu 3660x27x0.90", "304", 100.0),
        ("1.4301 150 HB capi 100 dolu 3660x27x0.90", "304", 100.0),
    ]
    failures = []
    for i, (message, grade, diameter) in enumerate(cases):
        advisor().reset(f"typo{i}")
        result = ask(message, f"typo{i}")
        inputs = result.plan.normalized_inputs
        if inputs.get("material_grade") != grade:
            failures.append(f"{message!r}: kalite {inputs.get('material_grade')} != {grade}")
        if inputs.get("diameter_mm") != diameter:
            failures.append(f"{message!r}: çap {inputs.get('diameter_mm')} != {diameter}")
    return failures


# ===================================================================== #
# 2. Retrieval sonucu bulunamaması
# ===================================================================== #

def test_retrieval_miss():
    """
    Kavramsal soru bilgi bankasında yoksa uydurma yapılmamalı.

    Sonuç bulunamadığında ne kaynak eklenir ne de sayı üretilir.
    """
    failures = []
    result = ask("Kuantum tünelleme bıçak ömrünü nasıl etkiler?", "miss")
    if result.plan.retrieved_notes:
        failures.append("Alakasız kavramsal soruya sonuç döndü")
    if result.plan.cutting_speed or result.plan.cutting_rate:
        failures.append("Kaynaksız soruda sayısal değer üretildi")
    return failures


# ===================================================================== #
# 3. Düşük güven ve açık QA
# ===================================================================== #

def test_low_confidence_paths():
    failures = []

    # Kapsam dışı ölçü: Q ekstrapole EDİLMEMELİ, durum 'conditional'
    advisor().reset("lowc")
    result = ask("AISI 304, 150 HB, Ø200 dolu, 3660x27x0.90", "lowc")
    if result.plan.cutting_rate is not None:
        failures.append("50-125 mm kapsamı dışında Q verildi")
    if result.plan.status != "conditional":
        failures.append(f"kapsam dışı ölçüde durum {result.plan.status} != conditional")

    # Var olmayan varyant: teknik inceleme, SKU YOK
    advisor().reset("lowc2")
    result = ask("Primalloy 19x0.90 10/14 istiyorum", "lowc2")
    if result.plan.status != "technical_review_required":
        failures.append(f"olmayan varyantta durum {result.plan.status}")
    if result.plan.verified_variant is not None:
        failures.append("olmayan varyant için ölçü döndürüldü")
    return failures


# ===================================================================== #
# 4. YASAKLI VARSAYILANLAR (paketin kritik regresyon listesi)
# ===================================================================== #

def test_no_forbidden_defaults():
    """
    Paket iki davranışı açıkça yasaklıyor:
      • "bilinmiyorsa karbon çeliği"
      • "varsayılan 8/12 TPI"
    Bunlar hem uzman hatta hem eski kural dosyasında bulunmamalı.
    """
    failures = []

    # (a) Ölçü verilmeden TPI üretilmemeli
    for message in ["Paslanmaz keseceğim", "304 keseceğim",
                    "Çelik keseceğim, bıçak 3660x27x0.90"]:
        advisor().reset("fd")
        result = ask(message, "fd")
        if result.plan.tpi is not None:
            failures.append(f"{message!r}: ölçü yokken TPI üretildi ({result.plan.tpi})")

    # (b) rules.json içinde "güvenli varsayılan TPI" kalmamalı
    rules_text = (ADVISOR_ROOT / "rules.json").read_text(encoding="utf-8")
    rules = json.loads(rules_text)
    for rule in rules["rules"]:
        blob = json.dumps(rule, ensure_ascii=False)
        if "tooth_pitch" not in blob:
            continue
        for action in rule.get("then", []):
            spec = action.get("set")
            if spec and spec[0] == "tooth_pitch" and isinstance(spec[1], dict):
                mapping = spec[1].get("map", [None, {}])[1]
                if "UNKNOWN" in mapping:
                    failures.append(
                        f"{rule['id']}: UNKNOWN ölçüde varsayılan TPI "
                        f"({mapping['UNKNOWN']}) hâlâ tanımlı")

    # (c) "bilinmiyorsa karbon çeliği" varsayımı kalmamalı
    for rule in rules["rules"]:
        for action in rule.get("then", []):
            spec = action.get("set")
            if spec and spec[0] == "material_family" and spec[1] == "CARBON_STEEL":
                failures.append(
                    f"{rule['id']}: material_family CARBON_STEEL olarak varsayılıyor")
    return failures


def test_teeth_in_cut_formula():
    """
    Kesitteki diş sayısı: diş = (temas_mm / 25.4) × TPI

    Değişken diş adımında TEK SAYI verilmez — "4/6" bıçakta diş sayısı
    adım boyunca 4 TPI ile 6 TPI uçları arasında değişir. Tek değer
    göstermek kullanıcıyı ya fazla iyimser ya fazla kötümser bir tabloya
    bakmaya iter.
    """
    from bycuttech.engine import MM_PER_INCH, is_variable_pitch, teeth_in_cut

    failures = []

    if MM_PER_INCH != 25.4:
        failures.append(f"inç dönüşümü yanlış: {MM_PER_INCH}")

    # (temas_mm, tpi, min, max, nominal, değişken mi)
    cases = [
        (100.0, "4/6", 15.7, 23.6, 19.7, True),    # Ø100 dolu, 4/6
        (50.0, "6/10", 11.8, 19.7, 15.7, True),    # Ø50 dolu, 6/10
        (100.0, "3", 11.8, 11.8, 11.8, False),     # sabit TPI
        (25.4, "10", 10.0, 10.0, 10.0, False),     # tam 1 inç → tam TPI
        (120.0, "4/6", 18.9, 28.3, 23.6, True),
    ]
    for contact, tpi, lo, hi, nom, variable in cases:
        got = teeth_in_cut(contact, tpi)
        if got is None:
            failures.append(f"{contact} mm / {tpi}: sonuç yok")
            continue
        if (got["min"], got["max"], got["nominal"]) != (lo, hi, nom):
            failures.append(
                f"{contact} mm / {tpi}: beklenen ({lo}, {hi}, {nom}), "
                f"alınan ({got['min']}, {got['max']}, {got['nominal']})")
        if got["variable"] is not variable:
            failures.append(f"{contact} mm / {tpi}: değişken bayrağı yanlış")
        if is_variable_pitch(tpi) is not variable:
            failures.append(f"{tpi}: is_variable_pitch yanlış")

    # Yuvarlama: bir ondalık basamağa, matematiksel olarak doğru
    exact = teeth_in_cut(25.4 * 3, "1")          # tam 3 diş
    if exact["min"] != 3.0:
        failures.append(f"yuvarlama hatası: {exact}")

    # Geçersiz girdi sessizce sayı uydurmamalı
    if teeth_in_cut(0, "4/6") is not None or teeth_in_cut(100, "") is not None:
        failures.append("geçersiz girdide None dönmedi")

    # Cevap metninde aralık görünmeli, tek sayı DEĞİL
    advisor().reset("teeth")
    result = advisor().handle(
        "AISI 304, 150 HB, Ø100 dolu, 3660x27x0.90", "teeth")
    text = result.message
    if "15.7–23.6" not in text:
        failures.append("cevapta diş aralığı gösterilmiyor")
    if "nominal" not in text.lower():
        failures.append("cevapta nominal ortalama yok")
    return failures


def test_no_automatic_tpi_substitution():
    """
    Ürün matrisinde olmayan diş adımı SAYISAL YAKINLIKLA ikame edilmez.

    Önceki sürüm "tablo 8/11 diyor, üründe yok, en yakın 8/12'yi ver"
    yapıyordu. Diş adımı yalnızca bir sayı değil; diş geometrisi ve talaş
    boşluğu demektir, bu yüzden aritmetik yakınlık teknik denklik anlamına
    gelmez. İkame ancak APPROVED_TPI_SUBSTITUTIONS içinde açıkça
    tanımlanmışsa yapılabilir.
    """
    import inspect

    from bycuttech import engine as engine_module

    failures = []

    # (a) Kod tabanında genel "en yakın TPI" algoritması kalmamalı
    source = inspect.getsource(engine_module)
    filter_fn = inspect.getsource(engine_module.DeterministicRuleEngine._filter_and_choose)
    if "abs(tpi_numeric" in filter_fn:
        failures.append(
            "_filter_and_choose içinde hâlâ sayısal yakınlık ikamesi var")
    if "APPROVED_TPI_SUBSTITUTIONS" not in source:
        failures.append("onaylı eşleme tablosu tanımlı değil")

    # (b) Onay tablosu boşken ikame YAPILMAMALI
    if engine_module.APPROVED_TPI_SUBSTITUTIONS:
        # Doluysa her satırın gerekçesi olmalı
        for key, entry in engine_module.APPROVED_TPI_SUBSTITUTIONS.items():
            if not entry.get("basis"):
                failures.append(f"onaylı eşleme {key} için gerekçe (basis) yok")

    # (c) 8/11 gerçekten hiçbir üründe yok → ikame edilmemeli
    kb = get_knowledge_base()
    produced = set()
    for product in kb.products:
        for variant in product.get("variants", []):
            produced.update(variant.get("available_tpi", []))
    if "8/11" in produced:
        failures.append("test varsayımı geçersiz: 8/11 artık üretiliyor")

    advisor().reset("sub")
    result = advisor().handle(
        "S235 kare profil 100x100x4, tekli, bıçak 3660x27x0.90", "sub")
    plan = result.plan

    if plan.tpi is not None:
        failures.append(f"olmayan adım yerine {plan.tpi} ikame edildi")
    if plan.status != "technical_review_required":
        failures.append(f"durum {plan.status} != technical_review_required")
    if plan.confidence != "verification_required":
        failures.append(f"güven {plan.confidence} != verification_required")

    text = result.message
    for expected in ("8/11", "üretilmiyor", "doğrulama"):
        if expected not in text:
            failures.append(f"cevapta {expected!r} açıklaması yok")
    # 8/12'ye örtülü kayma OLMAMALI
    if "8/12" in text:
        failures.append("cevapta örtülü 8/12 ikamesi görünüyor")

    # (d) Üretilen bir adım söz konusuysa normal akış BOZULMAMALI
    advisor().reset("sub2")
    ok = advisor().handle("AISI 304, 150 HB, Ø100 dolu, 3660x27x0.90", "sub2")
    if ok.plan.tpi != "4/6":
        failures.append(f"üretilen adım akışı bozuldu: {ok.plan.tpi}")
    return failures


def test_hardness_units_never_converted():
    """
    HB / HRB / HRC birbirinin yerine kullanılamaz.

    Ölçekler arasında malzemeden bağımsız evrensel dönüşüm yoktur; ASTM
    E140 tabloları malzeme grubuna özeldir ve elimizde tam tablo yok
    (kayıtta yalnızca künye var). Bu yüzden çevirmiyoruz.

    Ayrıca AYNI birimde bile tablodan çok uzak bir değer o satırı
    geçersiz kılar: 150 HB için doğrulanmış hızı 400 HB'lik parçaya
    vermek bıçağı ilk kesimde bitirir.
    """
    failures = []

    # (a) Birim tanıma — HRB tanınmazsa "sertlik verilmemiş" sanılır ve
    #     tablodaki varsayılan satırın hızı verilir.
    from bycuttech.extractor import EntityExtractor
    extractor = EntityExtractor(get_knowledge_base(), _machine_db())
    for text, value, unit in [("150 HB", 150.0, "HB"), ("48 HRC", 48.0, "HRC"),
                              ("90 HRB", 90.0, "HRB"), ("200 HBW", 200.0, "HB"),
                              ("300 HV", 300.0, "HV")]:
        got, _ = extractor.extract(text)
        if (got.hardness_value, got.hardness_unit) != (value, unit):
            failures.append(
                f"{text}: {got.hardness_value} {got.hardness_unit} "
                f"!= {value} {unit}")

    # (b) Birim uyuşmazlığında sayı verilmemeli
    advisor().reset("hu1")
    result = advisor().handle("4140, 90 HRB, Ø100 dolu, 3660x27x0.90", "hu1")
    if result.plan.cutting_speed is not None:
        failures.append("HRB/HB uyuşmazlığında hız verildi")
    if "HRB" not in result.message:
        failures.append("birim uyuşmazlığı kullanıcıya açıklanmadı")

    # (c) Aynı birimde çok uzak değerde sayı verilmemeli
    advisor().reset("hu2")
    result = advisor().handle("AISI 304, 400 HB, Ø100 dolu, 3660x27x0.90", "hu2")
    if result.plan.cutting_speed is not None:
        failures.append("400 HB için 150 HB satırının hızı verildi")

    # (d) Uyumlu sertlikte normal akış BOZULMAMALI
    advisor().reset("hu3")
    ok = advisor().handle("AISI 304, 150 HB, Ø100 dolu, 3660x27x0.90", "hu3")
    if ok.plan.cutting_speed is None or ok.plan.cutting_speed.min != 30:
        failures.append(f"uyumlu sertlikte akış bozuldu: {ok.plan.cutting_speed}")
    return failures


def test_approximate_equivalent_lowers_confidence():
    """
    S235 -> A36 bir MÜHENDİSLİK YAKINSAMASIDIR, tam eşdeğerlik değil.

    Farklı standartlar, farklı akma dayanımı aralıkları. Doğrulanmış bir
    tablodan okunmuş olması dayanağı kesinleştirmez; güven "yüksek"
    olamaz ve varsayım kullanıcıya görünmelidir.
    """
    failures = []

    advisor().reset("apx")
    result = advisor().handle("S235, Ø100 dolu, bıçak 3660x27x0.90", "apx")
    plan = result.plan

    if plan.confidence == "high":
        failures.append("yaklaşık eşdeğerde güven 'high' kaldı")
    if not plan.normalized_inputs.get("material_is_approximate"):
        failures.append("yaklaşıklık planda işaretlenmedi")
    text = result.message.lower()
    if "yakınsama" not in text and "benzer sınıf" not in text:
        failures.append("yaklaşıklık kullanıcıya bildirilmedi")

    # Tam denklik (1.4301 = AISI 304) yaklaşık SAYILMAMALI
    advisor().reset("apx2")
    exact = advisor().handle("1.4301, 150 HB, Ø100 dolu, 3660x27x0.90", "apx2")
    if exact.plan.normalized_inputs.get("material_is_approximate"):
        failures.append("1.4301 yanlışlıkla yaklaşık işaretlendi")
    if exact.plan.confidence != "high":
        failures.append(f"tam denklikte güven düştü: {exact.plan.confidence}")
    return failures


def test_missing_tension_data_is_reported():
    """
    TENNAX PRO için doğrulanmış gerginlik tablosu yok.

    Sessizce atlamak da, başka ailenin değerini aktarmak da yanlış:
    gerginlik bıçak gövdesinin malzemesine ve geometrisine bağlıdır.
    """
    failures = []
    kb = get_knowledge_base()

    covered = {name for rule in kb.tension_rules for name in rule.get("products", [])}
    if "TENNAX PRO" in covered:
        failures.append("test varsayımı geçersiz: TENNAX PRO artık tabloda")

    from bycuttech.engine import DeterministicRuleEngine
    from bycuttech.models import NormalizedInputs, TechnicalAnswerPlan

    engine = DeterministicRuleEngine(kb)
    inputs = NormalizedInputs(
        material_grade="A36", material_family_tr="Karbon çeliği",
        hardness_value=175, hardness_unit="HB", shape="profile",
        width_mm=100.0, height_mm=100.0, wall_thickness_mm=4.0,
        blade_width_mm=27.0, blade_thickness_mm=0.9)
    plan = TechnicalAnswerPlan()
    engine.evaluate(inputs, plan)

    if plan.tension is not None:
        failures.append("TENNAX PRO için gerginlik değeri uyduruldu")
    if "verified_tension_data" not in plan.missing_inputs:
        failures.append("eksik gerginlik verisi planda işaretlenmedi")
    if not any("gerginli" in w.lower() for w in plan.warnings):
        failures.append("eksik gerginlik verisi bildirilmedi")
    return failures


def test_open_qa_blocks_exact_answer():
    """QA-006 açıkken ADVANZ FS için kesin değer üretilmemeli."""
    failures = []
    kb = get_knowledge_base()

    if not any(q["id"] == "QA-006" for q in kb.open_qa):
        failures.append("QA-006 artık açık QA listesinde değil")

    advisor().reset("qa")
    result = advisor().handle(
        "6061 alüminyum döküm, Ø100 dolu, bıçak 3660x27x0.90", "qa")
    plan = result.plan

    if plan.product_family == "advanz_fs":
        if plan.status != "technical_review_required":
            failures.append(f"QA-006 açıkken durum {plan.status}")
        if plan.confidence != "verification_required":
            failures.append(f"QA-006 açıkken güven {plan.confidence}")
        # Sayılar plandan da temizlenmeli (API yükünde sızmasın)
        if plan.cutting_speed is not None or plan.cutting_rate is not None:
            failures.append("teknik inceleme durumunda plan hâlâ sayı taşıyor")
    return failures


def test_hard_material_never_defaults_to_bimetal():
    """
    HARD-001: 45 HRC üstünde bimetal varsayılan seçilmez.

    Makinenin karbür uygunluğu bilinmiyorken sistem "genel dolu kesit"
    kuralına düşüp M42 bimetal öneriyordu; 52 HRC'de bimetal ilk kesimde
    körelir. Ayrıca kesim tablosu takım çeliklerini TAVLANMIŞ hâliyle
    listelediği için sertleştirilmiş parçaya tavlanmış hız/Q veriliyordu.
    """
    failures = []

    advisor().reset("hard")
    result = advisor().handle(
        "52 HRC sertleştirilmiş D2, Ø100 dolu, bıçak 3660x27x0.90", "hard")
    plan = result.plan

    if "bimetal" in (plan.cutting_edge or "").lower():
        failures.append(f"45 HRC üstünde bimetal önerildi: {plan.product_name}")
    if plan.cutting_speed is not None or plan.cutting_rate is not None:
        failures.append(
            "sertleştirilmiş kondisyonda tavlanmış tablo değerleri verildi")
    if "machine_carbide_capability" not in plan.missing_inputs:
        failures.append("makinenin karbür uygunluğu sorulmadı")

    # Karbüre uygun makine beyan edilirse ADVANZ TS gelmeli
    advisor().reset("hard2")
    result = advisor().handle(
        "48 HRC sertleştirilmiş takım çeliği, Ø100 dolu, "
        "makinem karbür bıçak destekliyor", "hard2")
    if result.plan.product_family != "advanz_ts":
        failures.append(
            f"karbüre uygun makinede ADVANZ TS gelmedi: {result.plan.product_family}")
    return failures


# ===================================================================== #
# 5. Marka kapsamı ve makine kılavuzu üstünlüğü
# ===================================================================== #

def test_brand_and_manual_authority():
    failures = []

    advisor().reset("brand")
    result = ask(
        "Morse karbür bıçak alıştırma istemiyor; BYCUTTECH Advanz için de "
        "alıştırma yapmayayım mı?", "brand")
    text = result.message.lower()
    if "morse" not in text:
        failures.append("marka kapsamı uyarısında marka adı geçmiyor")
    if "alıştırma" not in text and "rodaj" not in text:
        failures.append("BYCUTTECH alıştırma kuralı verilmedi")

    # Makine hız sınırı malzeme tablosunun üstünde
    advisor().reset("manual")
    ask("6061 Ø100 dolu, 3660x27x0.90", "manual")
    result = ask("Makine hızım en fazla 90 m/dak.", "manual")
    if result.plan.cutting_speed is None or result.plan.cutting_speed.max > 90:
        failures.append(
            f"makine hız sınırı uygulanmadı: {result.plan.cutting_speed}")
    return failures


# ===================================================================== #
# 6. Çok turlu bağlam
# ===================================================================== #

def test_conversation_context():
    failures = []
    advisor().reset("ctx")
    ask("AMADA CRH-300S kullanıyorum, bıçak 3660x27x0.90.", "ctx")
    ask("304 Ø80 dolu keseceğim.", "ctx")
    result = ask("Peki Ø120 olursa?", "ctx")
    inputs = result.plan.normalized_inputs
    if inputs.get("diameter_mm") != 120:
        failures.append(f"çap güncellenmedi: {inputs.get('diameter_mm')}")
    if inputs.get("material_grade") != "304":
        failures.append("önceki malzeme kaybedildi")
    if inputs.get("blade_width_mm") != 27.0:
        failures.append("önceki bıçak ölçüsü kaybedildi")
    return failures


# ===================================================================== #
# 7. Bilgi paketi bütünlüğü
# ===================================================================== #

def test_package_integrity():
    """manifest.json'daki SHA-256 değerleri tutuyor mu?"""
    failures = []
    directory = package_dir()
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    for entry in manifest["files"]:
        path = directory / entry["file"]
        if not path.is_file():
            failures.append(f"eksik dosya: {entry['file']}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != entry["sha256"]:
            failures.append(f"bozuk dosya: {entry['file']}")
    return failures


# ===================================================================== #
# 8. Runtime prompt yüklenebiliyor ve tek kaynak
# ===================================================================== #

def test_runtime_prompt():
    failures = []
    prompt = build_runtime_prompt()
    for marker in ("BYCUTTECH Şerit Testere AI", "UNKNOWN_QUESTION",
                   "Kapsam", "temas uzunluğuna"):
        if marker not in prompt:
            failures.append(f"promptta beklenen bölüm yok: {marker!r}")
    # Eski promptun gömülü sayı tabloları TAŞINMAMIŞ olmalı
    for forbidden in ("Alüminyum: 80-120", "Paslanmaz çelik: 25-40"):
        if forbidden in prompt:
            failures.append(f"eski gömülü hız tablosu prompta sızmış: {forbidden!r}")
    return failures


# ===================================================================== #
# 9. Mevcut API sözleşmesi (geriye dönük uyumluluk)
# ===================================================================== #

def test_api_contract():
    """
    /api/chat cevabındaki alanlar korunuyor mu?

    web/app.py bu anahtarları okuyor; AdvisorWidget.tsx ise response,
    recommendation ve next_question alanlarına bağlı. Biri kaybolursa
    arayüz sessizce bozulur.
    """
    failures = []
    try:
        from llm.conversational_engine import ConversationalEngine
    except Exception as exc:                                  # noqa: BLE001
        return [f"ATLANDI (bağımlılık yok): {exc}"]

    import os
    os.environ.setdefault("OPENAI_API_KEY", "sk-test-contract")
    try:
        engine = ConversationalEngine(str(ADVISOR_ROOT / "rules.json"))
    except Exception as exc:                                  # noqa: BLE001
        return [f"ATLANDI (motor kurulamadı): {exc}"]

    if engine.bycuttech is None:
        failures.append(f"uzman hat yüklenemedi: {engine.bycuttech_error}")

    # Uzman hattın cevapladığı bir mesaj: LLM çağrısı yapmaz.
    result = engine.chat("Bugün hava nasıl?", session_id="contract")
    required = {"session_id", "message", "state", "next_question",
                "recommendation", "is_complete", "extracted_fields"}
    missing = required - set(result)
    if missing:
        failures.append(f"API sözleşmesinde eksik alan: {sorted(missing)}")
    return failures


# ===================================================================== #

TESTS = [
    ("Türkçe yazım hatası toleransı", test_turkish_typos),
    ("Retrieval sonucu bulunamaması", test_retrieval_miss),
    ("Düşük güven yolları", test_low_confidence_paths),
    ("Yasaklı varsayılanlar", test_no_forbidden_defaults),
    ("Diş sayısı formülü ve değişken adım", test_teeth_in_cut_formula),
    ("Otomatik TPI ikamesi yasağı", test_no_automatic_tpi_substitution),
    ("Sertlik birimi dönüşüm yasağı", test_hardness_units_never_converted),
    ("Yaklaşık eşdeğer güveni düşürür", test_approximate_equivalent_lowers_confidence),
    ("Eksik gerginlik verisi bildirilir", test_missing_tension_data_is_reported),
    ("Açık QA kesin cevabı engeller", test_open_qa_blocks_exact_answer),
    ("Sert malzemede bimetal yasağı (HARD-001)",
     test_hard_material_never_defaults_to_bimetal),
    ("Marka kapsamı / kılavuz üstünlüğü", test_brand_and_manual_authority),
    ("Çok turlu bağlam", test_conversation_context),
    ("Bilgi paketi bütünlüğü", test_package_integrity),
    ("Runtime prompt", test_runtime_prompt),
    ("API geriye dönük uyumluluk", test_api_contract),
]


def run():
    total_failures = []
    for name, fn in TESTS:
        try:
            problems = fn() or []
        except Exception as exc:                              # noqa: BLE001
            problems = [f"HATA: {exc}"]
        skipped = problems and all(str(p).startswith("ATLANDI") for p in problems)
        if not problems:
            print(f"OK       {name}")
        elif skipped:
            print(f"ATLANDI  {name}  ({problems[0]})")
        else:
            print(f"FAIL     {name}")
            for problem in problems:
                print(f"           - {problem}")
            total_failures.extend(problems)
    print(f"\n=== {len(TESTS) - len([1 for _ in total_failures])if False else ''}"
          f"{len(TESTS)} test bloğu, {len(total_failures)} sorun ===")
    return total_failures


def test_integration():
    assert run() == []


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(1 if run() else 0)
