"""
═══════════════════════════════════════════════════════════════════════════════
🤖 OPENAI_CLIENT.PY - OPENAI API İLETİŞİM KÖPRÜSÜ
═══════════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya OpenAI API'sine güvenli ve robust bir şekilde istek gönderir. 
Hata yönetimi, retry mantığı, token takibi, maliyet hesaplama gibi 
production-ready özellikleri içerir.

🔧 ANA ÖZELLİKLER:

1. RETRY MEKANİZMASI (Exponential Backoff)
   • API başarısız olursa otomatik tekrar dener
   • Her denemede bekleme süresi artar:
     - 1. hata → 2 saniye bekle
     - 2. hata → 4 saniye bekle
     - 3. hata → 8 saniye bekle
   • Maksimum 3 deneme (konfigüre edilebilir)

2. HATA YÖNETİMİ
   • RateLimitError: API limiti aşıldı → bekle ve tekrar dene
   • APIConnectionError: Bağlantı hatası → tekrar dene
   • APIError: Diğer hatalar → logla ve fırlat
   • Her hata detaylı şekilde loglanır

3. TOKEN TAKİBİ VE MALİYET HESAPLAMA
   • Her istekteki token kullanımı kaydedilir
   • Toplam maliyet hesaplanır (GPT-4 fiyatlarına göre)
   • get_usage_stats() ile istatistikleri alabilirsiniz
   
   Örnek Çıktı:
   {
     "total_requests": 15,
     "prompt_tokens": 3500,
     "completion_tokens": 1200,
     "total_tokens": 4700,
     "estimated_cost_usd": 0.083
   }

4. STREAMING DESTEĞİ
   • Cevap canlı akışta gelir (chunk chunk)
   • Kullanıcı yazıyı anlık görür
   • "ChatGPT etkisi" oluşturur
   
   Kullanım:
   for chunk in client.chat(messages, stream=True):
       print(chunk, end="")

5. KONFIGÜRE EDİLEBİLİR PARAMETRELER
   • model: "gpt-4o", "gpt-4.1", "gpt-4o-mini", vb. (bos birakilirsa LLM_MODEL)
   • temperature: Yaratıcılık seviyesi (0.0-2.0)
   • max_tokens: Maksimum cevap uzunluğu
   • timeout: İstek zaman aşımı süresi

🔄 RETRY AKIŞI:

İstek Gönder
    ↓
Başarılı mı?
    │
    YES → Cevabı döndür
    │
    NO → Hata tipi?
           │
           RateLimit/Connection?
           │
           YES → Deneme hakkı var mı?
                  │
                  YES → Bekle (2^n saniye) → Tekrar Dene
                  │
                  NO → Exception fırlat
           │
           NO (Diğer hata) → Direkt exception fırlat

📊 TOKEN VE MALİYET:

GPT-4 Turbo Fiyatlandırması (Aralık 2024):
• Prompt: $0.01 / 1000 token
• Completion: $0.03 / 1000 token

Örnek Hesaplama:
  Prompt: 500 token → $0.005
  Completion: 200 token → $0.006
  TOPLAM: $0.011 / istek

🔧 KULLANIM ÖRNEĞİ:

# Standart Kullanım
client = OpenAIClient(
    api_key="sk-...",
    model="gpt-4o",
    temperature=0.7,
    max_tokens=500
)

messages = [
    {"role": "system", "content": "Sen yardımcı bir asistansın"},
    {"role": "user", "content": "Merhaba!"}
]

# Normal istek
response = client.chat(messages)
print(response["content"])
print(f"Maliyet: ${response['usage']['total_tokens'] * 0.00001}")

# Streaming istek
for chunk in client.chat(messages, stream=True):
    print(chunk, end="", flush=True)

# İstatistikler
stats = client.get_usage_stats()
print(f"Toplam: {stats['total_requests']} istek")
print(f"Maliyet: ${stats['estimated_cost_usd']}")

🔒 GÜVENLİK:
• API key güvenli saklanır (environment variable önerilir)
• Timeout korumalı (sonsuz bekleme olmaz)
• Rate limit korumalı (API ban'i engeller)

⚡ PERFORMANS:
• Normal istek: 1-3 saniye (model hızına bağlı)
• Streaming: İlk chunk 0.5 saniyede gelir
• Retry'de maksimum gecikme: 2+4+8 = 14 saniye

📝 BAĞIMLILIKLAR:
• openai: Resmi OpenAI Python SDK
• logging: Detaylı loglama için
═══════════════════════════════════════════════════════════════════════════════
"""

import time
import logging
import os
from typing import List, Dict, Optional, Generator
from openai import OpenAI, APIError, RateLimitError, APIConnectionError

# Load .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Setup logging
logger = logging.getLogger(__name__)

# Varsayilan model: .env icindeki LLM_MODEL degeri, yoksa gpt-4o.
# ("gpt-4-turbo-preview" OpenAI tarafindan emekliye ayrildi, 404 model_not_found verir.)
FALLBACK_MODEL = "gpt-4o"


def get_default_model() -> str:
    """Return the configured default chat model (LLM_MODEL env var)."""
    return os.environ.get("LLM_MODEL") or FALLBACK_MODEL


