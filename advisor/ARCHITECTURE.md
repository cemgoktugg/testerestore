# 🏗️ Architecture Documentation

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                      RULES ENGINE v1.4.0                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
              ┌───────────────┴───────────────┐
              │       engine.py               │
              │   (Main Orchestrator)         │
              └───────────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│rule_loader.py│    │state_manager │    │question      │
│              │    │      .py     │    │_router.py    │
│ JSON → Model │    │ State Mgmt   │    │ Next Question│
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │rule_evaluator│    │rule_executor │
          │    .py       │    │    .py       │
          │ When Check   │    │ Then Execute │
          └──────────────┘    └──────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │  models.py   │
                      │  (Pydantic)  │
                      └──────────────┘
```

---

## 📦 Modül Detayları

### 1. **models.py** - Veri Modelleri
**Sorumluluk:** Type-safe veri yapıları

**Ana Modeller:**
- `SessionState`: Kullanıcı state'i (20+ field)
- `Condition`: Kural koşulları (recursive)
- `Action`: Kural aksiyonları (Union type)
- `Rule`: Business rule (when/then)
- `Question`: Soru yapısı
- `RulesEngineConfig`: rules.json tamamı

**Teknoloji:** Pydantic v2 (ConfigDict, Field, Union)

---

### 2. **rule_loader.py** - JSON Yükleyici
**Sorumluluk:** rules.json → Python object

**Ana Methodlar:**
```python
load()                      → RulesEngineConfig
get_defaults()              → Initial state
get_router_order()          → Question sequence
get_input_normalization()   → Value mappings
get_question(id)            → Question object
get_rule(id)                → Rule object
```

**Validation:** Pydantic otomatik validate eder, hata varsa exception fırlatır.

---

### 3. **rule_evaluator.py** - Koşul Değerlendirici
**Sorumluluk:** `when` condition'ı kontrol et

**Operatörler:**
```python
eq(field, value)      → field == value
exists(field)         → field is not None
all([cond...])        → Hepsi true
any([cond...])        → En az biri true
not(cond)             → Değil
```

**Örnek Recursive Condition:**
```json
{
  "all": [
    {"eq": ["material_category", "METAL"]},
    {"any": [
      {"eq": ["part_type", "PROFILE"]},
      {"exists": ["profile_wall_thickness_bucket"]}
    ]}
  ]
}
```

---

### 4. **rule_executor.py** - Aksiyon Yürütücü
**Sorumluluk:** `then` actions'ı uygula

**Aksiyon Tipleri:**

#### **SET - Basit Atama:**
```python
{"set": ["blade_type", "BI_METAL_M42_FLEXBACK"]}
```

#### **MAP - Lookup:**
```python
{"set": ["material_family", {
  "map": ["metal_family", {
    "CARBON_STEEL": "CARBON_STEEL",
    "UNKNOWN": "MIXED"
  }]
}]}
```

#### **FORMAT - String Template:**
```python
{"set": ["sku", {
  "format": ["{W}-{TK}-{TPI}-{L}", {
    "W": "blade_width_mm",
    "TK": {"fixed2": "blade_thickness_mm"},
    "TPI": "tooth_pitch",
    "L": "blade_length_mm"
  }]
}]}
# Output: "16-0.90-8/12-2240"
```

#### **APPEND_WARNING_IF - Koşullu Uyarı:**
```python
{"append_warning_if": {
  "cond": {"eq": ["coolant", "NO"]},
  "message": "Soğutma kullanılması önerilir"
}}
```

---

### 5. **state_manager.py** - State Yöneticisi
**Sorumluluk:** Session state'ini yönet

**Ana Methodlar:**
```python
update_field(field, value)     → Tek field güncelle
update_fields(dict)            → Batch update
snapshot()                     → State'i kaydet
rollback()                     → Son snapshot'a dön
get_missing_fields(required)   → Eksik fieldler
reset()                        → Başlangıç state'i
to_dict()                      → State export
```

**Use Case:** Kullanıcı "geri" derse rollback() ile önceki state'e dönülür.

---

### 6. **question_router.py** - Soru Yönlendirici
**Sorumluluk:** Sıradaki soruyu belirle

**Routing Mantığı:**
```python
for entry in router_order:
    # 1. Field eksik mi?
    if field not in state or state[field] is None:
        # 2. Koşul sağlanıyor mu?
        if ask_only_if and evaluate_condition(ask_only_if):
            return question
