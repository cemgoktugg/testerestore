# 🔧 Rules Engine - Hybrid AI System

Production-grade **Hybrid AI System** combining **Rules Engine** and **RAG (Retrieval-Augmented Generation)** for intelligent bandsaw blade recommendations and technical documentation support.

---

## 🎯 What This System Does

This is a **smart recommendation engine** that:
1. **Understands user needs** through natural conversation (Turkish/English)
2. **Applies business rules** to find the right product
3. **Answers technical questions** using your documentation
4. **Provides SKU recommendations** with confidence scores

Perfect for e-commerce, technical support, and product configurators.

---

## ✨ Features

### 🧠 Rules Engine (Product Logic)
- ✅ **26 Business Rules** defined in JSON (no coding needed!)
- ✅ **Smart Question Routing** - only asks what's needed
- ✅ **Type-Safe Validation** with Pydantic
- ✅ **Advanced Operators** - gt, lt, range, contains, in, etc.
- ✅ **Automatic SKU Generation**
- ✅ **Confidence Scoring**

### 📚 RAG Engine (Documentation AI)
- ✅ **Semantic Search** through your documents
- ✅ **Vector Database** with ChromaDB (persistent storage)
- ✅ **Multi-Format Support** - PDF, TXT, Markdown, Word
- ✅ **Smart Text Chunking** (context-aware splitting)
- ✅ **Source Attribution** (shows which document answered)

### 🤖 Hybrid Intelligence
- ✅ **Automatic Query Classification** - routes to right engine
- ✅ **Unified Conversational API**
- ✅ **GPT-4 Integration** for natural conversations
- ✅ **Session Management** (multi-user support)
- ✅ **Fallback Mechanisms** (handles errors gracefully)

---

## 📦 Quick Installation

### Requirements
- Python 3.10+
- OpenAI API Key

### Setup (3 steps)

```bash
# 1. Clone & Navigate
git clone <your-repo>
cd Rules_engine

# 2. Create Virtual Environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate      # Linux/Mac

# 3. Install Dependencies
pip install -r requirements.txt
```

**Set API Key:**
```powershell
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"

# Linux/Mac
export OPENAI_API_KEY="sk-your-key-here"
```

For detailed setup: see [SETUP.md](SETUP.md)

---

## 🚀 Quick Start

### Option 1: Quick Demo (5 minutes)

```bash
python quick_demo.py
```

**What you'll see:**
- ✅ Engine initialization
- ✅ State updates (material, thickness, length)
- ✅ Rule execution
- ✅ SKU recommendation

### Option 2: Hybrid Demo (Complete System)

```bash
python hybrid_demo.py
```

**Features:**
- ✅ Product recommendation (Rules Engine)
- ✅ Documentation Q&A (RAG Engine)
- ✅ Natural conversation flow
- ✅ Both systems working together

**Note:** First run `python rag_demo.py` to create sample documents.

---

---

## 🧪 Testing

```bash
# Run all automated tests
python tests/test_scenarios.py

# With pytest
pytest tests/ -v

# Individual test files
pytest tests/test_llm_integration.py -v
pytest tests/test_rag_integration.py -v
```

**Test Coverage:**
- ✅ 10 Test Scenarios in rules.json
- ✅ All operators (eq, gt, lt, range, in, contains, etc.)
- ✅ All actions (set, increment, append, calculate)
- ✅ RAG integration
- ✅ LLM conversation flow

---

## 💻 Usage Examples

### Example 1: Rules Engine Only (Fast, No API Cost)

```python
from rules_engine import RulesEngine

# Initialize
engine = RulesEngine("rules.json")

# Input: User wants to cut aluminum
engine.update_state("metal_family", "ALUMINUM")
engine.update_state("profile_wall_thickness_bucket", "1-3mm")
engine.update_state("blade_length_mm", 2240)
engine.update_state("coolant", "YES")

# Execute
engine.execute_rules()

# Output: Get recommendation
rec = engine.get_recommendation()
print(f"SKU: {rec['sku']}")                    # → "16-0.90-10/14-2240"
print(f"Type: {rec['blade_type']}")            # → "BI_METAL_M42_FLEXBACK"
print(f"TPI: {rec['tooth_pitch']}")            # → "10/14"
print(f"Confidence: {rec['confidence_score']}") # → 0.95
```

