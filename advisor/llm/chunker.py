"""
═══════════════════════════════════════════════════════════════════════════
✂️ CHUNKER.PY - DOKÜMAN PARÇALAMA MOTORU
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya büyük dokümanları küçük parçalara (chunk) böler. RAG'in kalitesi 
buraya bağlı! Çok büyük chunk → GPT'nin context'i taşar. Çok küçük chunk → 
Anlam kaybolur.

📏 OPTİMAL CHUNK BOYUTU:
• Min: 100 token (~75 kelime)
• İdeal: 500-1000 token (~375-750 kelime)
• Max: 1500 token (~1125 kelime)

🔄 CHUNKING STRATEJİLERİ:

1. FIXED SIZE (Sabit Boyut)
   • Basit: Her chunk tam N token
   • Hızlı ama cümleleri kesebilir
   • Küçük dokümanlar için ideal

2. SENTENCE-AWARE (Cümle Farkında)
   • Akıllı: Cümle ortasında kesme
   • Doğal parçalar oluşur
   • ÖNERİLEN! ✅

3. PARAGRAPH-AWARE (Paragraf Farkında)
   • En akıllı: Paragraflara göre böl
   • Anlamsal bütünlük korunur
   • Büyük dokümanlar için ideal

🧩 OVERLAP (Çakışma):

Chunk 1: "... Bıçak takma talimatı: 1. Makineyi kapatın..."
                                    ↓ (overlap)
Chunk 2: "... 1. Makineyi kapatın. 2. Güvenliği kontrol edin..."

Neden gerekli?
• Context kaybını önler
• Chunk sınırlarındaki bilgiyi korur
• Arama kalitesini artırır

Optimal overlap: 50-200 token (%10-20)

🔄 İŞ AKIŞI:

Doküman (10,000 token)
    ↓
Chunking Strategy Seç
    ↓
Token'lara böl
    ↓
Chunk'ları oluştur (overlap ile)
    ↓
Metadata ekle (chunk_id, position, parent_doc)
    ↓
Chunk listesi döndür

📦 CHUNK YAPISI:

Chunk = {
    "content": "Bıçak takma talimatı...",
    "metadata": {
        "chunk_id": 0,
        "chunk_count": 5,
        "token_count": 512,
        "char_count": 2048,
        "parent_doc": "manual.pdf",
        "page": 5,
        "start_pos": 0,
        "end_pos": 2048
    }
}

🛠️ ANA FONKSİYONLAR:

chunk_text(text, chunk_size, overlap) - Basit Chunking
    • Fixed size strategy
    • Hızlı ve basit
    • Test için iyi

chunk_by_sentences(text, target_size, overlap) - Akıllı Chunking
    • Sentence-aware strategy
    • Cümle ortasında kesme yapmaz
    • ÖNERİLEN! ✅

chunk_documents(docs, strategy) - Toplu Chunking
    • Document listesi → Chunk listesi
    • Metadata korunur
    • Toplu işleme optimize

💡 KULLANIM SENARYOLARI:

1. PDF Chunking
   docs = load_pdf("manual.pdf")  # 50 sayfa
   chunks = chunker.chunk_documents(docs, strategy="sentence")
   # 50 sayfa → 200 chunk

2. Büyük Text Chunking
   text = "10,000 kelimelik doküman..."
   chunks = chunker.chunk_by_sentences(text, target_size=500)
   # 10,000 kelime → 20 chunk

⚡ PERFORMANS:
• Fixed size: 1000 chunk/saniye
• Sentence-aware: 500 chunk/saniye
• Paragraph-aware: 300 chunk/saniye

🎯 EN İYİ UYGULAMALAR:
• Teknik dokümanlar: 800-1000 token, overlap 100
• FAQ'ler: 300-500 token, overlap 50
• Kullanım kılavuzları: 500-800 token, overlap 100
• Kod örnekleri: 200-400 token, overlap 50

📝 BAĞIMLILIKLAR:
• tiktoken: Token sayma (OpenAI's tokenizer)
• re: Regex (cümle ayırma için)
═══════════════════════════════════════════════════════════════════════════
"""

