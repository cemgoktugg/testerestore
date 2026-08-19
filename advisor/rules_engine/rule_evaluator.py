"""
═══════════════════════════════════════════════════════════════════════════════
🔍 RULE_EVALUATOR.PY - KOŞUL DEĞERLENDİRME MOTORUnnn
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya kuralların "when" (eğer) kısmını değerlendirir. Her kural için 
"Bu kural şimdi çalışmalı mı?" sorusunu cevaplar. Deterministik mantık 
işlemcisidir - aynı state'te her zaman aynı sonucu verir.

🧠 MANTIKSAL OPERATÖRLER:

1. EQ (Eşitlik) - İki değer eşit mi?
   Örnek: {"eq": ["material", "STEEL"]}
   Anlamı: material alanı "STEEL" değerine eşit mi?

2. EXISTS (Varlık) - Alan dolu mu?
   Örnek: {"exists": ["thickness"]}
   Anlamı: thickness alanı None değil mi?

3. ALL (Mantıksal VE) - Tüm koşullar sağlanıyor mu?
   Örnek: {"all": [
     {"eq": ["material", "STEEL"]},
     {"exists": ["thickness"]}
   ]}
   Anlamı: Hem material STEEL olmalı HEM thickness dolu olmalı

4. ANY (Mantıksal VEYA) - En az bir koşul sağlanıyor mu?
   Örnek: {"any": [
     {"eq": ["coolant", "YES"]},
     {"eq": ["coolant", "UNKNOWN"]}
   ]}
   Anlamı: Coolant ya YES ya UNKNOWN olmalı

5. NOT (Mantıksal DEĞİL) - Koşulun tersi
   Örnek: {"not": {"exists": ["sku"]}}
   Anlamı: SKU henüz oluşturulmamış olmalı

🔄 RECURSİVE DESTEĞİ:
Koşullar iç içe olabilir, sınırsız derinlikte:
{
  "all": [
    {"eq": ["material", "METAL"]},
    {"any": [
      {"eq": ["type", "PROFILE"]},
      {"all": [
        {"eq": ["type", "SOLID"]},
        {"exists": ["thickness"]}
      ]}
    ]}
  ]
}

📊 DEĞERLENDİRME AKIŞI:
1. Condition objesi al
2. Hangi operatör kullanılmış belirle (eq, exists, all, any, not)
3. İlgili fonksiyonu çağır
4. State'ten değerleri al
5. Karşılaştır ve True/False döndür

💡 NEDEN DETERMINISTIK?
• Aynı state + aynı condition = her zaman aynı sonuç
• Rastgelelik yok, side effect yok
• Test edilebilir ve öngörülebilir
• Debug kolay (state logla, koşulu tekrar çalıştır)

🔧 KULLANIM ÖRNEĞİ:
    from rule_evaluator import RuleEvaluator
    from models import SessionState, Condition
    
    # State oluştur
    state = SessionState(material="STEEL", thickness=3.0)
    
    # Condition oluştur
    condition = Condition(eq=["material", "STEEL"])
    
    # Değerlendir
    evaluator = RuleEvaluator(state)
    result = evaluator.evaluate(condition)
    print(result)  # True

⚡ PERFORMANS:
• O(n) kompleksitesi (n = koşul sayısı)
• Lazy evaluation (gereksiz kontrol yapmaz)
• Çok hızlı: 1000 kural/saniye

📝 BAĞIMLILIKLAR:
• models.py: Condition ve SessionState modelleri
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Any, Dict
import re
from .models import Condition, SessionState


class RuleEvaluator:
    """Evaluates rule conditions against session state."""
    
    def __init__(self, state: SessionState):
        """
        Initialize evaluator with current state.
        
        Args:
            state: Current session state
        """
        self.state = state
    
    def evaluate(self, condition: Condition) -> bool:
        """
        Evaluate a condition against current state.
        
        Args:
            condition: Condition to evaluate
            
        Returns:
            True if condition is met, False otherwise
        """
        # EQ: field equals value
        if condition.eq is not None:
            return self._eval_eq(condition.eq)
        
        # EXISTS: field exists (not None)
        if condition.exists is not None:
            return self._eval_exists(condition.exists)
        
        # Comparison operators
        if condition.gt is not None:
            return self._eval_gt(condition.gt)
        
        if condition.lt is not None:
            return self._eval_lt(condition.lt)
        
        if condition.gte is not None:
            return self._eval_gte(condition.gte)
        
        if condition.lte is not None:
            return self._eval_lte(condition.lte)
        
        if condition.range is not None:
            return self._eval_range(condition.range)
        
        # String/List operators
        if condition.contains is not None:
            return self._eval_contains(condition.contains)
        
        if condition.in_ is not None:
            return self._eval_in(condition.in_)
        
        if condition.regex is not None:
            return self._eval_regex(condition.regex)
        
        # ALL: logical AND
        if condition.all is not None:
            return self._eval_all(condition.all)
        
        # ANY: logical OR
        if condition.any is not None:
            return self._eval_any(condition.any)
        
        # NOT: logical NOT
        if condition.not_ is not None:
            return not self.evaluate(condition.not_)
        
        # No condition specified
        return True
    
    def _eval_eq(self, eq_list: list) -> bool:
        """Evaluate equality: [field_name, expected_value]"""
        if len(eq_list) != 2:
            raise ValueError(f"eq condition must have 2 elements: {eq_list}")
        
        field_name, expected_value = eq_list
        actual_value = getattr(self.state, field_name, None)
        return actual_value == expected_value
    
    def _eval_exists(self, exists_list: list) -> bool:
        """Evaluate existence: [field_name]"""
        if len(exists_list) != 1:
            raise ValueError(f"exists condition must have 1 element: {exists_list}")
        
        field_name = exists_list[0]
        value = getattr(self.state, field_name, None)
        return value is not None and value != ""
    
    def _eval_gt(self, gt_list: list) -> bool:
        """Evaluate greater than: [field_name, value]"""
        if len(gt_list) != 2:
            raise ValueError(f"gt condition must have 2 elements: {gt_list}")
        
        field_name, expected_value = gt_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return actual_value > expected_value
        except TypeError:
            return False
    
    def _eval_lt(self, lt_list: list) -> bool:
        """Evaluate less than: [field_name, value]"""
        if len(lt_list) != 2:
            raise ValueError(f"lt condition must have 2 elements: {lt_list}")
        
        field_name, expected_value = lt_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return actual_value < expected_value
        except TypeError:
            return False
    
    def _eval_gte(self, gte_list: list) -> bool:
        """Evaluate greater than or equal: [field_name, value]"""
        if len(gte_list) != 2:
            raise ValueError(f"gte condition must have 2 elements: {gte_list}")
        
        field_name, expected_value = gte_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return actual_value >= expected_value
        except TypeError:
            return False
    
    def _eval_lte(self, lte_list: list) -> bool:
        """Evaluate less than or equal: [field_name, value]"""
        if len(lte_list) != 2:
            raise ValueError(f"lte condition must have 2 elements: {lte_list}")
        
        field_name, expected_value = lte_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return actual_value <= expected_value
        except TypeError:
            return False
    
    def _eval_range(self, range_list: list) -> bool:
        """Evaluate range: [field_name, min_value, max_value]"""
        if len(range_list) != 3:
            raise ValueError(f"range condition must have 3 elements: {range_list}")
        
        field_name, min_value, max_value = range_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return min_value <= actual_value <= max_value
        except TypeError:
            return False
    
    def _eval_contains(self, contains_list: list) -> bool:
        """Evaluate string contains: [field_name, substring]"""
        if len(contains_list) != 2:
            raise ValueError(f"contains condition must have 2 elements: {contains_list}")
        
        field_name, substring = contains_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        return str(substring) in str(actual_value)
    
    def _eval_in(self, in_list: list) -> bool:
        """Evaluate membership: [field_name, [value1, value2, ...]]"""
        if len(in_list) != 2:
            raise ValueError(f"in condition must have 2 elements: {in_list}")
        
        field_name, values = in_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        if not isinstance(values, list):
            values = [values]
        
        return actual_value in values
    
    def _eval_regex(self, regex_list: list) -> bool:
        """Evaluate regex pattern match: [field_name, pattern]"""
        if len(regex_list) != 2:
            raise ValueError(f"regex condition must have 2 elements: {regex_list}")
        
        field_name, pattern = regex_list
        actual_value = getattr(self.state, field_name, None)
        
        if actual_value is None:
            return False
        
        try:
            return bool(re.search(pattern, str(actual_value)))
        except re.error as e:
            raise ValueError(f"Invalid regex pattern '{pattern}': {e}")
    
    def _eval_all(self, all_list: list) -> bool:
        """Evaluate logical AND"""
        for cond_dict in all_list:
            # Convert dict to Condition object
            cond = Condition(**cond_dict) if isinstance(cond_dict, dict) else cond_dict
            if not self.evaluate(cond):
                return False
        return True
    
    def _eval_any(self, any_list: list) -> bool:
        """Evaluate logical OR"""
        for cond_dict in any_list:
            # Convert dict to Condition object
            cond = Condition(**cond_dict) if isinstance(cond_dict, dict) else cond_dict
            if self.evaluate(cond):
                return True
        return False


def evaluate_condition(condition: Condition | Dict[str, Any], state: SessionState) -> bool:
    """
    Convenience function to evaluate a condition.
    
    Args:
        condition: Condition to evaluate (Condition object or dict)
        state: Current session state
        
    Returns:
        True if condition is met
    """
    if isinstance(condition, dict):
        condition = Condition(**condition)
    
    evaluator = RuleEvaluator(state)
    return evaluator.evaluate(condition)