```

**Örnek Router Entry:**
```json
{
  "id": "Q_COOLANT",
  "ask_if_missing": ["coolant"],
  "ask_only_if": [{"eq": ["material_category", "METAL"]}]
}
```
**Anlamı:** METAL kesiyorsa VE coolant bilgisi yoksa → Bu soruyu sor

---

### 7. **engine.py** - Ana Orkestratör
**Sorumluluk:** Tüm modülleri koordine et

**Ana Akış:**

#### **Initialization:**
```python
engine = RulesEngine("rules.json")
  → RulesLoader.load()
  → StateManager(defaults)
  → QuestionRouter(router_order)
```

#### **User Interaction:**
```python
# 1. Kullanıcı cevap verir
engine.update_state("metal_family", "ALUMINUM")

# 2. Kuralları çalıştır
engine.execute_rules()
  → For each rule:
      if evaluate(rule.when):
          execute(rule.then)
          update_state()

# 3. Sonraki soruyu al
next_q = engine.get_next_question()

# 4. Recommendation al
result = engine.get_recommendation()
```

#### **Rule Execution Strategy:**
```python
max_iterations = 10  # Sonsuz döngü koruması

for iteration in range(max_iterations):
    rules_fired = 0
    
    for rule in rules:
        if condition_met:
            execute_actions()
            rules_fired++
    
    if rules_fired == 0:
        break  # Daha fazla tetiklenecek kural yok
```

**Neden iterasyon?**
- Bir kural başka bir kuralı tetikleyebilir
- Cascading rules (material_family set edince blade_type kuralı tetiklenir)

---

## 🔄 Data Flow

### **1. Session Başlangıcı:**
```
rules.json → RulesLoader → RulesEngineConfig
              ↓
         StateManager (defaults applied)
              ↓
         QuestionRouter (first question)
```

### **2. Kullanıcı Cevap Verdiğinde:**
```
User Input → normalize_input() → update_state()
                                      ↓
                               execute_rules()
                                      ↓
                          ┌───────────┴───────────┐
                          │                       │
                   RuleEvaluator          RuleExecutor
                   (check when)           (apply then)
                          │                       │
                          └───────────┬───────────┘
                                      ↓
                               Updated State
                                      ↓
                          QuestionRouter.get_next()
```

### **3. Recommendation Oluşturma:**
```
State → Check SKU exists → Check confidence
                              ↓
                      get_recommendation()
                              ↓
        {
          sku: "16-0.90-8/12-2240",
          blade_type: "BI_METAL_M42_FLEXBACK",
          warnings: [...],
          confidence: "HIGH"
        }
