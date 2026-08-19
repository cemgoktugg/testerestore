"""
═══════════════════════════════════════════════════════════════════════════════
💾 STATE_MANAGER.PY - OTURUM DURUMU YÖNETİCİSİ
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya kullanıcı oturumunun state'ini (durumunu) yönetir. Her kullanıcının 
hangi bilgileri verdiğini takip eder, değişiklikleri kaydeder, geri alma 
özelliği sağlar. State'in tüm yaşam döngüsünden sorumludur.

📊 STATE YAŞAM DÖNGÜSÜ:
1. Başlangıç → Varsayılan değerlerle SessionState oluştur
2. Güncelleme → Kullanıcı bilgi verdikçe alanları doldur
3. Snapshot → Önemli noktalarda state'i kaydet
4. Rollback → Gerekirse önceki haline dön
5. Export/Import → State'i kaydet/yükle (Redis, DB için)

🛠️ ANA FONKSİYONLAR:

__init__(defaults) - Yöneticiyi Başlat
    • Yeni SessionState oluşturur
    • Varsayılan değerleri uygular
    • History listesini başlatır

reset() - Sıfırla
    • State'i başlangıç haline döndürür
    • History'yi temizler
    • Yeni kullanıcı oturumu için kullanılır

update_field(field, value) - Tek Alan Güncelle
    • Belirtilen alanı günceller
    • Alan yoksa hata verir (typo koruması)
    • En sık kullanılan fonksiyon

update_fields(updates) - Çoklu Alan Güncelle
    • Birden fazla alanı tek seferde günceller
    • Dictionary olarak alan:değer alır

snapshot() - Anlık Görüntü Al
    • Mevcut state'i history'ye kaydeder
    • Deep copy yapar (referans değil kopya)
    • Geri alma için checkpoint oluşturur

rollback() - Geri Al
    • History'deki son state'e döner
    • Yanlış işlemleri iptal etmek için
    • History boşsa False döner

is_field_set(field) - Alan Dolu mu Kontrol Et
    • Alanın None veya boş string olmadığını kontrol eder
    • Koşullu soru akışı için kullanılır

get_field(field) - Alan Değerini Al
    • Belirtilen alanın değerini döndür
    • Alan yoksa None döner

to_dict() / from_dict() - Serileştirme
    • State'i dictionary'ye çevir (kaydetmek için)
    • Dictionary'den state yükle
    • Redis, database entegrasyonu için kritik

get_missing_fields(required_fields) - Eksik Alanları Bul
    • Hangi zorunlu alanların boş olduğunu döner
    • Soru yönlendirme için kullanılır

💡 NEDEN STATE YÖNETİMİ ÖNEMLİ?
• Kullanıcı Takibi: Her kullanıcının durumunu ayrı tutabilirsiniz
• Geri Alma: Hata yapınca önceki haline dönebilirsiniz
• Persistence: State'i kaydedip daha sonra devam edebilirsiniz
• Multi-step Flow: Kullanıcı birden fazla adımda bilgi verebilir

🔧 KULLANIM ÖRNEĞİ:
    manager = StateManager(defaults={"confidence": "UNKNOWN"})
    
    # Alan güncelle
    manager.update_field("material", "STEEL")
    
    # Snapshot al
    manager.snapshot()
    
    # Daha fazla değişiklik
    manager.update_field("thickness", 5)
    
    # Hata yaptım, geri al!
    manager.rollback()  # material="STEEL", thickness=None
    
    # State'i kaydet
    state_dict = manager.to_dict()
    # Redis'e yaz: redis.set(session_id, json.dumps(state_dict))

📦 HISTORY YÖNETİMİ:
• Her snapshot() çağrısı state'in kopyasını history'ye ekler
• Memory'de tutulur (production'da Redis kullanılmalı)
• Sınırsız history (gerekirse limit eklenebilir)

⚠️ DİKKAT EDİLMESİ GEREKENLER:
• update_field() çağrılınca history OTOMATİK KAYBOLMAZ!
• Snapshot almadan rollback çalışmaz
• Deep copy kullanıldığı için memory safe

📝 BAĞIMLILIKLAR:
• models.py: SessionState modeli
• copy.deepcopy: Derin kopyalama için
═══════════════════════════════════════════════════════════════════════════════
"""

from copy import deepcopy
from typing import Dict, Any
from .models import SessionState


class StateManager:
    """Manages session state with history and validation."""
    
    def __init__(self, defaults: Dict[str, Any] | None = None):
        """
        Initialize state manager.
        
        Args:
            defaults: Default field values to set on initialization
        """
        self.defaults = defaults or {}
        self.state = self._create_initial_state()
        self.history: list[SessionState] = []
    
    def _create_initial_state(self) -> SessionState:
        """Create a new state with defaults applied."""
        state = SessionState()
        
        # Apply defaults
        for field, value in self.defaults.items():
            if hasattr(state, field):
                setattr(state, field, value)
        
        return state
    
    def reset(self) -> None:
        """Reset state to initial defaults."""
        self.state = self._create_initial_state()
        self.history = []
    
    def snapshot(self) -> None:
        """Save current state to history."""
        self.history.append(deepcopy(self.state))
    
    def rollback(self) -> bool:
        """
        Rollback to previous state.
        
        Returns:
            True if rollback successful, False if no history
        """
        if not self.history:
            return False
        
        self.state = self.history.pop()
        return True
    
    def update_field(self, field_name: str, value: Any) -> None:
        """
        Update a single field value.
        
        Args:
            field_name: Name of field to update
            value: New value
            
        Raises:
            AttributeError: If field doesn't exist
        """
        if not hasattr(self.state, field_name):
            raise AttributeError(f"State has no field: {field_name}")
        
        setattr(self.state, field_name, value)
    
    def update_fields(self, updates: Dict[str, Any]) -> None:
        """
        Update multiple fields at once.
        
        Args:
            updates: Dictionary of field_name -> value
        """
        for field_name, value in updates.items():
            self.update_field(field_name, value)
    
    def get_field(self, field_name: str) -> Any:
        """
        Get field value.
        
        Args:
            field_name: Name of field
            
        Returns:
            Field value or None if not set
        """
        return getattr(self.state, field_name, None)
    
    def is_field_set(self, field_name: str) -> bool:
        """
        Check if field has a non-None value.
        
        Args:
            field_name: Name of field
            
        Returns:
            True if field is set
        """
        value = self.get_field(field_name)
        return value is not None and value != ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Export state as dictionary."""
        return self.state.model_dump()
    
    def from_dict(self, state_dict: Dict[str, Any]) -> None:
        """
        Import state from dictionary.
        
        Args:
            state_dict: Dictionary representation of state
        """
        self.state = SessionState(**state_dict)
    
    def get_missing_fields(self, required_fields: list[str]) -> list[str]:
        """
        Get list of required fields that are not set.
        
        Args:
            required_fields: List of field names to check
            
        Returns:
            List of missing field names
        """
        return [
            field for field in required_fields
            if not self.is_field_set(field)
        ]
