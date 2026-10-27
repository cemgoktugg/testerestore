# -*- coding: utf-8 -*-
"""Ön masa bilgi paketleri (llm/knowledge.py) ve hunide malzeme kalitesi."""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("OPENAI_API_KEY", "sk-test-offline")

import pytest

from llm import knowledge as K
from llm.answer_mapper import MappingResult
from llm.conversational_engine import ConversationalSession
from llm.dialog_manager import DialogManager
from llm.front_desk import FrontDesk, norm
from rules_engine.engine import RulesEngine
from tests.test_front_desk import FakeStore

RULES = os.path.join(os.path.dirname(__file__), "..", "rules.json")


@pytest.fixture
def fd():
    return FrontDesk(store=FakeStore())


def ask(fd, msg):
    return fd.handle(SimpleNamespace(front_desk_pending=None), msg)


# --------------------------------------------------------------------------- #
# Malzeme kaliteleri
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("text,gid,family", [
    ("St37 profil", "s235", "CARBON_STEEL"), ("S235JR", "s235", "CARBON_STEEL"),
    ("st52 lama", "s355", "CARBON_STEEL"), ("C45 mil", "c45", "CARBON_STEEL"),
    ("ck45", "c45", "CARBON_STEEL"), ("42CrMo4", "alloy_qt", "CARBON_STEEL"),
    ("1.2379 takım çeliği", "tool_steel", "CARBON_STEEL"),
    ("1.4301", "ss_austenitic", "STAINLESS"), ("AISI 316L boru", "ss_austenitic", "STAINLESS"),
    ("304 paslanmaz", "ss_austenitic", "STAINLESS"), ("duplex 2205", "ss_duplex_ph", "STAINLESS"),
    ("6082 alüminyum", "aluminium", "ALUMINUM"), ("7075 t6", "aluminium", "ALUMINUM"),
    ("GG25 döküm", "cast_iron", "CAST_IRON"), ("sfero döküm", "cast_iron", "CAST_IRON"),
    ("pirinç çubuk", "copper_alloys", None), ("inconel 718", "special_alloys", None),
])
def test_detect_grade(text, gid, family):
    g = K.detect_grade(norm(text))
    assert g and (g.get("legacy_id") or g["id"]) == gid and g["family"] == family


@pytest.mark.parametrize("text", ["2024'te aldım", "304 mm boru", "6082 mm boy", "40 mm mil", "27x0.9 bıçak"])
def test_detect_grade_no_false_positive(text):
    assert K.detect_grade(norm(text)) is None


def test_grade_question_answered_with_group(fd):
    r = ask(fd, "St37 nedir?")
    assert r and r.kinds == ["grade"] and r.final
    assert "S235JR" in r.text and "karbon çeliği" in r.text
    assert "/rehber/celik-kalite-esdegerleri-bicak-secimi" in r.text


def test_grade_without_question_goes_to_funnel(fd):
    assert ask(fd, "C45 mil 40 mm") is None


def test_detect_grades_returns_all_in_text_order():
    assert [g["id"] for g in K.detect_grades(norm("st 52 ile st 37 farkı"))] == ["s355", "s235"]
    found = K.detect_grades(norm("AISI 316 ile AISI 304 farkı"))  # yalnız "304" ölçü olabilir
    assert [g["id"] for g in found] == ["ss316", "ss304"]
    assert {g.get("legacy_id") for g in found} == {"ss_austenitic"}
    assert K.detect_grades(norm("27x0.9 bıçak")) == []


def test_alias_grade_answer_only_for_generic_names():
    text = K.alias_grade_answer(norm("inox nedir"), lambda lbl, p: f"[{lbl}]({p})")
    assert text and "paslanmaz" in text and K.GUIDE_GRADES in text
    assert K.alias_grade_answer(norm("st37 nedir"), lambda lbl, p: p) is None
    assert K.detect_grade(norm("inox boru")) is None            # huninin kalite tespiti değişmedi


def test_funnel_sets_family_from_grade_and_says_it_once():
    e = RulesEngine(RULES)
    session = ConversationalSession("g1", e)
    dm = DialogManager(openai_client=None, api_key="sk-test-offline", store=FakeStore())
    dm.mapper.map_answer = lambda **kw: MappingResult(values={"metal_family": "MIXED"})   # LLM yanlış
    dm._llm = lambda *a, **k: ""
    r = dm.handle(session, "1.4301 mil kesiyorum")
    assert r["state"]["metal_family"] == "STAINLESS"
    assert r["state"]["material_category"] == "METAL"
    assert r["message"].startswith("**304 (1.4301")
    dm.mapper.map_answer = lambda **kw: MappingResult(values={})
    r2 = dm.handle(session, "1.4301")
    assert not r2["message"].startswith("**304")


# --------------------------------------------------------------------------- #
# Bıçak boyu, rodaj, gerginlik, soğutma
# --------------------------------------------------------------------------- #

def test_length_help_general(fd):
    r = ask(fd, "bıçak boyunu nasıl ölçerim")
    assert r and r.kinds == ["length_help"]
    assert "L = 2 × C + π × D" in r.text and "/rehber/serit-testere-boyu-nasil-olculur" in r.text


def test_length_help_computes_from_geometry(fd):
    r = ask(fd, "kasnak çapı 350 mm, merkezler arası 1200 mm; boy ne olmalı?")
    assert r and r.kinds == ["length_help"]
    assert "≈ 3.500 mm" in r.text                       # 2×1200 + π×350 = 3499,6


@pytest.mark.parametrize("msg,kind", [
    ("yeni bıçağı nasıl alıştırırım", "run_in"), ("rodaj nasıl yapılır", "run_in"),
    ("gergi ne kadar olmalı", "tension"), ("bıçağı ne kadar germeliyim", "tension"),
    ("soğutma sıvısı şart mı", "coolant"), ("bor yağı oranı ne olmalı", "coolant"),
])
def test_setup_questions(fd, msg, kind):
    r = ask(fd, msg)
    assert r and r.kinds == [kind] and r.final           # "ne kadar" fiyat sanılmaz
    assert "kılavuz" in r.text or "üreticisinin" in r.text


@pytest.mark.parametrize("msg", ["soğutma var", "evet soğutma sıvısı kullanıyoruz", "soğutma yok"])
def test_coolant_funnel_answers_pass_through(fd, msg):
    assert ask(fd, msg) is None


def test_setup_answers_have_no_numbers_for_tension_or_mix(fd):
    for msg in ("gergi ne kadar olmalı", "bor yağı oranı ne olmalı"):
        text = ask(fd, msg).text
        assert "N/mm" not in text and "%" not in text and "psi" not in text


# --------------------------------------------------------------------------- #
# Yeni arıza belirtileri
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg,symptom", [
    ("bıçağın sırtında çatlak var", "Bıçak sırtında çatlaklar"),
    ("kesim yüzeyi pürüzlü çıkıyor", "Kesim yüzeyi pürüzlü"),
    ("bıçak kasnaktan çıkıyor", "Bıçak kasnaktan çıkıyor"),
    ("talaş dişlere yapışıyor", "Talaş dişlere yapışıyor"),
    ("bıçak çok ısınıyor talaş mavi", "Bıçak aşırı ısınıyor"),
    ("makine zorlanıyor bıçak duruyor", "Bıçak kesimde duruyor"),
])
def test_new_symptoms(fd, msg, symptom):
    r = ask(fd, msg)
    assert r and r.kinds == ["troubleshoot"]
    assert symptom in r.text
