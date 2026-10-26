# -*- coding: utf-8 -*-
"""Olay kaydı (llm/telemetry.py): kişisel veri maskeleme, kayıt, saklama süresi, özet."""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

import llm.telemetry as tel


@pytest.fixture
def events_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(tel, "EVENTS_DIR", str(tmp_path))
    monkeypatch.setattr(tel, "_last_cleanup", None)
    return tmp_path


@pytest.mark.parametrize("text,masked,kept", [
    ("mailim ali.veli@example.com yazın", "[e-posta]", None),
    ("tel 0555 123 45 67 arayın", "[telefon]", None),
    ("+90 532 111 22 33", "[telefon]", None),
    ("tc 10000000146", "[tckn]", None),
    ("iban TR33 0006 1005 1978 6457 8413 26", "[iban]", None),
    ("kart 4111 1111 1111 1111", "[kart]", None),           # Luhn geçerli test kartı
    ("1638 1440 1500 2000 mm hazır var mı", None, "1638 1440 1500 2000"),  # boy listesi korunur
    ("27x0.9 2750 mm fiyat", None, "27x0.9 2750 mm"),
])
def test_mask_pii(text, masked, kept):
    out = tel.mask_pii(text)
    if masked:
        assert masked in out
    if kept:
        assert kept in out


def test_mask_truncates():
    assert len(tel.mask_pii("a" * 2000)) == tel.MAX_TEXT


def test_turn_event_outcomes():
    base = dict(session_id="s", message="m", latency_ms=12.3, prompt_tokens=10,
                completion_tokens=5, model="gpt-4o")
    assert tel.turn_event(result={"route": "front_desk", "front_desk": ["shipping"]}, **base)["outcome"] == "answered"
    assert tel.turn_event(result={"route": "funnel", "recommendation": {"x": 1}}, **base)["outcome"] == "recommendation"
    assert tel.turn_event(result={"route": "funnel", "message": "Elimdeki bilgilerle kesin bir ürün kodu üretemedim."},
                          **base)["outcome"] == "no_answer"
    e = tel.turn_event(result=None, error="boom", **base)
    assert e["outcome"] == "error" and e["route"] == "error"
    assert e["session"] != "s" and len(e["session"]) == 16


def test_log_event_and_retention(events_dir):
    old = (dt.date.today() - dt.timedelta(days=tel.RETENTION_DAYS + 5)).isoformat()
    (events_dir / f"{old}.jsonl").write_text('{"type":"turn"}\n', encoding="utf-8")
    tel.log_event({"type": "turn", "route": "front_desk"})
    files = sorted(p.name for p in events_dir.iterdir())
    assert files == [f"{dt.date.today().isoformat()}.jsonl"]   # eski dosya silindi
    line = json.loads((events_dir / files[0]).read_text(encoding="utf-8").splitlines()[0])
    assert line["route"] == "front_desk" and "ts" in line


def test_summary(events_dir):
    for route, lat, outcome in [("front_desk", 40, "answered"), ("funnel", 2500, "question"),
                                ("funnel", 3100, "no_answer")]:
        tel.log_event({"type": "turn", "session": "a", "route": route, "latency_ms": lat,
                       "outcome": outcome, "prompt_tokens": 1000, "completion_tokens": 100,
                       "model": "gpt-4o", "message": "kereste için bıçak"})
    tel.log_event({"type": "feedback", "rating": "down", "bot_text": "x", "comment": ""})
    out = tel.summarize(days=1)
    assert "3 tur" in out and "front_desk" in out and "👎 1" in out
    assert "no_answer" in out and "kereste için bıçak" in out
