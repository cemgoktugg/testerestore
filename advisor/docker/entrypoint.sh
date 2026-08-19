#!/usr/bin/env bash
# Advisor servisi giriş noktası.
#   1) data/ volume'ünü imajdaki kopyadan tohumla (ilk çalıştırma)
#   2) Ansiklopediyi vektör DB'ye indeksle (idempotent)
#   3) gunicorn'u başlat
set -euo pipefail

cd /app

# 1) data/ kalıcı volume olarak mount ediliyor; ilk açılışta boş gelir.
#    İmajda /app/data.dist içinde duran dosyaları eksikse kopyala.
#    (machines_database.json salt-okunur veri; unknown_questions.json ve
#     learned_knowledge.json runtime'da yazılıyor — bu yüzden volume şart.)
# İki farklı dosya sınıfı var, karıştırılırsa veri kaybı ya da bayat veri olur:
#
#   RUNTIME_WRITTEN — uygulama çalışırken yazıyor (öğrenilen bilgi, cevaplanmamış
#     sorular). Volume'de ne varsa o kalır; imajdaki kopya sadece dosya hiç
#     yoksa tohum olarak kullanılır. Üzerine yazarsak kullanıcı verisi gider.
#
#   Diğerleri (machines_database.json, machines_list.json, ansiklopedi) —
#     salt-okunur referans veri. Bunlar HER AÇILIŞTA imajdan tazelenir; aksi
#     halde volume bir kez doldu mu repodaki güncellemeler (yeni makine,
#     düzeltilmiş ölçü) konteynere asla ulaşmaz.
RUNTIME_WRITTEN="unknown_questions.json learned_knowledge.json"

if [ -d /app/data.dist ]; then
  mkdir -p /app/data
  for f in /app/data.dist/*; do
    base="$(basename "$f")"
    case " $RUNTIME_WRITTEN " in
      *" $base "*)
        if [ ! -e "/app/data/$base" ]; then
          cp "$f" "/app/data/$base"
          echo "[entrypoint] data/$base tohumlandı (runtime verisi, bir kere)"
        fi
        ;;
      *)
        cp "$f" "/app/data/$base"
        echo "[entrypoint] data/$base imajdan tazelendi"
        ;;
    esac
  done
fi

# 2) Vektör indeksi — YALNIZCA RAG açıksa.
#
# Uygulama RAG'i varsayılan olarak kullanmıyor: ConversationalEngine'in
# `enable_rag` parametresi False (llm/conversational_engine.py:171) ve
# web/app.py:27 bu bayrağı geçmiyor. Yani ansiklopediyi indekslemek şu an
# hiç okunmayacak bir veri için OpenAI embedding faturası demek.
# RAG'i açmak istersen: ADVISOR_ENABLE_RAG=1 ver VE web/app.py'de
# ConversationalEngine(rules_path, enable_rag=True) yap.
if [ "${ADVISOR_ENABLE_RAG:-0}" = "1" ]; then
  python docker/index_encyclopedia_container.py || \
    echo "[entrypoint] indeksleme başarısız — servis RAG'siz devam ediyor"
else
  echo "[entrypoint] RAG kapalı (ADVISOR_ENABLE_RAG=1 ile açılır) — indeksleme atlandı"
fi

# 3) Tek worker: session'lar ConversationalEngine içinde bellekte tutuluyor
#    (llm/conversational_engine.py:242). Birden fazla worker olursa
#    kullanıcının ikinci mesajı başka worker'a düşer ve konuşma sıfırlanır.
#    Eşzamanlılık thread'lerle sağlanıyor.
exec gunicorn wsgi:app \
  --bind "0.0.0.0:${PORT:-5000}" \
  --workers 1 \
  --threads "${GUNICORN_THREADS:-8}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  --access-logfile - \
  --error-logfile -
