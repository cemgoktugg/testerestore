# -*- coding: utf-8 -*-
"""
Makine arama regresyon testi.

Çalıştırma (advisor/ dizininden):
    python tests/test_machine_search.py

Neden bu test var:
    data/unknown_questions.json içindeki "cevaplanamadı" kayıtlarının
    TAMAMI, cevabı machines_list.json'da fiilen bulunan sorulardı. Arama
    kullanıcının cümlesinin tamamını model adına karşı skorladığı için
    cümleye kelime eklendikçe eşleşme kayboluyordu. O sorular buraya
    birebir kopyalandı; bir daha sessizce kaybolmasınlar diye.

    İkinci sınıf: aynı model adını birden çok üretici kullanıyor ve
    ölçüleri farklı (veritabanında 61 böyle grup var). Bu durumda doğru
    davranış tahmin etmek değil, sormaktır — "ambiguous" bekleniyor.

pytest gerektirmez; bağımlılığı yoktur (machine_database saf stdlib).
"""
import importlib.util
import sys
from pathlib import Path

ADVISOR_ROOT = Path(__file__).resolve().parent.parent

# rules_engine/__init__.py pydantic çekiyor; test yalnızca arama motorunu
# ilgilendirdiği için modülü paketten bağımsız, doğrudan yüklüyoruz.
_spec = importlib.util.spec_from_file_location(
    "machine_database", ADVISOR_ROOT / "rules_engine" / "machine_database.py"
)
machine_database = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(machine_database)


def _db():
    return machine_database.AdvancedMachineDatabase(
        db_path=str(ADVISOR_ROOT / "data" / "machines_list.json")
    )


# (sorgu, beklenen)
#   "MODEL"        -> tam olarak bu model eşleşmeli
#   AMBIGUOUS      -> tahmin etme, aday listesiyle sor
#   None           -> hiçbir makine eşleşmemeli
AMBIGUOUS = object()

CASES = [
    # ---- unknown_questions.json'daki gerçek cevapsız sorular ----
    ("Behringer LPS-T'nin desteklediği bıçak genişlik, kalınlık ve uzunluk ölçüsü", "LPS-T"),
    ("Behringer LPS-T modelinin desteklediği bıçak ölçüleri", "LPS-T"),
    ("Behringer LPS-T modelinin desteklediği bıçak genişlik, kalınlık ve uzunluk ölçüsü", "LPS-T"),
    ("Behringer LPS-T'nin desteklediği bıçak genişlik, kalınlık ve uzunluk ölçüleri", "LPS-T"),
    ("kasto 460", AMBIGUOUS),  # 4 KASTO modeli 460 içeriyor, ölçüleri farklı

    # ---- yalın model adı (eski davranış korunmalı) ----
    ("Behringer LPS-T", "LPS-T"),
    ("LPS-T", "LPS-T"),
    ("amada ctb-400", "CTB-400"),
    ("AMADA CRH-300 S", "CRH-300 S"),
    ("makinam kasto pba 460 u/au", "PBA 460 U/AU"),

    # ---- doğal dil cümlesi içinde model ----
    ("makinem amada ctb-400", "CTB-400"),
    ("benim makinem AMADA CTB-400, hangi bıçağı önerirsin", "CTB-400"),
    ("Amada CTB-400 için bıçak uzunluğu nedir?", "CTB-400"),
    ("elimde behringer lps-t var", "LPS-T"),
    ("LPS-T kullanıyorum", "LPS-T"),
    ("bekamak bmsy 320 için öneri", "BMSY 320"),

    # ---- Türkçe karakter, kesme işareti, yazım ----
    ("behrınger lps t", "LPS-T"),
    ("BEHRINGER LPST", "LPS-T"),
    ("CTB-400'ün bıçak ölçüsü", "CTB-400"),

    # ---- üretici alias ("uzay" -> UZAY MAKINA) ----
    # UZAY'ın üç adet 320 modeli var ama üçünün de bıçağı 4160x27x0.9,
    # yani sormaya gerek yok. Üretici filtresi çalışmazsa buraya model adı
    # birebir "320" olan BTM makinesi düşüyordu.
    ("uzay 320", "UMSY 320"),
    ("uzay makina umsy 320", "UMSY 320"),

    # ---- aynı model adı, farklı üretici, FARKLI ölçü -> sormalı ----
    # AMADA 11800mm, EVERISING/MEGA/WAGNER 12300mm, julihuang 11380mm.
    # Tahmin edilirse müşteri makinesine takılmayan bıçak sipariş eder.
    ("H-1300", AMBIGUOUS),
    ("H-1000", AMBIGUOUS),

    # ---- NEGATİF: makine adı yok, hiçbir şey eşleşmemeli ----
    ("merhaba", None),
    ("bıçak önerisi istiyorum", None),
    ("paslanmaz çelik kesiyorum 50 mm kalınlık", None),
    ("teşekkürler", None),
    ("fiyat ne kadar", None),
    ("hangi tpi kullanmalıyım", None),
    ("320 mm çapında dolu mil kesiyorum", None),  # "320" saf sayı: model sanılmamalı
    ("25 mm kalınlığında alüminyum", None),       # "25" gerçek bir model adı, yine de hayır
]


def run():
    db = _db()
    failures = []

    for query, expected in CASES:
        detailed = db.search_detailed(query)
        status = detailed["status"]
        model = detailed["machine"]["model"] if detailed["machine"] else None

        if expected is AMBIGUOUS:
            ok = status == "ambiguous" and len(detailed["candidates"]) > 1
            got = f"{status} ({len(detailed['candidates'])} aday)"
        elif expected is None:
            ok = status == "none"
            got = f"{status} -> {model}"
        else:
            ok = status == "match" and model == expected
            got = f"{status} -> {model}"

        if not ok:
            failures.append((query, expected, got))
        mark = "OK  " if ok else "FAIL"
        exp_txt = "AMBIGUOUS" if expected is AMBIGUOUS else str(expected)
        print(f"{mark} | {query[:58]:<58} | bekl={exp_txt[:12]:<12} | {got}")

    print(f"\n=== {len(CASES) - len(failures)} geçti / {len(failures)} kaldı "
          f"/ {len(CASES)} toplam ===")
    return failures


def test_machine_search():
    """pytest ile de çalışsın."""
    assert run() == []


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(1 if run() else 0)