### Example 2: RAG Engine Only (Documentation Q&A)

```python
from llm.rag_engine import RAGEngine

# Initialize & index (one-time setup)
rag = RAGEngine(api_key="sk-...")
result = rag.index_documents("docs/")
print(f"Indexed {result['total_chunks']} chunks")

# Query
answer = rag.query("Testere bıçağı nasıl takılır?")
print(answer["answer"])
# → "1. Makineyi kapatın 2. Gergi kolunu gevşetin..."
print(answer["sources"])
# → ["installation.pdf", "safety.pdf"]
```

### Example 3: Hybrid System (Best of Both Worlds)

```python
from llm.conversational_engine import ConversationalEngine

# Initialize
engine = ConversationalEngine(
    rules_path="rules.json",
    openai_api_key="sk-...",
    enable_rag=False  # Start without RAG
)

# Create user session
session_id = engine.create_session()

# PHASE 1: Product Recommendation
response = engine.chat("150mm çelik kesiyorum", session_id)
print(response["message"])
# → "Harika! Soğutma sıvısı kullanıyor musunuz?"

response = engine.chat("Evet kullanıyorum", session_id)
# → Auto-completes recommendation

print(response["recommendation"]["sku"])
# → "16-0.90-8/12-2240"

# PHASE 2: Enable RAG
engine.setup_rag(docs_path="docs/")

# Documentation question
response = engine.chat("Bu bıçağı nasıl takarım?", session_id)
print(response["message"])
# → "Bıçak takma adımları: 1. Makineyi kapatın..."
```
```
## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│      Conversational Engine (Orchestrator)    │
│                                              │
│  ┌──────────────────┬──────────────────┐   │
│  │  Rules Engine    │   RAG Engine      │   │
│  │  (Products)      │   (Docs)          │   │
│  └──────────────────┴──────────────────┘   │
│           │                   │              │
│           ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐      │
│  │ rules.json   │    │ ChromaDB     │      │
│  │ (26 rules)   │    │ (embeddings) │      │
│  └──────────────┘    └──────────────┘      │
│                                              │
│           ▼                   ▼              │
│  ┌───────────────────────────────────┐     │
│  │         GPT-4 (OpenAI)            │     │
│  └───────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### Project Structure

```
Rules_engine/
├── rules_engine/         # Rules Engine Core
│   ├── models.py         # Pydantic data models
│   ├── rule_loader.py    # JSON → Python objects
│   ├── rule_evaluator.py # Condition evaluation
│   ├── rule_executor.py  # Action execution
---

## 📁 Project Structure

```
Rules_engine/
│
├── rules_engine/          # Core Rules Engine
│   ├── engine.py         # Main orchestrator
│   ├── models.py         # Data models (Pydantic)
│   ├── rule_loader.py    # JSON loader
│   ├── rule_evaluator.py # Condition evaluator
│   ├── rule_executor.py  # Action executor
│   ├── state_manager.py  # State management
│   └── question_router.py# Question flow logic
│
├── llm/                   # LLM & RAG System
│   ├── conversational_engine.py  # Hybrid orchestrator
│   ├── rag_engine.py             # RAG system
│   ├── openai_client.py          # OpenAI wrapper
│   ├── prompt_builder.py         # Prompt management
│   ├── message_parser.py         # NLU parser
│   ├── embeddings_client.py      # Embeddings
│   ├── vector_store.py           # ChromaDB
│   ├── chunker.py               # Text chunking
│   └── document_loader.py        # Doc loader
│
├── tests/                # Test Suite
│   ├── test_scenarios.py
│   ├── test_llm_integration.py
│   └── test_rag_integration.py
│
├── prompts/              # GPT Prompts
│   └── system_prompt.py
│
├── quick_demo.py         # Quick start demo
├── hybrid_demo.py        # Hybrid system demo
├── rag_demo.py          # RAG demo
│
├── rules.json           # 26 Business rules
├── requirements.txt     # Dependencies
├── README.md           # This file
├── ARCHITECTURE.md     # Technical details
└── SETUP.md           # Installation guide
```

