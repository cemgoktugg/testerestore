"""
Production WSGI giriş noktası.

web/app.py'deki Flask uygulamasını gunicorn'a açar. app.py'nin kendi
`if __name__ == '__main__'` bloğu (debug=True'lu geliştirme sunucusu)
gunicorn altında çalışmaz — canlıda debug kapalı olur.

Çalışma dizini /app olmalı: RAGEngine ve index script'i vektör DB'yi
CWD'ye göre `./chroma_db` yolunda arıyor.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from web.app import app  # noqa: E402

__all__ = ["app"]