class OpenAIClient:
    """
    Wrapper for OpenAI API with robust error handling and retry logic.
    
    Features:
    - Automatic retry with exponential backoff
    - Rate limit handling
    - Token usage tracking
    - Streaming support
    - Configurable timeouts
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_retries: int = 3,
        timeout: int = 30,
        temperature: float = 0.7,
        max_tokens: int = 500
    ):
        """
        Initialize OpenAI client.
        
        Args:
            api_key: OpenAI API key (optional, will use OPENAI_API_KEY env var if not provided)
            model: Model name (defaults to LLM_MODEL env var, else gpt-4o)
            max_retries: Maximum number of retry attempts
            timeout: Request timeout in seconds
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens in response
        """
        # Use provided API key or get from environment
        if api_key is None:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key not provided and OPENAI_API_KEY environment variable not set")
        
        self.client = OpenAI(api_key=api_key, timeout=timeout)
        self.model = model or get_default_model()
        self.max_retries = max_retries
        self.timeout = timeout
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Track token usage
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.total_requests = 0
        
        logger.info(f"OpenAI client initialized with model: {self.model}")
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Dict | Generator:
        """
        Send chat completion request to OpenAI.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max_tokens
            stream: Enable streaming response
            
        Returns:
            Response dict with 'content', 'usage', etc. or Generator for streaming
            
        Raises:
            APIError: If request fails after all retries
        """
        temp = temperature if temperature is not None else self.temperature
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Sending request (attempt {attempt + 1}/{self.max_retries})")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=max_tok,
                    stream=stream
                )
                
                if stream:
                    return self._handle_stream(response)
                else:
                    return self._handle_response(response)
                    
            except RateLimitError as e:
                logger.warning(f"Rate limit hit: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self._calculate_backoff(attempt)
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    raise APIError(f"Rate limit exceeded after {self.max_retries} retries") from e
                    
            except APIConnectionError as e:
                logger.warning(f"Connection error: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self._calculate_backoff(attempt)
                    logger.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    raise APIError(f"Connection failed after {self.max_retries} retries") from e
                    
            except APIError as e:
                logger.error(f"API error: {e}")
                raise
                
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                raise APIError(f"Unexpected error: {e}") from e
        
        raise APIError(f"Failed after {self.max_retries} attempts")
    
    def _handle_response(self, response) -> Dict:
        """
        Process non-streaming response.
        
        Args:
            response: OpenAI API response object
            
        Returns:
            Dictionary with content, usage stats, etc.
        """
        choice = response.choices[0]
        message = choice.message
        usage = response.usage
        
        # Update token tracking
        self.total_prompt_tokens += usage.prompt_tokens
        self.total_completion_tokens += usage.completion_tokens
        self.total_requests += 1
        
        logger.info(f"Request completed - Tokens: {usage.prompt_tokens} prompt + {usage.completion_tokens} completion")
        
        return {
            "content": message.content,
            "role": message.role,
            "finish_reason": choice.finish_reason,
            "usage": {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens
            }
        }
    
    def _handle_stream(self, response) -> Generator:
        """
        Process streaming response.
        
        Args:
            response: OpenAI streaming response object
            
        Yields:
            Content chunks as they arrive
        """
        logger.info("Starting streaming response")
        
        for chunk in response:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                yield content
        
        logger.info("Streaming response completed")
    
    def _calculate_backoff(self, attempt: int) -> float:
        """
        Calculate exponential backoff wait time.
        
        Args:
            attempt: Current attempt number (0-indexed)
            
        Returns:
            Wait time in seconds
        """
        # Exponential backoff: 2^attempt seconds (2s, 4s, 8s, ...)
        return min(2 ** attempt, 30)  # Cap at 30 seconds
    
    def get_usage_stats(self) -> Dict:
        """
        Get token usage statistics.
        
        Returns:
            Dictionary with usage stats
        """
        total_tokens = self.total_prompt_tokens + self.total_completion_tokens
        
        # Rough cost estimation (gpt-4-turbo pricing as of Dec 2024)
        # $0.01 per 1K prompt tokens, $0.03 per 1K completion tokens
        estimated_cost = (
            (self.total_prompt_tokens / 1000) * 0.01 +
            (self.total_completion_tokens / 1000) * 0.03
        )
        
        return {
            "total_requests": self.total_requests,
            "prompt_tokens": self.total_prompt_tokens,
            "completion_tokens": self.total_completion_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": round(estimated_cost, 4)
        }
    
    def reset_stats(self):
        """Reset token usage statistics."""
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.total_requests = 0
        logger.info("Usage stats reset")


# Convenience function for quick usage
def create_client(
    api_key: str,
    model: Optional[str] = None,
    **kwargs
) -> OpenAIClient:
    """
    Create and return an OpenAI client instance.
    
    Args:
        api_key: OpenAI API key
        model: Model name
        **kwargs: Additional arguments for OpenAIClient
        
    Returns:
        Configured OpenAIClient instance
    """
    return OpenAIClient(api_key=api_key, model=model, **kwargs)