---

## 🎓 How It Works

### Rules Engine Flow

```
User Input → Normalize → Update State → Execute Rules → Generate SKU
```

**Example:**
```python
Input:  "150mm aluminum, 3mm thick, with coolant"
        ↓
State:  {metal_family: ALUMINUM, thickness: 3mm, coolant: YES}
        ↓
Rules:  R_ALUMINUM_PROFILE matches
        ↓
Output: SKU "16-0.90-10/14-2240" (BI_METAL_M42, 10/14 TPI)
```

### RAG System Flow

```
Query → Embed → Search Vector DB → Retrieve Docs → GPT Answer
```

**Example:**
```python
Query: "Testere bıçağı nasıl takılır?"
       ↓
Embed: [0.123, -0.456, 0.789, ...]
       ↓
Search: Find 3 most similar chunks from indexed docs
       ↓
Retrieve: "1. Makineyi kapatın 2. Gergi kolunu gevşetin..."
       ↓
GPT: Formats answer in natural language
```

---

## 🔧 Advanced Usage

### Custom Rules

Edit [rules.json](rules.json):

```json
{
  "id": "R_MY_CUSTOM_RULE",
  "priority": 50,
  "category": "MATERIAL",
  "comment": "My custom business logic",
  "when": {
    "all": [
      {"eq": ["metal_family", "STEEL"]},
      {"gt": ["thickness", 5.0]}
    ]
  },
  "then": [
    {"set": ["blade_type", "BI_METAL_M51"]},
    {"set": ["tooth_pitch", "6/10"]}
  ]
}
```

### Custom Operators

The system supports:
- `eq` - Equal
- `gt`, `lt`, `gte`, `lte` - Comparisons  
- `range` - Value in range
- `in` - Value in list
- `contains` - String contains
- `exists` - Field has value
- `all`, `any`, `not` - Logical

### Custom Actions

Available actions:
- `set` - Set field value
- `increment` - Increment numeric field
- `append` - Append to list (no duplicates)
- `calculate` - Math operations (add, subtract, multiply, divide)
- `append_warning_if` - Conditional warnings

---

## 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Engine Init | ~50ms | JSON parsing |
| State Update | <1ms | In-memory |
| Rule Execution | 5-10ms | 26 rules |
| RAG Query | 200-500ms | Includes OpenAI API |
| Full Conversation | 1-2s | With GPT-4 |

**Optimization Tips:**
- Cache embeddings for repeated queries
- Use Redis for session management at scale
- Batch process multiple recommendations
- Pre-index documents during deployment

---

## 🌐 API Integration

### REST API Example (FastAPI)

```python
from fastapi import FastAPI
from llm.conversational_engine import ConversationalEngine

app = FastAPI()
engine = ConversationalEngine(
    rules_path="rules.json",
    openai_api_key="sk-..."
)

@app.post("/chat")
async def chat(message: str, session_id: str):
    response = engine.chat(message, session_id)
    return response

@app.post("/recommendation")
async def recommend(inputs: dict):
    for key, value in inputs.items():
        engine.update_state(key, value)
    engine.execute_rules()
    return engine.get_recommendation()
```

---

## 🐛 Troubleshooting

### Common Issues

**❌ OpenAI API Key Error**
```
Error: OpenAI API key not found
```
**✅ Solution:**
```powershell
$env:OPENAI_API_KEY = "sk-your-key"
```

**❌ ChromaDB Import Error**
```
ModuleNotFoundError: No module named 'chromadb'
```
**✅ Solution:**
```bash
pip install chromadb
```

