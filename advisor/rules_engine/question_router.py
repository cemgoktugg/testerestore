"""
═══════════════════════════════════════════════════════════════════════════════
🧭 QUESTION_ROUTER.PY - AKILLI SORU YÖNLENDİRİCİ
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya hangi sorunun sırada olduğunu belirler. Kullanıcının verdiği 
cevaplara göre dinamik soru akışı oluşturur. Gereksiz soruları atlar, 
koşullu yönlendirme yapar.

🧩 KARAR MEKANİZMALARI:

1. ask_if_missing - Alan Boşsa Sor
   {"ask_if_missing": ["material", "thickness"]}
   
   Mantık: Eğer bu alanlardan herhangi biri boşsa, bu soruyu sor.
          Tüm alanlar doluysa, soruyu ATLA.
   
   Örnek: 
   - material=None → Soru SORULUR
   - material="STEEL" → Soru ATLANIR

2. ask_only_if - Koşullu Soru
   {"ask_only_if": [{"eq": ["material", "METAL"]}]}
   
   Mantık: Sadece belirtilen koşulla uyuyorsa sor.
          Koşul sağlanmazsa ATLA.
   
   Örnek:
   - material="METAL" → Metal soruları SORULUR
   - material="WOOD" → Metal soruları ATLANIR

3. Her İkisi Birlikte
   {
     "ask_if_missing": ["metal_type"],
     "ask_only_if": [{"eq": ["material", "METAL"]}]
   }
   
   Mantık: Hem material METAL olmalı HEM metal_type boş olmalı.
          İki koşul da sağlanmazsa ATLA.

🔄 SORU AKIŞI ÖRNEĞİ:

SENARYO A: Kullanıcı "METAL" seçti
  Q1: Malzeme kategorisi? → METAL
  Q2: Metal tipi? → SORULUR (ask_only_if: material=METAL)
  Q3: Ahşap tipi? → ATLANIR (ask_only_if: material=WOOD)
  Q4: Kalınlık? → SORULUR (ask_if_missing: thickness)

SENARYO B: Kullanıcı "WOOD" seçti
  Q1: Malzeme kategorisi? → WOOD
  Q2: Metal tipi? → ATLANIR
  Q3: Ahşap tipi? → SORULUR
  Q4: Kalınlık? → SORULUR

💡 AKILLI ÖZELLİKLER:

• Skip Logic: Kullanıcı zaten bilgi verdiyse tekrar sorma
  Örnek: Kullanıcı "3mm karbon çelik" dedi
         → Material ve thickness sorularını ATLA

• Conditional Flow: Cevaba göre farklı yollara git
  Örnek: PROFILE seçilirse "et kalınlığı" sor
         SOLID seçilirse "kesite boyutu" sor

• Dynamic: State değiştikçe akış adapte olur
  Örnek: Kullanıcı ilk başta WOOD dedi, sonra METAL'e değiştirdi
         → Metal soruları devreye girer

🔧 KULLANIM ÖRNEĞİ:
    from question_router import QuestionRouter
    from models import SessionState
    
    # Router oluştur
    router = QuestionRouter(router_order, questions)
    
    # State oluştur
    state = SessionState(material="METAL")
    
    # Sıradaki soruyu al
    next_q = router.get_next_question(state)
    
    if next_q:
        print(next_q.text)  # "Hangi metal tipi?"
    else:
        print("Tüm sorular cevaplandı!")

📊 PERFORMANS:
• O(n) kompleksitesi (n = router entry sayısı)
• Lazy evaluation (ilk uygun soruyu bulduktan sonra durur)
• Çok hızlı: Milisaniyeler içinde karar verir

🎮 KULLANICI DENEYIİMİ:
Router sayesinde kullanıcı:
• Gereksiz sorularla uğraşmaz
• Sadece ilgili soruları görür
• Daha hızlı sonuca ulaşır
• Daha iyi deneyim yaşar

⚡ OPTİMİZASYON:
• Soruları dictionary'de saklar (O(1) lookup)
• Koşulları cache'lemez (state dinamik değiştiği için)
• Her get_next_question() çağrısı bağımsızdır (stateless)

📝 BAĞIMLILIKLAR:
• models.py: RouterEntry, Question, SessionState
• rule_evaluator.py: Koşul değerlendirme (ask_only_if için)
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Optional
from .models import RouterEntry, Question, SessionState
from .rule_evaluator import evaluate_condition


class QuestionRouter:
    """Routes to next appropriate question based on state and rules."""
    
    def __init__(self, router_order: list[RouterEntry], questions: list[Question]):
        """
        Initialize router.
        
        Args:
            router_order: List of router entries from rules.json
            questions: List of all available questions
        """
        self.router_order = router_order
        self.questions = {q.id: q for q in questions}
    
    def get_next_question(self, state: SessionState) -> Optional[Question]:
        """
        Determine next question to ask based on current state.
        
        Args:
            state: Current session state
            
        Returns:
            Next Question to ask, or None if done
        """
        for entry in self.router_order:
            # Check if question should be asked
            if self._should_ask(entry, state):
                return self.questions.get(entry.id)
        
        return None
    
    def _should_ask(self, entry: RouterEntry, state: SessionState) -> bool:
        """
        Check if a question should be asked based on router entry.
        
        Args:
            entry: Router entry
            state: Current state
            
        Returns:
            True if question should be asked
        """
        # Check if fields are missing
        if entry.ask_if_missing:
            all_set = all(
                self._is_field_set(state, field)
                for field in entry.ask_if_missing
            )
            if all_set:
                return False  # All fields already set, skip question
        
        # Check conditional logic
        if entry.ask_only_if:
            # All conditions must be satisfied
            for condition_dict in entry.ask_only_if:
                if not evaluate_condition(condition_dict, state):
                    return False  # Condition not met, skip question
        
        return True
    
    def _is_field_set(self, state: SessionState, field_name: str) -> bool:
        """Check if a field is set (not None and not empty string)."""
        value = getattr(state, field_name, None)
        return value is not None and value != ""
    
    def is_complete(self, state: SessionState) -> bool:
        """
        Check if all required questions have been answered.
        
        Args:
            state: Current session state
            
        Returns:
            True if no more questions to ask
        """
        return self.get_next_question(state) is None
