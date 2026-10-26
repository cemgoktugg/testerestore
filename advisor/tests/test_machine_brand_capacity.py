# -*- coding: utf-8 -*-
"""
Marka alias'ları, kapasite sınıfı eşleştirmesi ve makine verisi hijyeni.

Canlı test hataları:
  - "Bimak 270" bulunamadı. Bimak adında şerit testere üreticisi yok;
    müşteri Beka-Mak (BEKAMAK) kastediyor — BMSY 270DG = 3160x27x0,9.
  - "Kesmak 250" çözülemedi. Türk üreticilerinde model numarası kesme
    kapasitesidir; "250" tek bir makine değil: KMY 280 (□250 keser,
    3660x27x0,9), KMM 2DG 260 (3040), KMM DG 230 (2570), KDS 250*500*3000
    (5560x41x1,3). Doğru davranış tahmin değil, adayları ölçüleriyle sormak.

Kural: yalnızca tam/tek anlamlı eşleşme bıçak ölçüsü verir; belirsizse
aday listesi döner. OpenAI'ye istek atılmaz.
"""
import importlib.util
import json
import os
import sys
from collections import Counter
from pathlib import Path

import pytest

ADVISOR_ROOT = Path(__file__).resolve().parent.parent
DATA = ADVISOR_ROOT / "data"
sys.path.insert(0, str(ADVISOR_ROOT))
os.environ.setdefault("OPENAI_API_KEY", "sk-test-offline")

# rules_engine/__init__.py pydantic çekiyor; arama motoru doğrudan yüklenir.
_spec = importlib.util.spec_from_file_location(
    "machine_database_brand", ADVISOR_ROOT / "rules_engine" / "machine_database.py"
)
machine_database = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(machine_database)


@pytest.fixture(scope="module")
def db():
    return machine_database.AdvancedMachineDatabase(
        db_path=str(DATA / "machines_list.json"))


def _sizes(result):
    return {(c["manufacturer"], c["model"]):
            (c["blade_length_mm"], c["blade_width_mm"], c["blade_thickness_mm"])
            for c in result["candidates"]}


# --------------------------------------------------------------------------- #
# "Bimak 270" — belirsiz alias, adaylarla sor
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("query", [
    "Bimak 270",
    "bimak 270 makinem var",
    "Bimak makina 270 için şerit",
])
def test_bimak_270_returns_bekamak_candidates(db, query):
    r = db.search_detailed(query)
    assert r["status"] == "ambiguous" and r["machine"] is None
    assert r["manufacturer"] == "BEKAMAK"
    assert "Beka-Mak" in r["brand_note"]
    sizes = _sizes(r)
    assert sizes[("BEKAMAK", "BMSY 270DG")] == (3160, 27.0, 0.9)
    # İkinci olası makine (notlar): Dispa M-Y 270 = 3120x27x0,9
    assert sizes[("DISPA", "M-Y 270")] == (3120, 27.0, 0.9)
    # Beka-Mak'ın 270 sınıfı listenin başında
    assert r["candidates"][0]["manufacturer"] == "BEKAMAK"
    assert "270" in r["candidates"][0]["model"]


def test_bimak_alone_recognised_but_not_claimed(db):
    r = db.search_detailed("bimak marka makinem var")
    assert r["status"] == "none" and r["manufacturer"] == "BEKAMAK"
    assert r.get("brand_note")


def test_bimak_with_exact_code_is_a_match(db):
    r = db.search_detailed("Bimak BMSY 270DG")
    assert r["status"] == "match"
    m = r["machine"]
    assert (m["manufacturer"], m["model"]) == ("BEKAMAK", "BMSY 270DG")
    assert (m["blade_length_mm"], m["blade_width_mm"], m["blade_thickness_mm"]) == (3160, 27.0, 0.9)


@pytest.mark.parametrize("query", ["Beka-Mak BMSY-270DG", "beka mak bmsy 270 dg",
                                   "BEKAMAK BMSY 270DG", "beka makina bmsy 270dg"])