**❌ Encoding Error (Windows)**
```
UnicodeDecodeError: 'charmap' codec...
```
**✅ Solution:** Use UTF-8 encoding in all file operations

**❌ Vector DB Too Large**
```bash
# Clear old collections
rag.clear_collection()
```

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed installation guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture deep-dive
- **[rules.json](rules.json)** - Rules definitions (with Turkish comments)
- **Code Documentation** - Every module has detailed docstrings

---

## 🚀 Roadmap

### ✅ Completed (Sprint 1-2)
- Rules Engine (26 rules)
- LLM Integration (GPT-4)
- RAG System (ChromaDB)
- Hybrid System
- Test Suite (60+ tests)

### 🔜 Coming Soon (Sprint 3)
- REST API (FastAPI)
- Redis session management
- Multi-language support (EN/TR/DE)

### 💡 Future Ideas
- Web UI (React/Vue)
- Voice interface
- Fine-tuned models
- Mobile app

---

## 📄 License

Proprietary - Internal Use Only

---

## 🙋 Support

For questions:
1. Check [SETUP.md](SETUP.md) for installation help
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
3. Run demo files to see examples
4. Examine code docstrings (Turkish explanations)

---

**Made with ❤️ for intelligent product recommendations**

Hybrid AI System combining Rules Engine + RAG for superior user experience.

2. **Chunk Text**: 500-1000 tokens, sentence-aware
3. **Generate Embeddings**: OpenAI text-embedding-3-small (1536D)
4. **Store Vectors**: ChromaDB with metadata
5. **Build Index**: Cosine similarity search

### Retrieval Process

1. **Query Embedding**: Convert question to vector
2. **Similarity Search**: Find top-K most relevant chunks
3. **Context Building**: Format chunks for GPT
4. **Answer Generation**: GPT-4 with retrieved context
5. **Source Attribution**: Return source documents

### Performance

- **Indexing**: ~1-2 seconds per PDF page
- **Retrieval**: ~100-200ms for top-5 search
- **Generation**: ~2-3 seconds (GPT-4)
- **Total Query Time**: ~2-4 seconds end-to-end

### Storage

- **Vector DB**: `./chroma_db/` directory
- **Persistent**: Survives program restarts
- **Size**: ~1-2 KB per chunk (embedding + metadata)
- **Example**: 100-page PDF → ~500 chunks → ~1 MB

## 🔐 Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...        # Required for LLM & embeddings
```

### RAG Settings (rag_engine.py)

```python
chunk_size=800               # Tokens per chunk (500-1000)
chunk_overlap=100            # Overlap between chunks (50-200)
embedding_model="text-embedding-3-small"  # OpenAI model
collection_name="bandsaw_docs"  # ChromaDB collection
persist_directory="./chroma_db"  # Storage location
```

### LLM Settings (conversational_engine.py)

```python
model="gpt-4o"               # GPT model (bos birakilirsa .env icindeki LLM_MODEL)
temperature=0.7              # Creativity (0-2)
max_tokens=500               # Response length
```

## 📝 Rules.json Structure

```json
{
  "state_schema": {           // Field definitions
    "material_family": {...},
    "part_type": {...}
  },
  "questions": [              // User-facing questions
    {
      "id": "Q1",
      "question_text": "What material?",
      "maps_to_field": "material_family"
    }
  ],
  "router": {                 // Question flow
    "question_order": ["Q1", "Q2", ...],
    "conditional_questions": {...}
  },
  "rules": [                  // Business logic (26 rules)
    {
      "rule_id": "R1",
      "when": {...},          // Conditions
      "then": [...]           // Actions
    }
  ]
}
```

## 🚀 Production Deployment

### API Server (FastAPI)

```python
from fastapi import FastAPI
from llm.conversational_engine import ConversationalEngine

app = FastAPI()
engine = ConversationalEngine(
    rules_path="rules.json",
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    enable_rag=True
)

@app.post("/chat")
async def chat(message: str, session_id: str):