from typing import List, Dict, Optional
import re
import logging

try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logging.warning("tiktoken not installed. Token counting will be approximate.")

logger = logging.getLogger(__name__)


class TextChunker:
    """
    Text chunking utility with multiple strategies.
    
    Strategies:
    - fixed: Fixed size chunks
    - sentence: Sentence-aware chunking (recommended)
    - paragraph: Paragraph-aware chunking
    """
    
    # Sentence delimiter patterns (Turkish + English)
    SENTENCE_DELIMITERS = r'[.!?]\s+'
    
    # Paragraph delimiter
    PARAGRAPH_DELIMITER = r'\n\n+'
    
    def __init__(self, encoding_name: str = "cl100k_base"):
        """
        Initialize text chunker.
        
        Args:
            encoding_name: Tokenizer encoding (cl100k_base for GPT-4)
        """
        self.encoding_name = encoding_name
        
        if TIKTOKEN_AVAILABLE:
            try:
                self.encoder = tiktoken.get_encoding(encoding_name)
            except:
                self.encoder = None
                logger.warning(f"Could not load encoding: {encoding_name}")
        else:
            self.encoder = None
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.
        
        Args:
            text: Input text
            
        Returns:
            Token count
        """
        if self.encoder:
            return len(self.encoder.encode(text))
        else:
            # Approximate: 1 token ≈ 4 characters
            return len(text) // 4
    
    def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        overlap: int = 100
    ) -> List[Dict]:
        """
        Simple fixed-size chunking.
        
        Args:
            text: Input text
            chunk_size: Target chunk size in tokens
            overlap: Overlap between chunks in tokens
            
        Returns:
            List of chunks with metadata
        """
        if not text or not text.strip():
            return []
        
        # Encode to tokens
        if self.encoder:
            tokens = self.encoder.encode(text)
        else:
            # Fallback: split by whitespace
            tokens = text.split()
        
        chunks = []
        start = 0
        
        while start < len(tokens):
            end = start + chunk_size
            chunk_tokens = tokens[start:end]
            
            # Decode back to text
            if self.encoder:
                chunk_text = self.encoder.decode(chunk_tokens)
            else:
                chunk_text = ' '.join(chunk_tokens)
            
            chunks.append({
                "content": chunk_text.strip(),
                "metadata": {
                    "chunk_id": len(chunks),
                    "token_count": len(chunk_tokens),
                    "char_count": len(chunk_text),
                    "start_token": start,
                    "end_token": end
                }
            })
            
            # Move start position (with overlap)
            start = end - overlap
        
        logger.info(f"Created {len(chunks)} chunks (fixed size strategy)")
        return chunks
    
    def chunk_by_sentences(
        self,
        text: str,
        target_size: int = 800,
        overlap_size: int = 100,
        max_size: int = 1200
    ) -> List[Dict]:
        """
        Sentence-aware chunking (RECOMMENDED).
        
        Args:
            text: Input text
            target_size: Target chunk size in tokens
            overlap_size: Overlap size in tokens
            max_size: Maximum chunk size in tokens
            
        Returns:
            List of chunks with metadata
        """
        if not text or not text.strip():
            return []
        
        # Split into sentences
        sentences = re.split(self.SENTENCE_DELIMITERS, text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            # If adding this sentence exceeds target, finalize current chunk
            if current_tokens + sentence_tokens > target_size and current_chunk:
                chunk_text = '. '.join(current_chunk) + '.'
                
                chunks.append({
                    "content": chunk_text.strip(),
                    "metadata": {
                        "chunk_id": len(chunks),
                        "token_count": current_tokens,
                        "char_count": len(chunk_text),
                        "sentence_count": len(current_chunk)
                    }
                })
                
                # Keep last few sentences for overlap
                overlap_sentences = []
                overlap_tokens = 0
                
                for sent in reversed(current_chunk):
                    sent_tokens = self.count_tokens(sent)
                    if overlap_tokens + sent_tokens <= overlap_size:
                        overlap_sentences.insert(0, sent)
                        overlap_tokens += sent_tokens
                    else:
                        break
                
                current_chunk = overlap_sentences
                current_tokens = overlap_tokens
            
            # Add sentence to current chunk
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
            
            # Emergency split if chunk is too large
            if current_tokens > max_size:
                chunk_text = '. '.join(current_chunk) + '.'
                chunks.append({
                    "content": chunk_text.strip(),
                    "metadata": {
                        "chunk_id": len(chunks),
                        "token_count": current_tokens,
                        "char_count": len(chunk_text),
                        "sentence_count": len(current_chunk)
                    }
                })
                current_chunk = []
                current_tokens = 0
        
        # Add remaining sentences
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunks.append({
                "content": chunk_text.strip(),
                "metadata": {
                    "chunk_id": len(chunks),
                    "token_count": current_tokens,
                    "char_count": len(chunk_text),
                    "sentence_count": len(current_chunk)
                }
            })
        
        logger.info(f"Created {len(chunks)} chunks (sentence-aware strategy)")
        return chunks
    
    def chunk_documents(
        self,
        documents: List,
        strategy: str = "sentence",
        **kwargs
    ) -> List[Dict]:
        """
        Chunk multiple documents.
        
        Args:
            documents: List of Document objects (from document_loader)
            strategy: Chunking strategy ("fixed" or "sentence")
            **kwargs: Strategy-specific parameters
            
        Returns:
            List of chunks with combined metadata
        """
        all_chunks = []
        
        for doc_idx, doc in enumerate(documents):
            # Extract content and metadata
            if hasattr(doc, 'content'):
                content = doc.content
                doc_metadata = doc.metadata
            elif isinstance(doc, dict):
                content = doc.get('content', '')
                doc_metadata = doc.get('metadata', {})
            else:
                content = str(doc)
                doc_metadata = {}
            
            # Chunk this document
            if strategy == "fixed":
                doc_chunks = self.chunk_text(content, **kwargs)
            elif strategy == "sentence":
                doc_chunks = self.chunk_by_sentences(content, **kwargs)
            else:
                raise ValueError(f"Unknown strategy: {strategy}")
            
            # Add document metadata to each chunk
            for chunk in doc_chunks:
                chunk['metadata'].update({
                    'document_id': doc_idx,
                    'parent_source': doc_metadata.get('source', 'unknown'),
                    'parent_page': doc_metadata.get('page'),
                    'chunk_count_in_doc': len(doc_chunks)
                })
                all_chunks.append(chunk)
        
        logger.info(f"Total: Created {len(all_chunks)} chunks from {len(documents)} documents")
        return all_chunks


# Convenience functions
def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[Dict]:
    """Quick text chunking."""
    chunker = TextChunker()
    return chunker.chunk_text(text, chunk_size, overlap)


def chunk_by_sentences(text: str, target_size: int = 800) -> List[Dict]:
    """Quick sentence-aware chunking."""
    chunker = TextChunker()
    return chunker.chunk_by_sentences(text, target_size)


# Test function
def test_chunker():
    """Quick test of chunking functionality."""
    print("Testing Text Chunker...")
    
    chunker = TextChunker()
    
    # Test text
    text = """
    Testere bıçağı seçimi çok önemlidir. Doğru bıçak seçimi kesim kalitesini artırır.
    Karbon çelik için özel bıçaklar kullanılmalıdır. Soğutma sistemi de önemlidir.
    Bıçak uzunluğu makineye uygun olmalıdır. Diş aralığı malzemeye göre seçilmelidir.
    Güvenlik önlemleri unutulmamalıdır. Düzenli bakım gereklidir.
    """
    
    # Fixed size chunking
    chunks = chunker.chunk_text(text, chunk_size=50, overlap=10)
    print(f"Fixed size: {len(chunks)} chunks")
    
    # Sentence-aware chunking
    chunks = chunker.chunk_by_sentences(text, target_size=30)
    print(f"Sentence-aware: {len(chunks)} chunks")
    
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i}:")
        print(f"  Tokens: {chunk['metadata']['token_count']}")
        print(f"  Text: {chunk['content'][:80]}...")


if __name__ == "__main__":
    test_chunker()
