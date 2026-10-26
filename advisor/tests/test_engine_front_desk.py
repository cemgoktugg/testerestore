# -*- coding: utf-8 -*-
"""
ConversationalEngine ↔ ön masa entegrasyonu (OpenAI'ye istek atılmaz).

- Ön masa cevapladıysa huni (DialogManager) HİÇ çağrılmaz; öneri kartı
  tekrarlanmaz, takip sorusunda butonlar gizlenir.
- Karma mesajda huni de çalışır, ön masa cevabı başa eklenir.
- Ön masa hata verirse sohbet bozulmaz, huni devam eder.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("OPENAI_API_KEY", "sk-test-offline")

import pytest

from llm.conversational_engine import ConversationalEngine
from tests.test_front_desk import FakeStore

RULES = os.path.join(os.path.dirname(__file__), "..", "rules.json")


@pytest.fixture
def engine():
    eng = ConversationalEngine(RULES)
    eng.front_desk.store = FakeStore()
    calls = []

    def fake_handle(session, message):
        calls.append(message)
        return {"session_id": session.session_id, "message": "**Makine markanız ve modeliniz nedir?**",
                "state": {"tooth_pitch": "4/6"}, "recommendation": None,
                "next_question": {"id": "Q_MACHINE_MODEL"}, "is_complete": False, "extracted_fields": {}}

    eng.dialog_manager.handle = fake_handle
    eng._calls = calls
    return eng


def test_store_question_skips_funnel(engine):
    r = engine.chat("Kargo ücreti ne kadar?", session_id="s1")
    assert engine._calls == []
    assert "2.000 TL" in r["message"] and r["recommendation"] is None
    assert r["front_desk"] == ["shipping"]
    assert r["next_question"] is not None          # huninin butonları gösterilir


def test_follow_up_question_hides_buttons(engine):
    r = engine.chat("bimetal 34x1.1 fiyatı ne kadar", session_id="s2")
    assert r["next_question"] is None and "boy" in r["message"]
    r2 = engine.chat("3000", session_id="s2")
    assert "34 × 1,1 mm, 3000 mm" in r2["message"] and engine._calls == []


def test_hybrid_runs_funnel_and_announces_tpi(engine):
    r = engine.chat("40 mm dolu paslanmaz kesiyorum, kargo ne kadar?", session_id="s3")
    assert engine._calls == ["40 mm dolu paslanmaz kesiyorum, kargo ne kadar?"]
    msg = r["message"]
    assert msg.index("**Kargo:**") < msg.index("önerilen diş adımı: **4/6 TPI**") < msg.index("Makine markanız")


def test_funnel_message_goes_to_funnel(engine):
    r = engine.chat("40 mm dolu paslanmaz mil kesiyorum", session_id="s4")
    assert engine._calls and "önerilen diş adımı: **4/6 TPI**" in r["message"]


def test_front_desk_failure_falls_back(engine):
    def boom(session, message):
        raise RuntimeError("test")
    engine.front_desk.handle = boom
    r = engine.chat("Kargo ücreti ne kadar?", session_id="s5")
    assert engine._calls and "Makine markanız" in r["message"]
