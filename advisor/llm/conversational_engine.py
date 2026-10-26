"""
═══════════════════════════════════════════════════════════════════════════
🤖 CONVERSATIONAL_ENGINE.PY - HİBRİT AI SİSTEMİ (RULES + RAG)
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya HİBRİT AI motoru! İki farklı sistemi birleştirir:

1️⃣ RULES ENGINE → Ürün önerileri
   • "Hangi bıçak almalıyım?"
   • "150mm çelik için öneri"
   • Kurallar → SKU/Öneri

2️⃣ RAG ENGINE → Doküman sorguları  
   • "Bıçak nasıl takılır?"
   • "Bakım talimatları"
   • Dokümanlar → Cevap

🏗️ SİSTEM MİMARİSİ:

    ConversationalEngine
           │
    ┌──────┴──────┐
    │             │
Rules Engine  RAG Engine
(Ürün)        (Dökümanter)

🔄 AKIŞ:

User: "150mm çelik için bıçak önerisi"
   → Rules Engine devreye girer
   → Kurallar değerlendirilir
   → SKU önerisi: BS123

User: "Bu bıçağı nasıl takarım?"
   → RAG Engine devreye girer
   → Dokümanlar aranır
   → PDF'den cevap

📊 SORGU SINIFLANDIRMA:

A) ÜRÜN SORULARI (Rules Engine)
   ✓ Hangi bıçak?
   ✓ Öneri ver
   ✓ Kalınlık/malzeme/soğutma

B) DOKÜMAN SORULARI (RAG Engine)
   ✓ Nasıl takılır?
   ✓ Bakım talimatları
   ✓ Güvenlik önlemleri
   ✓ Kullanım kılavuzu

C) GENEL SORULAR (GPT Only)
   ✓ Merhaba
   ✓ Yardım
   ✓ Özellikleri anlat

🛠️ YENİ ÖZELLİKLER:

enable_rag() - RAG Modülünü Aktifleştir
    • Dokümanları indeksle
    • RAG engine başlat
    
    engine.enable_rag(
        api_key="sk-...",
        docs_path="docs/"
    )

chat() - Akıllı Sorgu Yönlendirme
    • Soruyu analiz et
    • Rules veya RAG seç
    • Hibrit cevap üret
    
    response = engine.chat("Bıçak nasıl takılır?")
    # → RAG devreye girer
    
    response = engine.chat("150mm çelik")
    # → Rules Engine devreye girer

═══════════════════════════════════════════════════════════════════════════
"""

import sys
import os
from pathlib import Path
from typing import Dict, List, Optional
import uuid
import logging
from collections import OrderedDict


class _BoundedSessions(OrderedDict):
    """En eski oturumu atarak sınırlı boyutta kalan oturum sözlüğü.

    Eskiden her yeni session_id için oluşturulan oturum (kendi kural motoru
    kopyasıyla) hiç silinmiyordu: süreç belleği sürekli büyüyordu ve rastgele
    session_id gönderen biri sunucuyu bellek tükenmesine sürükleyebilirdi.
    """

    def __init__(self, maxsize: int):
        super().__init__()
        self.maxsize = maxsize

    def __setitem__(self, key, value):
        if key in self:
            self.move_to_end(key)
        super().__setitem__(key, value)
        while len(self) > self.maxsize:
            self.popitem(last=False)


MAX_SESSIONS = int(os.environ.get("ADVISOR_MAX_SESSIONS", "2000"))
MAX_HISTORY_MESSAGES = 40

# Load .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rules_engine.engine import RulesEngine
from llm.openai_client import OpenAIClient, get_default_model
from llm.prompt_builder import PromptBuilder
from llm.message_parser import MessageParser
from llm.unknown_questions_handler import UnknownQuestionsHandler, process_ai_response
from llm.dialog_manager import DialogManager
from llm.front_desk import FrontDesk

# RAG Engine is optional (requires chromadb)
try:
    from llm.rag_engine import RAGEngine
    _HAS_RAG = True
except ImportError:
    RAGEngine = None
    _HAS_RAG = False

