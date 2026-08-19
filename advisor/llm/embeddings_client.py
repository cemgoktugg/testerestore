"""
═══════════════════════════════════════════════════════════════════════════
🧬 EMBEDDINGS_CLIENT.PY - TEXT → VECTOR DÖNÜŞTÜRÜCÜ
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya text'i vector'e (sayı dizisine) çevirir. RAG sisteminin temeli!
OpenAI'nin embedding modeli ile text'leri 1536 boyutlu vektörlere dönüştürür.

🔬 EMBEDDING NEDİR?
"Karbon çelik" → [0.234, -0.567, 0.891, ..., 0.123]  (1536 sayı)
"Carbon steel" → [0.241, -0.571, 0.887, ..., 0.119]  (birbirine çok yakın!)

Bu sayede benzer anlamlı metinler benzer vektörler olur.

🛠️ ANA FONKSİYONLAR:

embed_text(text) - Tek metin embedding
    • Bir cümle/paragraf → Vector
    • Kullanıcı sorusu için kullanılır

embed_batch(texts) - Çoklu metin embedding  
    • Birden fazla text → Vector listesi
    • Doküman chunk'ları için kullanılır
    • Toplu işlem daha hızlı ve ucuz

get_embedding_dimension() - Vector boyutu
    • text-embedding-3-small: 1536 boyut
    • text-embedding-ada-002: 1536 boyut

💡 KULLANIM SENARYOLARI:

1. Doküman İndeksleme (Offline)
   PDF → Chunk'lara böl → Her chunk'ı embed et → Vector DB'ye kaydet

2. Soru Arama (Online)
   Kullanıcı sorusu → Embed et → Vector DB'de benzerlerini bul

🔄 İŞ AKIŞI:

Text Input
    ↓
OpenAI Embeddings API (text-embedding-3-small)
    ↓
Vector Output [1536 float]
    ↓
Vector DB'ye kaydet veya ara

⚡ PERFORMANS:
• 1 text: ~50ms
• 100 text (batch): ~500ms
• Maliyet: $0.00002 / 1K token (çok ucuz!)

📊 BOYUT KARŞILAŞTIRMASI:
text-embedding-3-small:  1536 boyut (önerilen) ✅
text-embedding-3-large:  3072 boyut (daha iyi ama yavaş)
text-embedding-ada-002:  1536 boyut (eski model)

📝 BAĞIMLILIKLAR:
• openai: OpenAI Python SDK
• numpy: Vector işlemleri için (opsiyonel)
═══════════════════════════════════════════════════════════════════════════
"""

from typing import List, Union, Optional
from openai import OpenAI
import logging
import time
import os

# Load .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)


class EmbeddingsClient:
    """
    OpenAI Embeddings API client for converting text to vectors.
    
    Supports:
    - Single text embedding
    - Batch text embedding
    - Retry logic
    - Cost tracking
    """
    
    # Default model: text-embedding-3-small (best cost/performance)
    DEFAULT_MODEL = "text-embedding-3-small"
    DIMENSION = 1536  # Vector dimension
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        max_retries: int = 3
    ):
        """
        Initialize embeddings client.
        
        Args:
            api_key: OpenAI API key (optional, will use OPENAI_API_KEY env var if not provided)
            model: Embedding model name
            max_retries: Max retry attempts on failure
        """
        # Use provided API key or get from environment
        if api_key is None:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key not provided and OPENAI_API_KEY environment variable not set")
        
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.max_retries = max_retries
        
        # Usage tracking
        self.total_tokens = 0
        self.total_requests = 0
        
        logger.info(f"EmbeddingsClient initialized with model: {model}")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Convert a single text to embedding vector.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats (1536 dimensions)
            
        Example:
            vector = client.embed_text("Karbon çelik testere bıçağı")
            # [0.234, -0.567, 0.891, ...]
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        return self._embed_with_retry([text])[0]
    
    def embed_batch(
        self, 
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Convert multiple texts to embeddings (batch processing).
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts per API call (max 2048)
            
        Returns:
            List of embedding vectors
            
        Example:
            texts = ["chunk1", "chunk2", "chunk3"]
            vectors = client.embed_batch(texts)
            # [[0.1, ...], [0.2, ...], [0.3, ...]]
        """
        if not texts:
            return []
        
        # Filter empty texts
        texts = [t for t in texts if t and t.strip()]
        
        if not texts:
            return []
        
        # Process in batches
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            logger.info(f"Embedding batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
            
            embeddings = self._embed_with_retry(batch)
            all_embeddings.extend(embeddings)
        
        logger.info(f"Embedded {len(texts)} texts successfully")
        return all_embeddings
    
    def _embed_with_retry(self, texts: List[str]) -> List[List[float]]:
        """
        Call embeddings API with retry logic.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        for attempt in range(self.max_retries):
            try:
                response = self.client.embeddings.create(
                    model=self.model,
                    input=texts
                )
                
                # Extract embeddings
                embeddings = [item.embedding for item in response.data]
                
                # Track usage
                self.total_tokens += response.usage.total_tokens
                self.total_requests += 1
                
                logger.debug(f"Embedded {len(texts)} texts, tokens: {response.usage.total_tokens}")
                
                return embeddings
                
            except Exception as e:
                logger.warning(f"Embedding attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"All {self.max_retries} attempts failed")
                    raise
        
        raise Exception("Embedding failed after all retries")
    
    def get_embedding_dimension(self) -> int:
        """Get embedding vector dimension."""
        return self.DIMENSION
    
    def get_usage_stats(self) -> dict:
        """
        Get usage statistics and cost estimation.
        
        Returns:
            Dict with usage stats and estimated cost
        """
        # text-embedding-3-small pricing: $0.00002 per 1K tokens
        cost_per_1k = 0.00002
        estimated_cost = (self.total_tokens / 1000) * cost_per_1k
        
        return {
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": round(estimated_cost, 6),
            "model": self.model
        }
    
    def reset_stats(self):
        """Reset usage statistics."""
        self.total_tokens = 0
        self.total_requests = 0
        logger.info("Usage stats reset")


# Convenience function
def create_embeddings_client(api_key: str, **kwargs) -> EmbeddingsClient:
    """
    Create and return embeddings client.
    
    Args:
        api_key: OpenAI API key
        **kwargs: Additional arguments for EmbeddingsClient
        
    Returns:
        Configured EmbeddingsClient
    """
    return EmbeddingsClient(api_key=api_key, **kwargs)


# Quick test function
def test_embeddings(api_key: str):
    """
    Quick test of embeddings functionality.
    
    Args:
        api_key: OpenAI API key
    """
    client = EmbeddingsClient(api_key)
    
    # Test single embedding
    text = "Karbon çelik testere bıçağı"
    vector = client.embed_text(text)
    
    print(f"Text: {text}")
    print(f"Vector dimension: {len(vector)}")
    print(f"First 5 values: {vector[:5]}")
    
    # Test batch embedding
    texts = [
        "Alüminyum profil kesimi",
        "Paslanmaz çelik boru",
        "Dökme demir malzeme"
    ]
    vectors = client.embed_batch(texts)
    
    print(f"\nBatch embedded {len(vectors)} texts")
    print(f"Stats: {client.get_usage_stats()}")


if __name__ == "__main__":
    # For testing only
    import os
    api_key = os.getenv("OPENAI_API_KEY")
    
    if api_key:
        test_embeddings(api_key)
    else:
        print("Set OPENAI_API_KEY environment variable to test")
