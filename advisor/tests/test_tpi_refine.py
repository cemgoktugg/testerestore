# -*- coding: utf-8 -*-
"""
Dolu malzeme diş adımı: Starrett çizelgesi (ürün sayfasıyla aynı) + bıçakta
gerçekten satılan dişlere oturtma (llm/tpi_refine.py). OpenAI'ye istek atılmaz.
"""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("OPENAI_API_KEY", "sk-test-offline")

import pytest

from llm import tpi_refine as T
from llm.answer_mapper import MappingResult
from llm.conversational_engine import ConversationalSession
from llm.dialog_manager import DialogManager
from rules_engine.engine import RulesEngine

RULES = os.path.join(os.path.dirname(__file__), "..", "rules.json")
BM_27 = T.FALLBACK_TREE["bi-metal"]["27"]["0.9"]


def _engine(**fields):
    e = RulesEngine(RULES)
    base = dict(material_category="METAL", metal_family="CARBON_STEEL", metal_part_type="SOLID",
                solid_max_diameter_bucket="D2", blade_width_mm=27, blade_thickness_mm=0.9,
                blade_length_mm=3505, coolant="YES")
    base.update(fields)
    for k, v in base.items():
        if v is not None:
            e.update_state(k, v)
    e.execute_rules()
    return e


# --------------------------------------------------------------------------- #
# Çizelge ve oturtma
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("d,tpi", [(15, "10/14"), (30, "6/10"), (40, "6/9"), (60, "5/8"),
                                   (75, "4/6"), (120, "3/4"), (150, "2/3"), (250, "1.4/1.8")])
def test_starrett_pick_matches_product_page(d, tpi):
    assert T.starrett_solid_tpi(d)[0] == tpi


def test_starrett_out_of_range_is_approx():
    assert T.starrett_solid_tpi(700) == ("0.7/0.9", True)


def test_snap_prefers_variable_pitch_and_coarser_on_solid():
    assert T.snap_to_available("6/9", BM_27, prefer_coarse=True) == "5/8"   # 8 (sabit) değil
    assert T.snap_to_available("6/10", ["10/14", "8/12", "6/10"], prefer_coarse=True) == "6/10"
    assert T.snap_to_available("1.4/1.8", BM_27, prefer_coarse=True) == "2/3"
    assert T.snap_to_available("10", ["10/14", "8", "14"], prefer_coarse=True) == "8"


@pytest.mark.parametrize("msg,expecting,val", [
    ("40 mm mil", False, 40), ("Ø 40", False, 40), ("çapı 40 mm", False, 40),
    ("40'lık dolu paslanmaz", False, 40), ("40 mm çapında transmisyon mili", False, 40),
    ("40", True, 40), ("yaklaşık 120 mm", True, 120),
    ("40", False, None), ("27x0.9 bıçak 2750 mm", False, None), ("60x60 profil", False, None),
    ("25 - 50 mm", True, None),
])
def test_parse_solid_diameter(msg, expecting, val):
    assert T.parse_solid_diameter(msg, expecting=expecting) == val


# --------------------------------------------------------------------------- #
# Motor sonrası inceltme
# --------------------------------------------------------------------------- #

def test_40mm_on_27x09_becomes_sold_5_8_and_sku_follows():
    e = _engine()
    assert e.get_state()["tooth_pitch"] == "6/10"           # kova değeri: 27×0,9'da satılmıyor
    s = SimpleNamespace(solid_diameter_mm=40.0)
    T.refine(e, s, None)
    st = e.get_state()
    assert st["tooth_pitch"] == "5/8"
    assert st["sku"] == "27-0.90-5/8-3505"
    # Kurallar yeniden çalışınca kova değerine döner; inceltme idempotent
    e.execute_rules()
    T.refine(e, s, None)
    st = e.get_state()
    assert st["tooth_pitch"] == "5/8" and st["sku"] == "27-0.90-5/8-3505"
    assert len(st["warnings"]) == len(set(st["warnings"]))


def test_without_blade_size_snaps_to_family_pitches():
    e = _engine(blade_width_mm=None, blade_thickness_mm=None, blade_length_mm=None)
    T.refine(e, SimpleNamespace(solid_diameter_mm=40.0), None)
    assert e.get_state()["tooth_pitch"] == "6/10"           # 6/9 hiç satılmıyor


def test_live_tree_wins_over_snapshot():
    tree = {"bi-metal": {"27": {"0.9": ["4/6", "6/10"]}}}
    e = _engine()
    T.refine(e, SimpleNamespace(solid_diameter_mm=40.0), tree)
    assert e.get_state()["tooth_pitch"] == "6/10"


def test_bucket_change_invalidates_old_diameter():
    e = _engine(solid_max_diameter_bucket="D4")             # müşteri sonra 100–200 seçti
    T.refine(e, SimpleNamespace(solid_diameter_mm=40.0), None)
    assert e.get_state()["tooth_pitch"] == "2/3"


def test_unknown_diameter_warning_names_final_pitch():
    e = _engine(solid_max_diameter_bucket="UNKNOWN")
    T.refine(e, SimpleNamespace(), None)
    st = e.get_state()
    assert st["tooth_pitch"] == "5/8"
    assert any("(5/8)" in w for w in st["warnings"])
    assert not any("(6/10)" in w for w in st["warnings"])


def test_far_from_chart_adds_note():
    e = _engine(solid_max_diameter_bucket="D5")
    T.refine(e, SimpleNamespace(solid_diameter_mm=300.0), None)
    st = e.get_state()
    assert st["tooth_pitch"] == "2/3"
    assert any(w.startswith("Çizelgeye göre ideal diş adımı 1,4/1,8 TPI; 27×0,9 mm") for w in st["warnings"])


def test_profile_is_snapped_but_not_chart_refined():
    e = _engine(metal_part_type="PROFILE", solid_max_diameter_bucket=None,
                profile_wall_thickness_bucket="T4")
    before = e.get_state()["tooth_pitch"]
    T.refine(e, SimpleNamespace(solid_diameter_mm=40.0), None)
    after = e.get_state()["tooth_pitch"]
    assert after in BM_27
    if before in BM_27:
        assert after == before


# --------------------------------------------------------------------------- #
# DialogManager entegrasyonu (eşleştirici sahte)
# --------------------------------------------------------------------------- #

class _Store:
    enabled = True

    def price_options(self):
        return T.FALLBACK_TREE


def _dm(values):
    dm = DialogManager(openai_client=None, api_key="sk-test-offline", store=_Store())
    dm.mapper.map_answer = lambda **kw: MappingResult(values=dict(values))
    dm._llm = lambda *a, **k: ""
    return dm


def test_dialog_manager_uses_typed_diameter_even_if_llm_missed_bucket():
    e = _engine(solid_max_diameter_bucket=None, machine_model="UNKNOWN")
    session = ConversationalSession("t1", e)
    assert e.get_next_question().id == "Q_SOLID_MAX_DIAMETER"
    res = _dm({}).handle(session, "40")
    assert session.solid_diameter_mm == 40.0
    assert res["state"]["solid_max_diameter_bucket"] == "D2"
    assert res["state"]["tooth_pitch"] == "5/8"
    assert res["state"]["sku"] == "27-0.90-5/8-3505"


def test_dialog_manager_number_overrides_wrong_llm_bucket():
    e = _engine(solid_max_diameter_bucket=None)
    session = ConversationalSession("t2", e)
    res = _dm({"solid_max_diameter_bucket": "D4"}).handle(session, "40 mm mil")
    assert res["state"]["solid_max_diameter_bucket"] == "D2"
    assert res["state"]["tooth_pitch"] == "5/8"
