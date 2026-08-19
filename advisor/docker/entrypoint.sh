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
if [ -d /app/data.dist ]; then
  mkdir -p /app/data
  for f in /app/data.dist/*; do
    base="$(basename "$f")"
    if [ ! -e "/app/data/$base" ]; then
      cp "$f" "/app/data/$base"
      echo "[entrypoint] data/$base tohumlandı"
    fi
  done
fi

# 2) Vektör indeksi — koleksiyon doluysa atlanır, OpenAI faturası çıkmaz.
python docker/index_encyclopedia_container.py || \
  echo "[entrypoint] indeksleme başarısız — servis RAG'siz devam ediyor"

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
