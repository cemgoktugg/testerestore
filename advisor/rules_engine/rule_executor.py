"""
═══════════════════════════════════════════════════════════════════════════════
⚙️ RULE_EXECUTOR.PY - KURAL AKSİYONLARINI UYGULAMA MOTORUnnn
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya kuralların "then" (o zaman) kısmını çalıştırır. Koşul sağlandıktan 
sonra ne yapılacağını uygular. State'i değiştirir, değerler atar, uyarı ekler.

🛠️ AKSİYON TİPLERİ:

1. SET - Basit Atama
   {"set": ["blade_type", "BI_METAL_M42"]}
   → state.blade_type = "BI_METAL_M42"
   
   En sık kullanılan aksiyon. Direkt değer atar.

2. MAP - Değer Eşleştirme (Lookup Table)
   {"set": ["material_family", {
     "map": ["metal_family", {
       "CARBON_STEEL": "CARBON_STEEL",
       "UNKNOWN": "MIXED"
     }]
   }]}
   
   metal_family değerine bakıp tablodan karşılığını bulur.
   Örnek: metal_family="UNKNOWN" ise material_family="MIXED" olur

3. FORMAT - String Formatlama (SKU Üretimi)
   {"set": ["sku", {
     "format": ["{W}-{TK}-{TPI}-{L}", {
       "W": "blade_width_mm",
       "TK": {"fixed2": "blade_thickness_mm"},
       "TPI": "tooth_pitch",
       "L": "blade_length_mm"
     }]
   }]}
   
   Template + placeholder'ları birleştirir.
   fixed2: Sayıyı 2 ondalık basamakla formatlar
   Sonuç: "16-0.90-8/12-2240"

4. APPEND_WARNING_IF - Koşullu Uyarı Ekleme
   {"append_warning_if": {
     "cond": {"eq": ["coolant", "NO"]},
     "message": "Soğutma kullanılması önerilir"
   }}
   
   Koşul sağlanırsa warnings listesine ekler.
   Aynı uyarı tekrar eklenmez (unique check).

🔄 ÇALIŞMA AKIŞI:
1. Action listesini al (rule.then)
2. Her aksiyonu sırayla işle:
   a. Aksiyon tipini belirle (set/append_warning_if)
   b. İlgili fonksiyonu çağır
   c. State'i güncelle
3. Güncellenmiş state'i döndür

💡 ZİNCİRLEME ÇALIŞMA:
Bir aksiyonun çıktısı diğerinin girdisi olabilir:

Aksiyon 1: metal_family = "CARBON_STEEL"
  ↓
Aksiyon 2: material_family = map(metal_family)
  ↓
Aksiyon 3: tooth_pitch = "8/12" (material_family'ye göre)
  ↓
Aksiyon 4: sku = format(width, thickness, pitch, length)

🔧 KULLANIM ÖRNEĞİ:
    from rule_executor import RuleExecutor
    from models import SessionState
    
    # State oluştur
    state = SessionState(material="STEEL", thickness=3.0)
    
    # Actions tanımla
    actions = [
        {"set": ["blade_type", "BI_METAL"]},
        {"append_warning_if": {
            "cond": {"eq": ["coolant", "NO"]},
            "message": "Soğutma önerilir"
        }}
    ]
    
    # Çalıştır
    executor = RuleExecutor(state)
    updated_state = executor.execute_actions(actions)

⚠️ HATA YÖNETİMİ:
• Geçersiz aksiyon formatı → ValueError
• Bilinmeyen operasyon → ValueError
• State'te olmayan alan → AttributeError

📝 BAĞIMLILIKLAR:
• models.py: SessionState, Condition
• rule_evaluator.py: Koşul değerlendirme (append_warning_if için)
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Any, Dict
from .models import SessionState, Condition
from .rule_evaluator import evaluate_condition


class RuleExecutor:
    """Executes rule actions and modifies state."""
    
    def __init__(self, state: SessionState):
        """
        Initialize executor with current state.
        
        Args:
            state: Current session state (will be modified)
        """
        self.state = state
    
    def execute_actions(self, actions: list) -> 'SessionState':
        """
        Execute a list of actions.
        
        Args:
            actions: List of action objects (Pydantic models or dicts)
            
        Returns:
            Modified state
        """
        for action in actions:
            # Convert Pydantic model to dict if needed
            if hasattr(action, 'model_dump'):
                action = action.model_dump()
            
            if "set" in action:
                self._execute_set(action["set"])
            elif "append_warning_if" in action:
                self._execute_append_warning(action["append_warning_if"])
            elif "increment" in action:
                self._execute_increment(action["increment"])
            elif "append" in action:
                self._execute_append_list(action["append"])
            elif "calculate" in action:
                self._execute_calculate(action["calculate"])
        
        return self.state
    
    def _execute_set(self, set_action: list) -> None:
        """
        Execute SET action: set field to value.
        
        Format: ["field_name", value | {"map": [...]} | {"format": [...]}]
        """
        if len(set_action) != 2:
            raise ValueError(f"set action must have 2 elements: {set_action}")
        
        field_name, value_spec = set_action
        
        # Simple value
        if not isinstance(value_spec, dict):
            setattr(self.state, field_name, value_spec)
            return
        
        # MAP operation
        if "map" in value_spec:
            resolved_value = self._resolve_map(value_spec["map"])
            setattr(self.state, field_name, resolved_value)
            return
        
        # FORMAT operation
        if "format" in value_spec:
            resolved_value = self._resolve_format(value_spec["format"])
            setattr(self.state, field_name, resolved_value)
            return
        
        # Unknown operation
        raise ValueError(f"Unknown value specification: {value_spec}")
    
    def _resolve_map(self, map_spec: list) -> Any:
        """
        Resolve MAP operation: lookup value from mapping.
        
        Format: [source_field, {key: value}]
        """
        if len(map_spec) != 2:
            raise ValueError(f"map must have 2 elements: {map_spec}")
        
        source_field, mapping = map_spec
        source_value = getattr(self.state, source_field, None)
        
        return mapping.get(source_value, source_value)
    
    def _resolve_format(self, format_spec: list) -> str:
        """
        Resolve FORMAT operation: string formatting for SKU.
        
        Format: [template, {placeholder: field_name | {operation}}]
        Example: ["{W}-{TK}-{TPI}-{L}", {"W": "blade_width_mm", "TK": {"fixed2": "blade_thickness_mm"}}]
        """
        if len(format_spec) != 2:
            raise ValueError(f"format must have 2 elements: {format_spec}")
        
        template, placeholders = format_spec
        resolved_values = {}
        
        for key, value_spec in placeholders.items():
            # Simple field reference
            if isinstance(value_spec, str):
                value = getattr(self.state, value_spec, None)
                # Makine veritabanı genişliği 27.0 diye verir; SKU "27-…" olmalı
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
                resolved_values[key] = value

            # Nested operation (e.g., fixed2)
            elif isinstance(value_spec, dict):
                if "fixed2" in value_spec:
                    field_value = getattr(self.state, value_spec["fixed2"], None)
                    if field_value is not None:
                        resolved_values[key] = f"{float(field_value):.2f}"
                    else:
                        resolved_values[key] = None
                else:
                    raise ValueError(f"Unknown format operation: {value_spec}")
            else:
                resolved_values[key] = value_spec
        
        # Replace placeholders
        return template.format(**resolved_values)
    
    def _execute_append_warning(self, append_spec: Dict[str, Any]) -> None:
        """
        Execute APPEND_WARNING_IF: conditionally add warning.
        
        Format: {"cond": Condition, "message": str}
        """
        condition = append_spec.get("cond")
        message = append_spec.get("message")
        
        if condition is None or message is None:
            raise ValueError(f"append_warning_if must have 'cond' and 'message': {append_spec}")
        
        # Evaluate condition
        if evaluate_condition(condition, self.state):
            if message not in self.state.warnings:
                self.state.warnings.append(message)
    
    def _execute_increment(self, increment_spec: list) -> None:
        """
        Execute INCREMENT: increase numeric field by amount.
        
        Format: ["field_name", amount]
        Example: ["retry_count", 1] -> retry_count += 1
        """
        if len(increment_spec) != 2:
            raise ValueError(f"increment must have 2 elements: {increment_spec}")
        
        field_name, amount = increment_spec
        current_value = getattr(self.state, field_name, 0)
        
        # Handle None as 0
        if current_value is None:
            current_value = 0
        
        new_value = current_value + amount
        setattr(self.state, field_name, new_value)
    
    def _execute_append_list(self, append_spec: list) -> None:
        """
        Execute APPEND: add item to list field.
        
        Format: ["field_name", value]
        Example: ["selected_blades", "BI_METAL_M42"]
        """
        if len(append_spec) != 2:
            raise ValueError(f"append must have 2 elements: {append_spec}")
        
        field_name, value = append_spec
        current_list = getattr(self.state, field_name, None)
        
        # Initialize as list if None
        if current_list is None:
            current_list = []
            setattr(self.state, field_name, current_list)
        
        # Append if not already in list
        if value not in current_list:
            current_list.append(value)
    
    def _execute_calculate(self, calc_spec: Dict[str, Any]) -> None:
        """
        Execute CALCULATE: perform mathematical operation.
        
        Format: {
            "field": "result_field",
            "operation": "add|subtract|multiply|divide|min|max",
            "operands": [value1, value2, ...]  # Can be field names or literals
        }
        
        Example: {
            "field": "total_cost",
            "operation": "multiply",
            "operands": ["blade_count", "unit_price"]
        }
        """
        field_name = calc_spec.get("field")
        operation = calc_spec.get("operation")
        operands = calc_spec.get("operands", [])
        
        if not field_name or not operation:
            raise ValueError(f"calculate must have 'field' and 'operation': {calc_spec}")
        
        # Resolve operand values
        values = []
        for operand in operands:
            if isinstance(operand, str) and hasattr(self.state, operand):
                # Field reference
                value = getattr(self.state, operand, 0)
                values.append(value if value is not None else 0)
            else:
                # Literal value
                values.append(operand)
        
        # Perform operation
        result = None
        if operation == "add":
            result = sum(values)
        elif operation == "subtract":
            result = values[0] - sum(values[1:]) if len(values) > 1 else values[0]
        elif operation == "multiply":
            result = 1
            for v in values:
                result *= v
        elif operation == "divide":
            if len(values) < 2 or values[1] == 0:
                raise ValueError(f"Invalid operands for divide: {values}")
            result = values[0] / values[1]
        elif operation == "min":
            result = min(values) if values else 0
        elif operation == "max":
            result = max(values) if values else 0
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        setattr(self.state, field_name, result)
