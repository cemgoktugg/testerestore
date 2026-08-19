"""
═══════════════════════════════════════════════════════════════════════════
📝 PROMPT_BUILDER.PY - GPT PROMPT OLUŞTURUCU
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya GPT'ye gönderilecek system prompt'u dinamik olarak oluşturur. 
State'e, uyarılara, öneriye göre context hazırlar. GPT'nin her zaman 
güncel bilgiye sahip olmasını sağlar.

📦 PROMPT YAPI BLOKLARI:

1. SYSTEM PROMPT (Sabit Kısım)
   • GPT'nin kim olduğunu tanımlar
   • system_prompt.py'dan gelir
   • "Sen testere bıçağı uzmanısın..."

2. CONTEXT INJECTION (Dinamik Kısım)
   a) Mevcut State:
      - Hangi bilgiler toplandı?
      - Hangileri eksik?
   
   b) Öneri Durumu:
      - SKU oluştu mu?
      - Özellikler neler?
   
   c) Uyarılar:
      - Varsa listelenirler
      - GPT'ye vurgulatılır
   
   d) Sıradaki Soru:
      - Hangi bilgi eksik?
      - Ne sorulacak?

3. CONVERSATION HISTORY (Geçmiş)
   • Son 5-10 mesaj
   • Kullanıcı + Asistan döngüsü
   • Context sürekliliği için

4. CURRENT MESSAGE (Güncel Mesaj)
   • Kullanıcının son mesajı

🔄 DİNAMİK PROMPT ÖRNEKLERI:

State Boş →
"\"\" 
Mevcut Durum:
- Henüz bilgi toplanmadı

Görev: Kullanıcıdan temel bilgileri toplamaya başla
"\"\"

State Dolmaya Başladı →
"\"\"
Mevcut Durum:
✓ Malzeme: Karbon Çelik
✓ Kalınlık: 3mm
✗ Makine sınıfı: Bilinmiyor

Görev: Eksik bilgileri tamamla
"\"\"

SKU Oluştu →
"\"\"
Belirlenmiş Ürün:
🎯 SKU: 16-0.90-8/12-2240
🔧 Tip: BI-METAL M42

⚠️ Uyarılar:
1. Soğutma kullanılması önerilir

Görev: Öneriyi açıkla, uyarıları vurgula
"\"\"

🛠️ ANA FONKSİYONLAR:

build_messages(history, user_message) - Mesaj Listesi Oluştur
    • GPT'ye gönderilecek tam mesaj dizisi
    • System + History + Current message
    • OpenAI formatında: [{"role": "...", "content": "..."}]

_build_system_prompt() - System Prompt Hazırla
    • Sabit kısım + dinamik context
    • State summary ekler
    • Öneri ve uyarıları yerleştirir

_format_state_summary() - State'ı Okunabilir Yap
    • State objesi → İnsan okunabilir text
    • ✓ ve ✗ işaretleri ile

_format_recommendation() - Öneriyi Formatla
    • SKU + özellikler
    • GPT'nin güzel açıklaması için hazır

💡 FEW-SHOT EXAMPLES:
Prompt içine örnekler eklenir (GPT'ye rehberlik için):

"\"\"
Örnek Konuşma 1:
Kullanıcı: "3mm çelik kesiyorum"
Asistan: "Harika! 3mm karbon çelik için bilgilerinizi aldım."

Örnek Konuşma 2:
Kullanıcı: "Hangi bıçak lazım?"
Asistan: "Size öneri yapabilmem için birkaç bilgiye ihtiyacım var."
"\"\"

📊 CONTEXT WINDOW YÖNETİMİ:
• Tüm geçmiş saklanmaz (token limiti)
• Son 5-10 mesaj tutulur
• Token optimizasyonu yapılır

📝 BAĞIMLILIKLAR:
• prompts/system_prompt.py: Sabit system prompt
• rules_engine: State ve öneri bilgisi için
═══════════════════════════════════════════════════════════════════════════
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from prompts.system_prompt import get_system_prompt


class PromptBuilder:
    """
    Builds prompts with injected context from rules engine.
    
    Responsibilities:
    - Generate system prompts with current state
    - Format recommendations for LLM
    - Include warnings and next questions
    - Provide few-shot examples when needed
    """
    
    def __init__(self, rules_engine):
        """
        Initialize prompt builder with rules engine reference.
        
        Args:
            rules_engine: RulesEngine instance to extract context from
        """
        self.engine = rules_engine
    
    def build_system_prompt(self, rag_context: Optional[str] = None) -> str:
        """
        Build system prompt with current session context.
        
        Args:
            rag_context: Optional RAG-retrieved documentation context
        
        Returns:
            Complete system prompt with injected state, warnings, recommendations
        """
        context = self._gather_context()
        
        # Add RAG context if available
        if rag_context:
            context["rag_context"] = rag_context
        
        return get_system_prompt(context)
    
    def build_user_prompt(self, user_message: str) -> str:
        """
        Build user prompt (usually just passes through user's message).
        
        Args:
            user_message: Raw message from user
            
        Returns:
            Formatted user prompt
        """
        return user_message
    
    def build_messages(
        self,
        conversation_history: List[Dict[str, str]],
        user_message: str,
        rag_context: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Build complete message list for OpenAI API.
        
        Args:
            conversation_history: Previous messages (role + content)
            user_message: Current user message
            rag_context: Optional RAG-retrieved documentation context
            
        Returns:
            List of message dicts ready for OpenAI API
        """
        messages = [
            {"role": "system", "content": self.build_system_prompt(rag_context=rag_context)}
        ]
        
        # Add conversation history (keep last 20 messages for better context)
        # This helps maintain natural conversation flow
        recent_history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history
        messages.extend(recent_history)
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        return messages
    
    def _gather_context(self) -> Dict:
        """
        Gather all relevant context from rules engine.
        
        Returns:
            Dictionary with state, warnings, recommendations, next question
        """
        context = {}
        
        # Get current state
        state_dict = self.engine.get_state()
        context["state"] = state_dict
        
        # Check if we have any product-related data collected
        has_product_data = any([
            state_dict.get("metal_family"),
            state_dict.get("material_family"),
            state_dict.get("machine_class"),
            state_dict.get("machine_model")
        ])
        context["has_product_data"] = has_product_data
        
        # If machine model is specified, get its technical specifications
        machine_model = state_dict.get("machine_model")
        if machine_model:
            try:
                # Motorun zaten yuklu olan ornegini kullan (her cagride 1.1 MB
                # JSON yeniden yuklemek yerine)
                machine_db = getattr(self.engine, 'machine_db', None)
                machine_info = machine_db.search(machine_model) if machine_db else None
                
                if machine_info:
                    context["machine_info"] = {
                        "display_name": machine_info.get("display_name"),
                        "manufacturer": machine_info.get("manufacturer"),
                        "model": machine_info.get("model"),
                        "blade_length_mm": machine_info.get("blade_length_mm"),
                        "blade_width_mm": machine_info.get("blade_width_mm"),
                        "blade_thickness_mm": machine_info.get("blade_thickness_mm"),
                        "machine_class": machine_info.get("machine_class")
                    }
            except Exception as e:
                # If machine database lookup fails, just continue without machine info
                pass
        
        # Get next question if available (only if we're in product flow)
        # NOT: Eskiden bu satirda `and has_product_data` kosulu vardi; bos state'te
        # her zaman False oldugu icin bot ilk soruyu hicbir zaman soramiyordu.
        next_question = self.engine.get_next_question()
        if next_question:
            # Handle both dict and Question object
            if isinstance(next_question, dict):
                context["next_question"] = next_question.get("text", next_question.get("question_text"))
            else:
                context["next_question"] = next_question.text
        
        # Get recommendation if available
        recommendation = self.engine.get_recommendation()
        if recommendation:
            context["recommendation"] = recommendation
            context["warnings"] = recommendation.get("warnings", [])
        
        return context
    
    def format_recommendation(self, recommendation: Dict) -> str:
        """
        Format recommendation into a structured text for LLM to present.
        
        Args:
            recommendation: Recommendation dict from rules engine
            
        Returns:
            Formatted recommendation text
        """
        if not recommendation:
            return "No recommendation available yet. Continue gathering information."
        
        blade_type = recommendation.get("blade_type", "N/A")
        tooth_pitch = recommendation.get("tooth_pitch", "N/A")
        width = recommendation.get("blade_width_mm", "N/A")
        thickness = recommendation.get("blade_thickness_mm", "N/A")
        sku = recommendation.get("sku", "N/A")
        confidence = recommendation.get("confidence", "N/A")
        warnings = recommendation.get("warnings", [])
        
        text = f"""**Recommendation Ready:**

✅ **Blade Type**: {blade_type}
📏 **Specifications**:
   - Tooth Pitch: {tooth_pitch}
   - Width: {width} mm
   - Thickness: {thickness} mm
   - SKU: {sku}

📊 **Confidence Level**: {confidence}
"""
        
        if warnings:
            text += "\n⚠️ **Important Notes**:\n"
            for warning in warnings:
                text += f"   - {warning}\n"
        
        return text
    
    def format_state_summary(self) -> str:
        """
        Format current state into human-readable summary.
        
        Returns:
            Text summary of current session state
        """
        state = self.engine.get_state()
        
        summary = "**Current Information Collected:**\n"
        
        # Material
        material = state.get("material_family")
        if material:
            summary += f"   - Material: {material}\n"
        
        # Part type
        part_type = state.get("part_type")
        if part_type:
            summary += f"   - Part Type: {part_type}\n"
        
        # Thickness
        thickness = state.get("profile_wall_thickness_bucket")
        if thickness:
            summary += f"   - Thickness: {thickness}\n"
        
        # Machine
        machine = state.get("machine_class")
        if machine:
            summary += f"   - Machine Class: {machine}\n"
        
        # Coolant
        coolant = state.get("has_coolant")
        if coolant is not None:
            summary += f"   - Coolant: {'Yes' if coolant else 'No'}\n"
        
        if summary == "**Current Information Collected:**\n":
            summary += "   - No information collected yet\n"
        
        return summary
    
    def get_few_shot_examples(self) -> List[Dict[str, str]]:
        """
        Get few-shot examples to guide LLM behavior.
        
        Returns:
            List of example message exchanges
        """
        return [
            {
                "role": "user",
                "content": "I need to cut aluminum"
            },
            {
                "role": "assistant",
                "content": "Great! Aluminum is a common material. To give you the best blade recommendation, I need a bit more information:\n\nWhat type of aluminum part will you be cutting? Is it:\n- Hollow profiles (tubes, channels, angles)\n- Solid bars or sheets"
            },
            {
                "role": "user",
                "content": "It's tubes, about 3mm wall thickness"
            },
            {
                "role": "assistant",
                "content": "Perfect! So we have:\n- Material: Aluminum\n- Part Type: Profile (tubes)\n- Wall Thickness: 3mm\n\nOne more question: Do you have cutting fluid/coolant on your bandsaw machine?"
            },
            {
                "role": "user",
                "content": "Yes, we use coolant"
            },
            {
                "role": "assistant",
                "content": "✅ **Recommendation**: BI_METAL_M42_FLEXBACK blade\n\n📏 **Specifications**:\n   - Tooth Pitch: 10/14 TPI\n   - Width: 16 mm\n   - Thickness: 0.9 mm\n   - SKU: 16-0.90-10/14-2240\n\n💡 **Why this blade?**: The 10/14 TPI pitch is ideal for 3mm aluminum profiles, providing smooth cuts without clogging. The M42 bi-metal construction offers excellent durability.\n\n📊 **Confidence Level**: HIGH"
            }
        ]


def create_prompt_builder(rules_engine) -> PromptBuilder:
    """
    Convenience function to create a PromptBuilder instance.
    
    Args:
        rules_engine: RulesEngine instance
        
    Returns:
        Configured PromptBuilder
    """
    return PromptBuilder(rules_engine)
