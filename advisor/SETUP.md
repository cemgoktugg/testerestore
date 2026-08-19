# 🚀 KURULUM REHBERİ

Bu dokuman projeyi sıfırdan kurmak için gerekli adımları içerir.

---

## 📋 GEREKSINIMLER

- **Python:** 3.10 veya üzeri
- **OpenAI API Key:** GPT-4 ve embeddings için
- **Git:** Proje klonlamak için

---

## 🔧 KURULUM ADIMLARI

### 1. Projeyi Klonla

```bash
git clone <repository-url>
cd Rules_engine
```

### 2. Virtual Environment Oluştur

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Bağımlılıkları Yükle

```bash
pip install -r requirements.txt
```

**requirements.txt içeriği:**
```
pydantic>=2.10.0
openai>=1.0.0
chromadb>=0.4.0
langchain>=0.1.0
tiktoken>=0.5.0
```

### 4. OpenAI API Key Ayarla

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY = "sk-..."
```

**macOS/Linux:**
```bash
export OPENAI_API_KEY="sk-..."
```

**Kalıcı yapma (.env dosyası):**

`.env` dosyası oluştur:
```
OPENAI_API_KEY=sk-...
```

Python'da yükle:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

## ✅ TEST ET

### Hızlı Test (Rules Engine)

```bash
python quick_demo.py
```

Bu demo:
- ✅ Rules engine'i başlatır
- ✅ Örnek malzeme girdileri verir
- ✅ SKU önerisi üretir

### Hibrit Test (Rules + RAG)

```bash
python hybrid_demo.py
```

Bu demo:
- ✅ Rules engine ile ürün önerisi
- ✅ RAG engine ile doküman sorguları
- ✅ İki sistemin birlikte çalışması

**Not:** Hibrit demo için önce `sample_docs/` klasörü oluşturulmalı (rag_demo.py çalıştırın).

### RAG Doküman İndeksleme

```bash
python rag_demo.py
```

Bu demo:
- ✅ Örnek dokümanlar oluşturur
- ✅ ChromaDB'ye indeksler
- ✅ Sorgu testleri yapar

---

## 📁 PROJE YAPISI

```
Rules_engine/
├── rules_engine/          # Ana rules engine modülü
│   ├── engine.py         # Orchestrator
│   ├── models.py         # Pydantic modeller
│   ├── rule_loader.py    # JSON yükleyici
│   ├── rule_evaluator.py # Koşul değerlendirici
│   ├── rule_executor.py  # Aksiyon çalıştırıcı
│   ├── state_manager.py  # State yönetimi
│   └── question_router.py # Soru yönlendirici
│
├── llm/                   # LLM entegrasyonu (RAG + GPT)
│   ├── conversational_engine.py  # Hibrit sistem
│   ├── rag_engine.py             # RAG motoru
│   ├── openai_client.py          # OpenAI wrapper
│   ├── prompt_builder.py         # Prompt yönetimi
│   ├── message_parser.py         # NLU parser
│   ├── embeddings_client.py      # Embeddings
│   ├── vector_store.py           # ChromaDB
│   ├── chunker.py               # Text chunking
│   └── document_loader.py        # Doküman yükleme
│
├── prompts/              # GPT system prompts
│   └── system_prompt.py
│
├── tests/                # Test suite
│   ├── test_scenarios.py
│   ├── test_llm_integration.py
│   └── test_rag_integration.py
│
├── quick_demo.py         # Hızlı başlangıç demo
├── hybrid_demo.py        # Hibrit sistem demo
├── rag_demo.py          # RAG indeksleme demo
│
├── rules.json           # Kural tanımları (26 kural)
├── requirements.txt     # Python bağımlılıkları
├── README.md           # Proje genel bakış
├── ARCHITECTURE.md     # Teknik mimari
└── SETUP.md           # Bu dosya
```

---

## 🧪 TEST SENARYOLARI

### Birim Testler

```bash
# Tüm testleri çalıştır
python -m pytest tests/

# Belirli test dosyası
python -m pytest tests/test_scenarios.py

# Verbose mode
python -m pytest tests/ -v
```

### Manuel Test

```python
from rules_engine import RulesEngine

# Engine oluştur
engine = RulesEngine("rules.json")

# State güncelle
engine.update_state("metal_family", "ALUMINUM")
engine.update_state("profile_wall_thickness_bucket", "1-3mm")
engine.update_state("blade_length_mm", 2240)

# Kuralları çalıştır
engine.execute_rules()

# Öneriyi al
recommendation = engine.get_recommendation()
print(recommendation)
```

---

## 🔍 SORUN GIDERME

### API Key Hatası

```
Error: OpenAI API key not found
```

**Çözüm:** API key'i environment variable olarak ayarla:
```powershell
$env:OPENAI_API_KEY = "sk-..."
```

### ChromaDB Hatası

```
Error: chromadb not installed
```

**Çözüm:** ChromaDB'yi yükle:
```bash
pip install chromadb
```

### Import Hatası

```
ModuleNotFoundError: No module named 'rules_engine'
```

**Çözüm:** Python path'i düzenle:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
```

### Encoding Hatası (Windows)

```
UnicodeDecodeError: 'charmap' codec...
```

**Çözüm:** UTF-8 encoding kullan:
```python
with open("file.txt", encoding="utf-8") as f:
    content = f.read()
```

---

## 📚 DAHA FAZLA BİLGİ

- **Mimari Detayları:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Kural Yazma:** [rules.json](rules.json) - Yorumları oku
- **API Referansı:** Her modül başında detaylı docstring var

---

## 🆘 DESTEK

Sorular için:
1. ARCHITECTURE.md dosyasını oku
2. Kod içindeki docstring'leri incele
3. Demo dosyalarını çalıştır

---

**Başarılar! 🚀**
