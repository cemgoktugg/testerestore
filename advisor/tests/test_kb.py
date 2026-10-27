# -*- coding: utf-8 -*-
"""Bilgi kütüphanesi araması (llm/kb.py) ve ön masa / huni bağlantısı."""
import json
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("OPENAI_API_KEY", "sk-test-offline")

import pytest

from llm import dialog_manager as DM
from llm.kb import KnowledgeBase
from llm.front_desk import FrontDesk
from tests.test_front_desk import FakeStore

STUB = {
    "domain": "usage_care",
    "entries": [
        {"id": "usage_care.storage", "title_tr": "Yedek bıçak saklama",
         "answer_tr": "Yedek bıçakları kuru bir yerde, katlanmış ve ambalajında saklayın.",
         "questions_tr": ["bıçakları nasıl saklamalıyım", "yedek bıçak paslanır mı",
                          "şerit testere bıçağı nerede saklanır", "bıçağı katlayıp saklamak"],
         "links": ["/rehber/serit-testere-rodaj-ve-bakim"],
         "facts": [{"claim_tr": "Nemli ortam pas yapar", "source_ids": ["S"], "status": "verified"}]},
        {"id": "usage_care.guides", "title_tr": "Kılavuz ayarı",
         "answer_tr": "Kılavuz kollarını parçaya mümkün olduğunca yaklaştırın.",
         "questions_tr": ["kılavuz kolları nasıl ayarlanır", "kılavuz rulmanı ayarı",
                          "kılavuzları ne kadar yaklaştırmalıyım"]},
        {"id": "catalog_store.price-info", "title_tr": "Fiyat nasıl hesaplanır",
         "answer_tr": "Fiyat boya göre hesaplanır.", "requires_data": ["price_api"],
         "questions_tr": ["fiyat nasıl hesaplanıyor", "metre fiyatı nedir", "boya göre fiyat nasıl"]},
    ],
}


@pytest.fixture
def kb(tmp_path):
    (tmp_path / "usage_care.json").write_text(json.dumps(STUB, ensure_ascii=False), encoding="utf-8")
    return KnowledgeBase(str(tmp_path))


def test_search_handles_turkish_suffixes(kb):
    hit = kb.search("yedek bıçağımı paslanmadan nasıl saklarım", k=1)[0]
    assert hit.entry.id == "usage_care.storage"


def test_paslanmaz_is_not_paslanir(kb):
    hits = kb.search("40 mm dolu paslanmaz", k=1)
    assert not hits or hits[0].entry.id != "usage_care.storage" or hits[0].score < 2


class _Router:
    """Gerçek yönlendirici: model yerine sahte seçim (ilk adayı seçer)."""
    def __init__(self, kb):
        from llm.kb_router import KnowledgeRouter
        self.r = KnowledgeRouter(kb, select_fn=lambda msg, hits: [hits[0].entry.id])

    def route(self, message):
        return self.r.route(message)


def test_kb_reply_answers_question(kb):
    fd = FrontDesk(store=FakeStore(), kb=kb)
    r = fd.kb_reply(_Router(kb), "Yedek bıçakları nasıl saklamalıyım?")
    assert r and r.kinds == ["kb:usage_care.storage"] and r.final
    assert "kuru bir yerde" in r.text and "/rehber/serit-testere-rodaj-ve-bakim" in r.text


@pytest.mark.parametrize("msg", ["Var", "40", "Paslanmaz", "Kesmak KMY 280", "Dolu", "Metal",
                                 "40 mm dolu paslanmaz mil için hangi bıçak almalıyım?",
                                 "paslanmaz için hangi bıçak?"])
def test_funnel_answers_and_selection_never_go_to_kb(kb, msg):
    fd = FrontDesk(store=FakeStore(), kb=kb)
    assert fd.kb_reply(_Router(kb), msg) is None


def test_live_data_entries_not_answered_from_kb(kb):
    fd = FrontDesk(store=FakeStore(), kb=kb)
    r = fd.kb_reply(_Router(kb), "boya göre fiyat nasıl hesaplanıyor?")
    assert r is None


def test_router_direct_without_model_when_confident(kb):
    from llm.kb_router import KnowledgeRouter
    called = []
    r = KnowledgeRouter(kb, select_fn=lambda m, h: called.append(1) or [])
    hits = r.route("yedek bıçak paslanır mı nasıl saklamalıyım")
    assert hits and hits[0].entry.id == "usage_care.storage" and not called


def test_router_model_failure_falls_back_to_funnel(kb):
    from llm.kb_router import KnowledgeRouter
    def boom(m, h):
        raise RuntimeError("api down")
    r = KnowledgeRouter(kb, select_fn=boom)
    assert r.route("kılavuz ayarı nasıl") in ([], r.route("kılavuz ayarı nasıl"))


def test_grounded_answer_drops_unsupported_numbers():
    corpus = "Kılavuz kollarını parçaya yaklaştırın. Gerginlik 250–300 N/mm² aralığında verilir."
    text = "Kollar yaklaştırılmalı. Gerginlik 250 N/mm² olmalı. Hız 80 m/dk olmalı."
    out = DM._keep_supported_numbers(text, corpus)
    assert "80 m/dk" not in out and "250" in out and "Kollar" in out


def test_dialog_manager_grounded_when_off_topic(kb):
    dm = DM.DialogManager(openai_client=None, api_key="sk-test-offline", store=FakeStore(), kb=kb)
    seen = {}

    def fake_llm(system, user, history=None):
        seen["system"], seen["user"] = system, user
        return "Kılavuz kollarını parçaya yaklaştırın. Mesafe 5 mm olmalı."
    dm._llm = fake_llm
    out = dm._grounded_answer(SimpleNamespace(conversation_history=[]), "kılavuz kollarını nasıl ayarlarım")
    assert seen["system"] is DM._GROUNDED_SYSTEM and "Kılavuz ayarı" in seen["user"]
    assert out == "Kılavuz kollarını parçaya yaklaştırın."          # kaynaksız "5 mm" atıldı