def test_bekamak_exact(db, query):
    r = db.search_detailed(query)
    assert r["status"] == "match"
    assert r["machine"]["model"] == "BMSY 270DG"
    assert r["machine"]["blade_length_mm"] == 3160
    assert r["machine"].get("verified") is True
    assert "bekamak.com" in r["machine"]["source_url"]


# --------------------------------------------------------------------------- #
# "Kesmak 250" — kapasite sınıfı, sessiz tek tahmin YOK
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("query", [
    "Kesmak 250",
    "Kesmak 250 makinem var",
    "Kesmak 250 makinem var, hangi bıçağı almalıyım?",
    "kesmak makina 250",
])
def test_kesmak_250_returns_candidates(db, query):
    r = db.search_detailed(query)
    assert r["status"] == "ambiguous" and r["machine"] is None
    assert r["manufacturer"] == "KESMAK"
    assert r["match_type"] == "capacity_class"
    sizes = _sizes(r)
    assert sizes[("KESMAK", "KMY 280")] == (3660, 27.0, 0.9)        # □250 keser
    assert sizes[("KESMAK", "KMM 2DG 260")] == (3040, 27.0, 0.9)
    assert sizes[("KESMAK", "KMM DG 230")] == (2570, 27.0, 0.9)
    assert sizes[("KESMAK", "KDS 250*500*3000")] == (5560, 41.0, 1.3)
    assert len(set(sizes.values())) >= 4


def test_kesmak_kmy_280_exact(db):
    r = db.search_detailed("Kesmak KMY 280")
    assert r["status"] == "match"
    m = r["machine"]
    assert m["model"] == "KMY 280"
    assert (m["blade_length_mm"], m["blade_width_mm"], m["blade_thickness_mm"]) == (3660, 27.0, 0.9)
    assert m["capacity_square_mm"] == 250 and m["verification_status"] == "oem"


def test_unique_capacity_class_is_still_exact(db):
    # Aynı numaralı tüm modeller aynı bıçağı kullanıyorsa sormaya gerek yok
    r = db.search_detailed("uzay 320")
    assert r["status"] == "match" and r["machine"]["blade_length_mm"] == 4160


def test_secondary_number_only_is_not_claimed(db):
    # 500, KDS 250*500*3000'in ikincil ölçüsü: tek aday bile tahmindir
    r = db.search_detailed("Kesmak 500")
    assert r["status"] == "ambiguous" and r["machine"] is None


def test_material_size_is_not_a_model_number(db):
    r = db.search_detailed("Kesmak makinem var, 300 mm boru kesiyorum")
    assert r["status"] == "none" and r["manufacturer"] == "KESMAK"


def test_generic_word_brand_not_recognised(db):
    r = db.search_detailed("kamu ihalesi için 300 adet bıçak")
    assert r["status"] == "none" and r["manufacturer"] is None


def test_known_conflict_is_reported_not_overwritten(db):
    r = db.search_detailed("Karmetal KMT 280 OSA")
    assert r["status"] == "match"
    m = r["machine"]
    assert m["blade_length_mm"] == 3360                    # kayıt ezilmedi
    assert m["conflict"]["alt_blade_length_mm"] == 3850    # ama çelişki taşınıyor
    assert "3850" in m["conflict"]["note"]


# --------------------------------------------------------------------------- #
# Alias dosyası
# --------------------------------------------------------------------------- #

def test_alias_targets_exist_in_database(db):
    raw = json.loads((DATA / "machine_brand_aliases.json").read_text(encoding="utf-8"))
    brands = {m["manufacturer"] for m in db.machines}
    for brand in raw["brands"]:
        assert brand in brands, brand
    for entry in raw["uncertain"]:
        for brand in entry["brands"]:
            assert brand in brands, brand
    for brand in raw["generic_word_brands"]:
        assert brand in brands, brand


