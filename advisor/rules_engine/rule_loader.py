"""
═══════════════════════════════════════════════════════════════════════════════
📂 RULE_LOADER.PY - JSON DOSYASI YÜKLEYICI VE VALİDE EDİCİ
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya rules.json dosyasını okur ve Python objelerine dönüştürür. Bir 
tercüman gibi çalışır: JSON (metin) → Pydantic (tip güvenli Python nesneleri)

🔄 İŞ AKIŞI:
1. rules.json dosyasını aç ve oku
2. JSON'ı Python dictionary'e çevir
3. Pydantic ile validate et (hata varsa exception fırlat)
4. RulesEngineConfig objesi döndür

📦 ANA FONKSİYONLAR:

load() - Dosyayı Yükle ve Doğrula
    • JSON dosyasını okur
    • Pydantic ile validate eder
    • Hatalı JSON varsa açıklayıcı hata mesajı verir
    • Başarılı ise RulesEngineConfig objesi döner

get_question_by_id(id) - ID ile Soru Bul
    • Belirli bir soruyu ID'sine göre getirir
    • Hızlı erişim için kullanılır
    • Bulunamazsa None döner

get_rule_by_id(id) - ID ile Kural Bul
    • Belirli bir kuralı ID'sine göre getirir
    • Debug ve test için kullanışlı

get_router_order() - Soru Sırasını Al
    • Hangi sorunun hangi sırada sorulacağını döner
    • QuestionRouter tarafından kullanılır

get_defaults() - Başlangıç Değerlerini Al
    • Session başladığında otomatik set edilecek değerleri döner
    • Örnek: warnings: [], confidence: "UNKNOWN"

get_input_normalization() - Normalizasyon Haritasını Al
    • Kullanıcı girdilerini standartlaştırma kuralları
    • Örnek: "E", "EVET", "YES" → hepsi "YES" olur

💡 NEDEN AYRI MODÜL?
• Tek Kaynak Prensibi: İş mantığı sadece JSON'da
• Kolay Değişiklik: JSON değişince kod değişmeden çalışır
• Validasyon: Yanlış JSON hemen tespit edilir
• Test Edilebilir: Mock JSON ile test edilebilir

🔧 KULLANIM ÖRNEĞİ:
    loader = RulesLoader("rules.json")
    
    # Yükle ve validate et
    config = loader.load()  # Hata varsa exception
    
    # Soruları al
    question = loader.get_question_by_id("Q01")
    
    # Varsayılanları al
    defaults = loader.get_defaults()

⚠️ HATA YÖNETİMİ:
• FileNotFoundError: Dosya bulunamazsa
• ValueError: JSON geçersizse veya Pydantic validasyonu başarısızsa

📝 BAĞIMLILIKLAR:
• models.py: Tüm Pydantic modelleri
• json: Standart Python kütüphanesi
• pathlib: Dosya yolu işlemleri
═══════════════════════════════════════════════════════════════════════════════
"""

import json
from pathlib import Path
from typing import Dict, Any
from .models import RulesEngineConfig, Question, Rule, RouterEntry


class RulesLoader:
    """Loads and parses rules.json into typed Python objects."""
    
    def __init__(self, rules_path: str | Path):
        """
        Initialize the rules loader.
        
        Args:
            rules_path: Path to rules.json file
        """
        self.rules_path = Path(rules_path)
        self.config: RulesEngineConfig | None = None
        self._raw_data: Dict[str, Any] = {}
    
    def load(self) -> RulesEngineConfig:
        """
        Load and validate rules.json.
        
        Returns:
            Validated RulesEngineConfig object
            
        Raises:
            FileNotFoundError: If rules.json doesn't exist
            ValueError: If JSON is invalid or validation fails
        """
        if not self.rules_path.exists():
            raise FileNotFoundError(f"Rules file not found: {self.rules_path}")
        
        # Read raw JSON
        with open(self.rules_path, 'r', encoding='utf-8') as f:
            self._raw_data = json.load(f)
        
        # Validate and parse with Pydantic
        try:
            self.config = RulesEngineConfig(**self._raw_data)
        except Exception as e:
            raise ValueError(f"Failed to validate rules.json: {e}")
        
        return self.config
    
    def get_question_by_id(self, question_id: str) -> Question | None:
        """Get a question by its ID."""
        if not self.config:
            raise RuntimeError("Rules not loaded. Call load() first.")
        
        for question in self.config.questions:
            if question.id == question_id:
                return question
        return None
    
    def get_rule_by_id(self, rule_id: str) -> Rule | None:
        """Get a rule by its ID."""
        if not self.config:
            raise RuntimeError("Rules not loaded. Call load() first.")
        
        for rule in self.config.rules:
            if rule.id == rule_id:
                return rule
        return None
    
    def get_router_order(self) -> list[RouterEntry]:
        """Get the question router order."""
        if not self.config:
            raise RuntimeError("Rules not loaded. Call load() first.")
        
        return self.config.router.get("next_question_order", [])
    
    def get_defaults(self) -> Dict[str, Any]:
        """Get default state values."""
        if not self.config:
            raise RuntimeError("Rules not loaded. Call load() first.")
        
        return self.config.defaults.get("set_on_start", {}) if self.config.defaults else {}
    
    def get_input_normalization(self) -> Dict[str, Dict[str, str]]:
        """Get input normalization maps."""
        if not self.config:
            raise RuntimeError("Rules not loaded. Call load() first.")
        
        return self.config.input_normalization.get("maps", {}) if self.config.input_normalization else {}