logger = logging.getLogger(__name__)

class ConversationalSession:
    """
    Represents a single conversation session with state and history.
    """
    
    def __init__(self, session_id: str, rules_engine: RulesEngine):
        self.session_id = session_id
        self.rules_engine = rules_engine
        self.conversation_history: List[Dict[str, str]] = []
        self.created_at = None
        self.last_updated = None
    
    def add_message(self, role: str, content: str):
        """Add message to conversation history."""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
        # Geçmiş sınırsız büyümesin (bellek + her çağrıda gönderilen bağlam).
        if len(self.conversation_history) > MAX_HISTORY_MESSAGES:
            del self.conversation_history[:-MAX_HISTORY_MESSAGES]
    
    def get_state(self) -> Dict:
        """Get current rules engine state."""
        return self.rules_engine.get_state()
    
    def get_recommendation(self) -> Dict:
        """Get current recommendation."""
        return self.rules_engine.get_recommendation()


class ConversationalEngine:
    """
    Main orchestrator combining LLM, rules engine, and RAG for natural conversations.
    
    Hybrid System:
    - Rules Engine: Product recommendations (which blade?)
    - RAG Engine: Documentation queries (how to install?)
    - GPT: General conversation and synthesis
    
    Workflow:
    1. User sends message
    2. Classify query type (product/documentation/general)
    3a. Product → MessageParser + RulesEngine
    3b. Documentation → RAG retrieval
    4. PromptBuilder creates context-aware prompt
    5. OpenAI generates natural response
    6. Response sent back to user
    """
    
    def __init__(
        self,
        rules_path: str,
        openai_api_key: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 800,
        enable_rag: bool = False,
        email_config: Optional[Dict] = None
    ):
        """
        Initialize conversational engine.
        
        Args:
            rules_path: Path to rules.json
            openai_api_key: OpenAI API key (optional, will use OPENAI_API_KEY env var)
            model: GPT model to use (defaults to LLM_MODEL env var, else gpt-4o)
            temperature: Sampling temperature
            max_tokens: Max tokens per response
            enable_rag: Enable RAG engine for documentation
            email_config: Email configuration for unknown questions notifications
        """
        self.rules_path = rules_path
        self.model = model or get_default_model()
        
        # Use provided API key or get from environment
        if openai_api_key is None:
            openai_api_key = os.environ.get("OPENAI_API_KEY")
            if not openai_api_key:
                raise ValueError("OpenAI API key not provided and OPENAI_API_KEY environment variable not set")
        
        self.openai_api_key = openai_api_key
        
        # Initialize components
        self.openai_client = OpenAIClient(
            api_key=openai_api_key,
            model=self.model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Unknown questions handler
        self.unknown_handler = UnknownQuestionsHandler(email_config=email_config)

        # Makine veritabani TEK KEZ yuklenir ve tum oturumlarca paylasilir.
        # (Onceki tasarimda her mesajda yeniden yukleniyordu: 1.1 MB JSON x her tur)
        try:
            from rules_engine.machine_database import AdvancedMachineDatabase
            self.machine_db = AdvancedMachineDatabase()
        except Exception as exc:
            logger.warning(f"Machine database unavailable: {exc}")
            self.machine_db = None

        # Konusmayi kural motoru yonetir; LLM sadece esleme ve dogal dil uretir
        self.dialog_manager = DialogManager(
            openai_client=self.openai_client,
            api_key=openai_api_key,
            model=self.model,
            machine_db=self.machine_db,
        )
        
        # Ön masa: huniden ÖNCE müşterinin sorduğunu cevaplar (mağaza, fiyat,
        # stok, arıza, metal dışı, konu dışı). LLM kullanmaz.
        self.front_desk = FrontDesk()

        # RAG engine (optional)
        self.rag_engine: Optional[RAGEngine] = None
        self.rag_enabled = enable_rag
        
        if enable_rag:
            if not _HAS_RAG:
                raise RuntimeError(
                    "RAG is not available. Please install chromadb: "
                    "pip install chromadb"
                )
            self.rag_engine = RAGEngine(
                api_key=openai_api_key,
                collection_name="bandsaw_docs"
            )
            logger.info("RAG engine enabled")
        
        # Session management
        self.sessions: Dict[str, ConversationalSession] = _BoundedSessions(MAX_SESSIONS)
        
        logger.info(f"ConversationalEngine initialized with model: {self.model}")
    
    def create_session(self, session_id: str = None) -> str:
        """
        Create a new conversation session.
        
        Args:
            session_id: Optional custom session ID
            
        Returns:
            Session ID
        """
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        # Create new rules engine instance for this session
        rules_engine = RulesEngine(self.rules_path)
        
        # Create session
        session = ConversationalSession(session_id, rules_engine)
        self.sessions[session_id] = session
        
        logger.info(f"Created session: {session_id}")
        return session_id
    
    def chat(
        self,
        message: str,
        session_id: str = None,
        stream: bool = False
    ) -> Dict | str:
        """
        Process user message and generate response.
        
        Hybrid Query Routing:
        - Product questions → Rules Engine
        - Documentation questions → RAG Engine
        - General questions → GPT only
        
        Args:
            message: User's message
            session_id: Session ID (creates new if not provided)
            stream: Enable streaming response
            
        Returns:
            Response dict with message, state, recommendation, etc.
        """
        # Get or create session
        if session_id is None or session_id not in self.sessions:
            session_id = self.create_session(session_id)

        session = self.sessions[session_id]
        self.sessions.move_to_end(session_id)  # yeni kullanılan en son atılır

        # ------------------------------------------------------------------
        # DOKUMANTASYON SORULARI -> RAG
        # ------------------------------------------------------------------
        # Sadece acikca dokuman sorusu olanlar RAG'e gider. Geri kalan her sey
        # (urun secimi + genel sohbet) DialogManager tarafindan yonetilir;
        # kullanicinin cevabini "urun mu, sohbet mi" diye tahmin etmeye
        # calismak yerine AnswerMapper dogrulamali olarak karar verir.
        if self.rag_enabled and self._classify_query(message) == "documentation":
            rag = self._chat_with_rag(session, message, stream=stream)
            if isinstance(rag, dict):
                rag.setdefault("route", "rag")
            return rag

        # ------------------------------------------------------------------
        # ÖN MASA -> önce müşterinin sorduğunu cevapla
        # ------------------------------------------------------------------
        front = None
        try:
            front = self.front_desk.handle(session, message)
        except Exception as e:
            logger.error(f"front desk error: {e}", exc_info=True)
        if front and front.final:
            session.add_message("user", message)
            session.add_message("assistant", front.text)
            return self._front_desk_payload(session, front)

        # ------------------------------------------------------------------
        # URUN SECIMI + SOHBET -> kural motoru güdümlü diyalog
        # ------------------------------------------------------------------
        try:
            result = self.dialog_manager.handle(session, message)
        except Exception as e:
            logger.error(f"Error in chat: {e}", exc_info=True)
            return {
                "session_id": session_id,
                "message": "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
                "error": "internal_error",
            }

        # Motor diş adımını hesapladıysa hemen söyle; metal dışı seçimleri yönlendir
        try:
            result = self.front_desk.post_process(session, result)
        except Exception as e:
            logger.error(f"front desk post-process error: {e}", exc_info=True)
        result["route"] = "funnel"
        if front:  # karma mesaj: önce soruya cevap, sonra huni
            result["message"] = front.text + "\n\n" + (result.get("message") or "")
            result["front_desk"] = front.kinds
            result["route"] = "hybrid"

        # Bilinmeyen soru etiketlerini isle (uzman ekibe iletme akisi)
        result["message"] = process_ai_response(
            result["message"],
            session_id=session_id,
            handler=self.unknown_handler,
        )

        # Ogrenilmis bilgi varsa ekle
        learned = self.unknown_handler.search_learned_knowledge(message)
        if learned:
            result["message"] += f"\n\n💡 **Ek Bilgi:** {learned['answer']}"

        return result

    def _front_desk_payload(self, session, front) -> Dict:
        """Ön masa cevabını /api/chat sözleşmesine çevir (öneri kartı tekrarlanmaz)."""
        engine = session.rules_engine
        next_q = engine.get_next_question()
        # Takip sorusu sorduysak (ör. "boyu yazar mısınız?") ya da metal dışı
        # yönlendirme yaptıysak huninin butonları dikkat dağıtmasın.
        asked = getattr(session, "front_desk_pending", None) is not None
        non_metal = any(k.startswith("non_metal") for k in front.kinds)
        return {
            "session_id": session.session_id,
            "message": front.text,
            "state": engine.get_state(),
            "recommendation": None,
            "next_question": None if (asked or non_metal) else DialogManager._question_payload(next_q),
            "is_complete": engine.is_complete(),
            "extracted_fields": {},
            "front_desk": front.kinds,
            "route": "front_desk",
        }

    def _chat_with_rag(self, session, message: str, stream: bool = False):
        """Dokumantasyon sorusunu RAG baglami ile yanitla."""
        rag_context = None
        rag_sources = None

        rag_results = self.rag_engine.retrieve(message, top_k=3)
        if rag_results:
            rag_context = "\n\n".join([
                f"[Document {i+1}]\nSource: "
                f"{r['metadata'].get('parent_source', 'unknown')}\n{r['content']}"
                for i, r in enumerate(rag_results)
            ])
            rag_sources = [
                {
                    "source": r['metadata'].get('parent_source', 'unknown'),
                    "page": r['metadata'].get('parent_page'),
                    "score": r['score'],
                }
                for r in rag_results
            ]

        prompt_builder = PromptBuilder(session.rules_engine)
        messages = prompt_builder.build_messages(
            session.conversation_history, message, rag_context=rag_context
        )

        try:
            response = self.openai_client.chat(messages=messages, stream=stream)
            if stream:
                return response

            assistant_message = process_ai_response(
                response["content"],
                session_id=session.session_id,
                handler=self.unknown_handler,
            )

            session.add_message("user", message)
            session.add_message("assistant", assistant_message)

            result = {
                "session_id": session.session_id,
                "message": assistant_message,
                "query_type": "documentation",
                "state": session.get_state(),
                "recommendation": None,
                "next_question": None,
                "usage": response.get("usage", {}),
            }
            if rag_sources:
                result["rag_sources"] = rag_sources
            return result

        except Exception as e:
            logger.error(f"Error in RAG chat: {e}")
            return {
                "session_id": session.session_id,
                "message": "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
                "error": "internal_error",
            }

    def _classify_query(self, message: str) -> str:
        """
        Classify query type: product, documentation, general, or greeting.
        
        Args:
            message: User message
            
        Returns:
            "product", "documentation", "general", or "greeting"
        """
        message_lower = message.lower().strip()
        
        # Check if message looks like a machine model name
        # If it is, classify as product immediately
        try:
            from rules_engine.machine_database import AdvancedMachineDatabase
            machine_db = AdvancedMachineDatabase()
            result = machine_db.search(message)
            if result and result.get("match_score", 0) >= 0.75:
                logger.info(f"Message recognized as machine model: {message} -> {result.get('model')}")
                return "product"
        except Exception as e:
            logger.error(f"Machine lookup error in classification: {e}", exc_info=True)
        
        # Greeting/social patterns - respond naturally without processing
        greeting_patterns = [
            "merhaba", "selam", "hey", "hi", "hello", "günaydın", "iyi günler",
            "iyi akşamlar", "nasılsın", "naber", "ne haber"
        ]
        
        # Thanks/closing patterns
        thanks_patterns = [
            "teşekkür", "sağol", "eyvallah", "thanks", "thank you", 
            "çok sağol", "teşekkürler", "tşk", "saol"
        ]
        
        # General conversation patterns (not about products)
        general_patterns = [
            "tamam", "ok", "anladım", "peki", "güzel", "harika", "süper",
            "iyi", "evet", "hayır", "olur", "olmaz", "belki",
            "görüşürüz", "hoşçakal", "bye", "bb", "başka sorum yok",
            "bu kadar", "yeter", "şimdilik bu kadar"
        ]
        
        # Check greetings first (exact or near-exact matches)
        for pattern in greeting_patterns:
            if pattern in message_lower or message_lower.startswith(pattern):
                return "general"
        
        # Check thanks
        for pattern in thanks_patterns:
            if pattern in message_lower:
                return "general"
        
        # Check general conversation for very short messages
        if len(message_lower.split()) <= 3:
            for pattern in general_patterns:
                if pattern in message_lower or message_lower == pattern:
                    return "general"
        
        # Documentation keywords - must be explicitly documentation-related
        doc_keywords = [
            "nasıl tak", "how to install", "kurulum", "montaj",
            "kullanma kılavuzu", "manual", "talimat", "guide",
            "bakım prosedürü", "maintenance procedure", 
            "güvenlik önlem", "safety precaution",
            "temizleme yöntem", "cleaning method",
            "değiştirme adım", "replacement step"
        ]
        
        # Product/recommendation keywords - default flow
        product_keywords = [
            "bıçak", "blade", "testere", "öneri", "recommend",
            "malzeme", "material", "çelik", "steel", "alüminyum",
            "döküm", "cast", "profil", "profile", "tpi", "diş",
            "kalınlık", "thickness", "kesim", "cut", "soğutma",
            "coolant", "makine", "machine", "ölçü", "boyut",
            "paslanmaz", "stainless", "metal", "demir"
        ]
        
        # Count matches
        doc_matches = sum(1 for kw in doc_keywords if kw in message_lower)
        product_matches = sum(1 for kw in product_keywords if kw in message_lower)
        
        # Strong documentation signal needed
        if doc_matches >= 2:
            return "documentation"
        
        # Product flow if keywords match
        if product_matches >= 1:
            return "product"
        
        # For medium-length messages without keywords, treat as general
        if len(message.split()) >= 3 and product_matches == 0:
            return "general"
        
        # For very short messages, check if it could be a direct answer
        if len(message.split()) <= 2:
            # Could be a direct answer like "5mm" or "evet"
            if any(c.isdigit() for c in message):
                return "product"
            return "general"
        
        # Default to general for natural conversation flow
        return "general"
    
    def get_session(self, session_id: str) -> Optional[ConversationalSession]:
        """
        Get session by ID.
        
        Args:
            session_id: Session ID
            
        Returns:
            ConversationalSession or None
        """
        return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            True if deleted, False if not found
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Deleted session: {session_id}")
            return True
        return False
    
    def list_sessions(self) -> List[str]:
        """
        List all active session IDs.
        
        Returns:
            List of session IDs
        """
        return list(self.sessions.keys())
    
    def get_recommendation(self, session_id: str) -> Optional[Dict]:
        """
        Get recommendation for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Recommendation dict or None
        """
        session = self.get_session(session_id)
        if session:
            return session.get_recommendation()
        return None
    
    def get_state(self, session_id: str) -> Optional[Dict]:
        """
        Get current state for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            State dict or None
        """
        session = self.get_session(session_id)
        if session:
            return session.get_state()
        return None
    
    def get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """
        Get conversation history for a session.
        
        Args:
            session_id: Session ID
            
        Returns:
            List of messages
        """
        session = self.get_session(session_id)
        if session:
            return session.conversation_history
        return []
    
    def reset_session(self, session_id: str) -> bool:
        """
        Reset a session (clear state and history).
        
        Args:
            session_id: Session ID
            
        Returns:
            True if reset, False if not found
        """
        session = self.get_session(session_id)
        if session:
            session.rules_engine.reset_session()
            session.conversation_history = []
            logger.info(f"Reset session: {session_id}")
            return True
        return False
    
    def get_usage_stats(self) -> Dict:
        """
        Get OpenAI API usage statistics.
        
        Returns:
            Usage stats dict
        """
        stats = {
            "openai": self.openai_client.get_usage_stats()
        }
        
        if self.rag_enabled and self.rag_engine:
            stats["rag"] = self.rag_engine.get_stats()
        
        return stats
    
    # ==================== RAG Management ====================
    
    def setup_rag(
        self,
        docs_path: str = None,
        collection_name: str = "bandsaw_docs"
    ) -> Dict:
        """
        Setup and enable RAG engine with documents.
        
        Args:
            docs_path: Path to documents directory
            collection_name: Vector DB collection name
            
        Returns:
            Setup stats (indexed count, etc.)
        """
        if not _HAS_RAG:
            raise RuntimeError(
                "RAG is not available. Please install chromadb: "
                "pip install chromadb"
            )
        
        if not self.rag_engine:
            self.rag_engine = RAGEngine(
                api_key=self.openai_api_key,
                collection_name=collection_name
            )
            self.rag_enabled = True
            logger.info("RAG engine initialized")
        
        if docs_path:
            count = self.rag_engine.index_documents(docs_path)
            logger.info(f"Indexed {count} document chunks")
            return {"indexed_chunks": count}
        
        return {"status": "rag_enabled"}
    
    def index_documents(self, source: str) -> int:
        """
        Index documents into RAG engine.
        
        Args:
            source: File or directory path
            
        Returns:
            Number of chunks indexed
        """
        if not self.rag_enabled or not self.rag_engine:
            raise RuntimeError("RAG engine not enabled. Call setup_rag() first.")
        
        return self.rag_engine.index_documents(source)
    
    def get_rag_stats(self) -> Dict:
        """
        Get RAG engine statistics.
        
        Returns:
            RAG stats dict
        """
        if self.rag_enabled and self.rag_engine:
            return self.rag_engine.get_stats()
        return {"rag_enabled": False}
    
    def disable_rag(self):
        """Disable RAG engine."""
        self.rag_enabled = False
        logger.info("RAG engine disabled")
    
    def enable_rag_mode(self):
        """Enable RAG engine."""
        if self.rag_engine:
            self.rag_enabled = True
            logger.info("RAG engine enabled")
        else:
            raise RuntimeError("RAG engine not initialized. Call setup_rag() first.")
    
    # ==================== Simple API for Web Interface ====================
    
    def process_message(self, message: str, session_id: str = None) -> str:
        """
        Process a user message and return AI response text.
        
        This is a simplified interface for web integration that maintains
        conversation context across multiple calls.
        
        Args:
            message: User's message text
            session_id: Optional session ID for maintaining conversation context
            
        Returns:
            AI response text as string
        """
        # Use default session if not provided
        if session_id is None:
            session_id = "default_session"
        
        # Get or create session
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        # Use the full chat method
        result = self.chat(message, session_id=session_id)
        
        # Extract just the message text
        if isinstance(result, dict):
            return result.get("message", "Üzgünüm, bir hata oluştu.")
        return str(result)
    
    def get_session_state(self, session_id: str = None) -> Dict:
        """
        Get session state for web interface.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session state dict
        """
        if session_id is None:
            session_id = "default_session"
        
        session = self.get_session(session_id)
        if session:
            return {
                "session_id": session_id,
                "state": session.get_state(),
                "recommendation": session.get_recommendation(),
                "history_length": len(session.conversation_history),
                "next_question": self._get_next_question_text(session)
            }
        return {"session_id": None, "state": {}}
    
    def _get_next_question_text(self, session) -> Optional[str]:
        """Extract next question text from session."""
        next_q = session.rules_engine.get_next_question()
        if next_q:
            if isinstance(next_q, dict):
                return next_q.get("text", next_q.get("question_text"))
            return getattr(next_q, 'text', str(next_q))
        return None


def create_conversational_engine(
    rules_path: str,
    openai_api_key: str,
    **kwargs
) -> ConversationalEngine:
    """
    Convenience function to create ConversationalEngine.
    
    Args:
        rules_path: Path to rules.json
        openai_api_key: OpenAI API key
        **kwargs: Additional arguments for ConversationalEngine
        
    Returns:
        Configured ConversationalEngine instance
    """
    return ConversationalEngine(
        rules_path=rules_path,
        openai_api_key=openai_api_key,
        **kwargs
    )