def test_missing_alias_file_falls_back(tmp_path):
    fallback = machine_database.AdvancedMachineDatabase(
        db_path=str(DATA / "machines_list.json"),
        aliases_path=str(tmp_path / "yok.json"),
    )
    # Gömülü asgari liste çalışır ("uzay" -> UZAY MAKINA) ...
    assert fallback.search_detailed("uzay 320")["status"] == "match"
    # ... dosyadaki tahmin alias'ı ise yoktur
    assert fallback.search_detailed("Bimak 270")["manufacturer"] is None


# --------------------------------------------------------------------------- #
# Veri hijyeni
# --------------------------------------------------------------------------- #

def _load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def test_flat_list_hygiene():
    flat = _load("machines_list.json")
    machines = flat["machines"]
    assert flat["total_machines"] == len(machines)
    rows = Counter(json.dumps(m, sort_keys=True, ensure_ascii=False) for m in machines)
    assert [r for r, n in rows.items() if n > 1] == []          # birebir kopya yok
    assert not any(m["manufacturer"] == "TEST" for m in machines)
    for m in machines:
        if m.get("verified"):
            assert m["source_url"].startswith("https://"), m["display_name"]
            assert m["verification_status"], m["display_name"]
    # Kaynağıyla çelişen ya da doğrulanamayan kayıtlar işaretli
    flagged = {(m["manufacturer"], m["model"]) for m in machines if m.get("conflict")}
    assert ("KARMETAL", "KMT 280 OSA") in flagged
    assert ("KASTO", "BBS 1860/1560 (100x2)") in flagged
    assert ("UZAY MAKINA", "UMSY-O 330") in flagged


def test_nested_copy_matches_flat_list():
    flat = _load("machines_list.json")["machines"]
    nested = _load("machines_database.json")["manufacturers"]

    def key(brand, m):
        return (brand, json.dumps({k: v for k, v in m.items()
                                   if k not in ("display_name", "manufacturer")},
                                  sort_keys=True, ensure_ascii=False))

    a = sorted(key(m["manufacturer"], m) for m in flat)
    b = sorted(key(brand, m) for brand, block in nested.items() for m in block["machines"])
    assert a == b


# --------------------------------------------------------------------------- #
# Diyalog: adaylar bıçak ölçüsüne göre gruplanıp sorulur
# --------------------------------------------------------------------------- #

@pytest.fixture(scope="module")
def dialog(db):
    from llm.answer_mapper import AnswerMapper
    from llm.dialog_manager import DialogManager
    from rules_engine.engine import RulesEngine

    engine = RulesEngine(str(ADVISOR_ROOT / "rules.json"))
    dm = DialogManager(openai_client=None, api_key="sk-test-offline", machine_db=db)
    mapper = AnswerMapper(api_key="sk-test-offline", machine_db=db)

    def render(machine_text):
        # LLM'in çıkardığı alanı taklit et: sonrası tamamen deterministik
        mapping = mapper._validate({"machine_model": machine_text},
                                   engine.config.questions, machine_text)
        return mapping, dm._render_question(machine_text, mapping, None, None)

    return render


def test_dialog_bimak_270(dialog):
    mapping, text = dialog("Bimak 270")
    assert mapping.machine_found is None and mapping.machine_candidates
    assert "Beka-Mak" in text
    assert "**3160 × 27 × 0.9 mm**" in text and "BMSY 270DG" in text
    assert "**3120 × 27 × 0.9 mm**" in text and "DISPA M-Y 270" in text
    assert "bulundu" not in text


def test_dialog_kesmak_250(dialog):
    mapping, text = dialog("Kesmak 250")
    assert mapping.machine_found is None
    assert "kesme kapasitesini" in text
    for size in ("3660 × 27 × 0.9", "3040 × 27 × 0.9", "2570 × 27 × 0.9", "5560 × 41 × 1.3"):
        assert size in text, size
    assert "bulundu" not in text


def test_dialog_found_machine_with_conflict_warns(dialog):
    mapping, text = dialog("Karmetal KMT 280 OSA")
    assert mapping.machine_found["model"] == "KMT 280 OSA"
    assert "bulundu" in text and "3850" in text
