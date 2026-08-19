"""
═══════════════════════════════════════════════════════════════════════════════
📦 MODELS.PY - VERİ YAPILARI VE TİP TANIMLARI
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya projenin temel veri yapılarını tanımlar. Her veri tipinin nasıl 
olması gerektiğini belirler ve Pydantic ile otomatik validasyon sağlar.

🏗️ İÇERDİĞİ MODELLER:

1. SessionState - Kullanıcı Oturum Durumu
   • 20+ alan içerir (material, thickness, sku, warnings, vb.)
   • Her alan başlangıçta None, kullanıcı bilgi verdikçe dolar
   • Pydantic sayesinde tip güvenli (yanlış tip girilirse hata)

2. Condition - Mantıksal Koşul Yapısı  
   • Kuralların "when" (eğer) kısmını temsil eder
   • İç içe koşulları destekler (recursive)
   • Operatörler: eq, exists, all, any, not

3. Action - Kural Aksiyonları
   • SET: Basit atama
   • MAP: Değer eşleştirme tablosu
   • FORMAT: String formatlama (SKU üretimi için)
   • APPEND_WARNING_IF: Koşullu uyarı ekleme

4. Rule - İş Kuralı
   • Her kural: ID + when (koşul) + then (aksiyonlar)
   • JSON'daki her kural bu yapıya dönüşür

5. Question - Kullanıcıya Sorulacak Soru
   • Soru metni, tipi, seçenekleri
   • Hangi state alanına yazılacağını belirtir

6. RouterEntry - Soru Yönlendirme Girdisi
   • Hangi sorunun ne zaman sorulacağını belirler
   • Koşullu soru akışı için kullanılır

7. RulesEngineConfig - Tüm rules.json'ın Karşılığı
   • Ana yapı: tüm kurallar, sorular, router, testler
   • Bu model rules.json'ı Python objesine çevirir

💡 NEDEN ÖNEMLİ?
• Tip Güvenliği: IDE otomatik tamamlama yapar, hataları erkenden yakalar
• Validasyon: Pydantic otomatik kontrol eder
• Dokümantasyon: Kod kendini açıklar
• Maintenance: Yapı değişince tüm proje otomatik adapte olur

🔧 KULLANIM ÖRNEĞİ:
    from models import SessionState, Rule
    
    # Yeni state oluştur
    state = SessionState(material="STEEL", thickness=3.0)
    
    # State'e erişim (tip güvenli!)
    print(state.material)  # IDE autocomplete çalışır
    state.thickness = "abc"  # Pydantic hata verir (float bekliyordu)

📝 GÜNCELLEMELER:
• v1.0: İlk versiyon (temel modeller)
• v1.2: Recursive Condition desteği eklendi
• v1.4: Test scenario modelleri eklendi
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# STATE MODELS
# ============================================================================

class SessionState(BaseModel):
    """Represents the current state of a user session."""
    
    goal: Optional[str] = None
    material_category: Optional[str] = None
    
    metal_family: Optional[str] = None
    metal_part_type: Optional[str] = None
    
    material_family: Optional[str] = None
    part_type: Optional[str] = None
    
    profile_wall_thickness_bucket: Optional[str] = None
    solid_max_diameter_bucket: Optional[str] = None
    solid_thickness_bucket: Optional[str] = None  # For solid bar thickness
    sheet_thickness_bucket: Optional[str] = None
    max_cross_section_bucket: Optional[str] = None
    
    machine_class: Optional[str] = None
    machine_manufacturer: Optional[str] = None
    machine_model: Optional[str] = None
    blade_length_mm: Optional[int] = None
    coolant: Optional[str] = None
    
    blade_type: Optional[str] = None
    tooth_pitch: Optional[str] = None
    tooth_geometry: Optional[str] = None
    set_type: Optional[str] = None
    
    blade_width_mm: Optional[float] = None  # 27.0, 34.0 gibi ondalikli degerler gelir
    blade_thickness_mm: Optional[float] = None
    coolant_note: Optional[str] = None
    
    disclaimer: Optional[str] = None
    
    sku: Optional[str] = None
    confidence: str = "UNKNOWN"
    warnings: List[str] = Field(default_factory=list)
    
    # Quality and Performance fields (v1.7.0)
    material_hardness: Optional[Literal["SOFT", "MEDIUM", "HARD"]] = None
    user_priority: Optional[Literal["SPEED", "LONGEVITY", "BALANCED"]] = None
    surface_finish_requirement: Optional[Literal["ROUGH", "STANDARD", "FINE"]] = None
    recommended_cutting_speed_m_min: Optional[float] = None
    estimated_blade_life_meters: Optional[int] = None
    
    # Ansiklopedi - Bıçak alıştırma (run-in) alanları (v1.8.0)
    run_in_required: Optional[bool] = None
    run_in_speed_percent: Optional[int] = None
    run_in_feed_percent: Optional[int] = None
    run_in_area_cm2: Optional[int] = None
    cut_type: Optional[Literal["STRAIGHT", "MITRE", "CONTOUR"]] = None
    
    # New fields for testing and advanced features
    retry_count: Optional[int] = None
    selected_blades: Optional[List[str]] = None
    total_cost: Optional[float] = None
    unit_price: Optional[float] = None
    blade_count: Optional[int] = None
    total_dimension: Optional[float] = None
    min_thickness: Optional[float] = None
    max_thickness: Optional[float] = None
    safety_check: Optional[str] = None
    step: Optional[str] = None
    
    model_config = ConfigDict(extra="forbid")  # Raise error on unknown fields


# ============================================================================
# QUESTION MODELS
# ============================================================================

class QuestionOption(BaseModel):
    """A single option in a select question."""
    value: str
    label: str


class Question(BaseModel):
    """Represents a question to ask the user."""
    
    id: str
    text: str
    type: Literal["single_select", "multi_select", "number", "text"]
    writes_to: str
    options: Optional[List[QuestionOption]] = None
    rules: Optional[Dict[str, Any]] = None  # For number validation (min, max)
    

# ============================================================================
# RULE CONDITION MODELS
# ============================================================================

class Condition(BaseModel):
    """Base condition model. Supports nested conditions."""
    
    # Simple conditions
    eq: Optional[List[Any]] = None  # ["field", "value"]
    exists: Optional[List[str]] = None  # ["field"]
    
    # Comparison operators
    gt: Optional[List[Any]] = None  # ["field", value] - greater than
    lt: Optional[List[Any]] = None  # ["field", value] - less than
    gte: Optional[List[Any]] = None  # ["field", value] - greater than or equal
    lte: Optional[List[Any]] = None  # ["field", value] - less than or equal
    range: Optional[List[Any]] = None  # ["field", min, max]
    
    # String/List operators
    contains: Optional[List[Any]] = None  # ["field", substring]
    in_: Optional[List[Any]] = Field(None, alias="in")  # ["field", [value1, value2, ...]]
    regex: Optional[List[Any]] = None  # ["field", "pattern"]
    
    # Logical operators
    all: Optional[List["Condition"]] = None  # AND
    any: Optional[List["Condition"]] = None  # OR
    not_: Optional["Condition"] = Field(None, alias="not")  # NOT
    
    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# RULE ACTION MODELS
# ============================================================================

class MapOperation(BaseModel):
    """Map operation: maps field value to another value."""
    map: List[Any]  # [field_name, {key: value}]


class FormatOperation(BaseModel):
    """Format operation: string formatting for SKU."""
    format: List[Any]  # [template, {placeholder: field_name}]


class ActionSet(BaseModel):
    """Set action: sets a field value."""
    set: List[Any]  # [field_name, value | MapOperation | FormatOperation]


class ActionAppendWarning(BaseModel):
    """Append warning action: conditionally adds a warning."""
    append_warning_if: Dict[str, Any]  # {"cond": Condition, "message": str}


class ActionIncrement(BaseModel):
    """Increment action: increases a numeric field."""
    increment: List[Any]  # [field_name, amount]


class ActionAppendList(BaseModel):
    """Append to list action: adds item to a list field."""
    append: List[Any]  # [field_name, value]


class ActionCalculate(BaseModel):
    """Calculate action: performs mathematical operation."""
    calculate: Dict[str, Any]  # {"field": str, "operation": str, "operands": List}


# Union of all possible actions
Action = Union[ActionSet, ActionAppendWarning, ActionIncrement, ActionAppendList, ActionCalculate, Dict[str, Any]]


# ============================================================================
# RULE MODEL
# ============================================================================

class Rule(BaseModel):
    """Represents a single business rule."""
    
    id: str
    when: Condition
    then: List[Action]
    priority: Optional[int] = 50  # 1-100: lower = higher priority (default: 50)
    category: Optional[str] = None  # SAFETY/MATERIAL/DIMENSION/SELECTION/OPTIMIZATION
    weight: Optional[int] = 5  # 1-10: scoring weight (default: 5)
    comment: Optional[str] = Field(None, alias="__comment")
    
    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# ROUTER MODELS
# ============================================================================

class RouterEntry(BaseModel):
    """Represents a single router entry for question ordering."""
    
    id: str
    ask_if_missing: Optional[List[str]] = None
    ask_only_if: Optional[List[Condition]] = None
    comment: Optional[str] = Field(None, alias="__comment")
    
    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# TEST SCENARIO MODELS
# ============================================================================

class TestScenario(BaseModel):
    """Represents a test scenario for validation."""
    
    name: str
    inputs: Dict[str, Any]
    expected_outputs: Dict[str, Any]
    expected_warnings: Optional[List[str]] = None
    comment: Optional[str] = Field(None, alias="__comment")
    
    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# MAIN RULES ENGINE CONFIG
# ============================================================================

class RulesEngineConfig(BaseModel):
    """Complete rules.json structure."""
    
    engine_id: str
    version: str
    product_type: str
    locale: str
    
    state_schema: Dict[str, Any]
    questions: List[Question]
    router: Dict[str, List[RouterEntry]]
    rules: List[Rule]
    
    defaults: Optional[Dict[str, Any]] = None
    input_normalization: Optional[Dict[str, Any]] = None
    validation_rules: Optional[List[Dict[str, Any]]] = None
    navigation: Optional[Dict[str, Any]] = None
    rules_execution: Optional[Dict[str, Any]] = None
    test_scenarios: Optional[List[TestScenario]] = None
    output_contract: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(extra="allow")  # Allow __comment fields


# Update forward refs for recursive models
Condition.model_rebuild()
