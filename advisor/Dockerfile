# Şerit Testere Danışmanı (Rules Engine + RAG) — production imajı
#
# İki aşamalı: chroma-hnswlib gibi C++ eklentileri builder'da derlenir,
# final imaja sadece hazır venv kopyalanır. Sonuç ~500 MB
# (requirements.txt'teki kullanılmayan torch/langchain ile ~3 GB olurdu).

# ---------- builder ----------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements-prod.txt .
RUN pip install --upgrade pip && pip install -r requirements-prod.txt

# ---------- runtime ----------
FROM python:3.12-slim

# PYTHONIOENCODING/LANG: kod emoji içeren print() çağrıları yapıyor
# (ör. rules_engine/engine.py:184). UTF-8 olmayan bir locale'de bunlar
# UnicodeEncodeError fırlatıp servisi import anında düşürür.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONIOENCODING=utf-8 \
    LANG=C.UTF-8 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=5000

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# Uygulama kodu
COPY rules_engine/ ./rules_engine/
COPY llm/          ./llm/
COPY prompts/      ./prompts/
COPY web/          ./web/
COPY docker/       ./docker/
COPY rules.json    ./rules.json
COPY wsgi.py       ./wsgi.py

# data/ kalıcı volume olarak mount edilecek; imajdaki kopya tohum olarak
# data.dist içinde durur (entrypoint ilk açılışta eksikleri kopyalar).
COPY data/ ./data.dist/

# chmod +x: entrypoint'in çalıştırma biti git'ten gelmeyebilir. Windows
# dosya sistemi exec bitini tutmuyor, dolayısıyla dosya repoya 100644 olarak
# girebiliyor ve konteyner açılışta "permission denied" ile ölüyor. Burada
# koşulsuz set ediyoruz — git metadata'sına bağımlı kalmıyoruz.
#
# chroma_db ve data mount noktaları — root olmayan kullanıcı yazabilsin
RUN chmod +x /app/docker/entrypoint.sh \
    && mkdir -p /app/chroma_db /app/data \
    && useradd --create-home --uid 10001 advisor \
    && chown -R advisor:advisor /app

USER advisor

EXPOSE 5000

# Servis yalnızca iç ağdan erişilebilir olacak (compose'da public port yok),
# healthcheck de container içinden çalışır.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=4).status==200 else 1)"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