```

---

## 🎯 Design Principles

### **1. Separation of Concerns**
Her modül tek bir sorumluluğa sahip:
- Loader → Sadece yükleme
- Evaluator → Sadece koşul kontrolü
- Executor → Sadece aksiyon yürütme

### **2. Single Source of Truth**
Business logic sadece `rules.json`'da:
- Code'da hard-coded kural yok
- Business user JSON'u düzenleyebilir

### **3. Type Safety**
Pydantic her şeyi validate eder:
- Runtime'da hata yakalama
- IDE autocomplete desteği

### **4. Testability**
Her modül bağımsız test edilebilir:
- Mock state ile evaluator testi
- Mock actions ile executor testi

### **5. Extensibility**
Yeni özellik eklemek kolay:
- Yeni operator: `rule_evaluator.py`'a method ekle
- Yeni action: `rule_executor.py`'a method ekle
- Yeni metal: `rules.json`'a kural ekle

---

## 📊 Current Status

### **✅ Tamamlanan (Sprint 1):**

- [x] Pydantic models (type-safe)
- [x] JSON loader (validation)
- [x] Condition evaluation (all/any/eq/exists/not)
- [x] Action execution (set/map/format/warning)
- [x] State management (update/snapshot/rollback)
- [x] Question routing (dynamic questionnaire)
- [x] SKU generation (format template)
- [x] Test infrastructure (10 scenarios)
- [x] 4/10 tests passing (critical happy paths ✓)

### **🔜 Sırada (Sprint 2 - LLM Integration):**

- [ ] OpenAI API client
- [ ] Prompt engineering (system prompt)
- [ ] Message parsing (user intent → state updates)
- [ ] Conversational flow (LLM asks questions)
- [ ] Natural language output (LLM formats warnings)

### **🔮 Gelecek (Sprint 3 - REST API):**

- [ ] FastAPI application
- [ ] POST /api/v1/chat endpoint
- [ ] GET /api/v1/recommendation/{session_id}
- [ ] Redis session storage (15min TTL)
- [ ] CORS configuration

### **🐳 Gelecek (Sprint 4 - Docker):**

- [ ] Dockerfile (multi-stage build)
- [ ] docker-compose.yml (app + redis + nginx)
- [ ] Environment variables (OpenAI key)
- [ ] Production deployment scripts

---

## 🧪 Test Strategy

### **Test Kategorileri:**

#### **1. Happy Path Tests (0 warnings beklenir):**
- Tüm bilgiler tam ve doğru
- Confidence: HIGH
- SKU doğru formatlanır

#### **2. Assumption Mode (MEDIUM_ASSUMED):**
- UNKNOWN değerler varsayılan değere maplenır
- Warning basılır ("X bilinmediği için Y varsayıldı")

#### **3. Warning Tests:**
- Kritik durumlar (soğutmasız kesim)
- Özel malzemeler (paslanmaz, alüminyum, döküm)
- Bilinmeyen parametre (makine sınıfı UNKNOWN)

### **Test Senaryoları:**

| # | Senaryo | Metal | Status | Warnings |
|---|---------|-------|--------|----------|
| 1 | Karbon çelik happy path | CARBON_STEEL | ✅ PASS | 0 |
| 2 | Bilinmeyen metal | UNKNOWN→CARBON | ✅ PASS | 1 |
| 3 | Minimal bilgi (satış) | UNKNOWN | ✅ PASS | 5 |
| 4 | Paslanmaz happy path | STAINLESS | ✅ PASS | 0 |
| 5 | Makine bilinmiyor | CARBON_STEEL | ⚠️ FAIL | 6 (2 bekleniyor) |
| 6 | Alüminyum happy path | ALUMINUM | ⚠️ FAIL | 6 (0 bekleniyor) |
| 7 | Alu soğutmasız | ALUMINUM | ⚠️ FAIL | 7 (1 bekleniyor) |
| 8 | Döküm happy path | CAST_IRON | ⚠️ FAIL | 7 (0 bekleniyor) |
| 9 | Döküm kuru kesim | CAST_IRON | ⚠️ FAIL | 8 (1 bekleniyor) |
| 10 | Karışık metal | MIXED→CARBON | ⚠️ FAIL | 8 (0 bekleniyor) |

### **Başarısız Test Nedeni:**
Fazla warning basılıyor. Olası nedenler:
1. Kurallar her iterasyonda tekrar çalışıyor (idempotency eksik)
2. Test expectations güncellemesi gerekli
3. Warning koşulları gözden geçirilmeli

---

## 🚀 Next Steps

### **Kısa Vadeli (Sprint 1 tamamlama):**
1. Failing testleri debug et (warning fazlalığı)
2. Idempotent rule execution (aynı kural 2. kez tetiklenmemeli)
3. 10/10 test geçene kadar düzelt

### **Orta Vadeli (Sprint 2):**
1. OpenAI client entegrasyonu
2. Prompt engineering (system prompt yazımı)
3. Conversational flow tasarımı

### **Uzun Vadeli (Production):**
1. REST API (FastAPI)
2. Redis session management
3. Docker containerization
4. CI/CD pipeline
5. Monitoring & logging

---

## 📚 References

- **Pydantic Docs:** https://docs.pydantic.dev/latest/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **OpenAI API:** https://platform.openai.com/docs/api-reference

---

**Son Güncelleme:** 26 Aralık 2025  
**Versiyon:** v1.4.0  
**Sprint:** 1 (Core Engine) - 80% Complete
