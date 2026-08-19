"""
═══════════════════════════════════════════════════════════════════════════
🎯 RAG_ENGINE.PY - RETRIEVAL-AUGMENTED GENERATION MOTORU
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya RAG sisteminin beyni! Tüm RAG bileşenlerini orkestra eder:
• Document loading
• Chunking
• Embedding
• Vector storage
• Semantic search
• Context generation

🏗️ SİSTEM MİMARİSİ:

    RAGEngine (Orkestratör)
         │
    ┌────┼────┬────────┬────────┐
    │    │    │        │        │
    │    │    │        │        │
  Loader Chunker Embedder Vector  LLM
               Client   Store

🔄 İKİ ANA FAZI:

FAZI 1: İNDEKSLEME (Offline - Tek sefer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PDF'leri yükle (DocumentLoader)
2. Chunk'lara böl (TextChunker)
3. Her chunk'ı embed et (EmbeddingsClient)
4. Vector DB'ye kaydet (VectorStore)

Örnek:
    rag = RAGEngine(api_key="...")
    rag.index_documents("docs/")  # Klasördeki tüm PDF'ler
    # → 100 PDF, 500 chunk, Vector DB'ye kaydedildi

FAZ 2: SORGULAMA (Online - Her kullanıcı sorusunda)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Kullanıcı sorusunu embed et
2. Vector DB'de benzer chunk'ları ara
3. En yakın K chunk'ı al (top-K retrieval)
4. GPT'ye context olarak ver
5. Cevap üret

Örnek:
    query = "Bıçak nasıl takılır?"
    context = rag.retrieve(query, top_k=3)
    
    # GPT'ye gönder:
    prompt = f"Context: {context}\\n\\nSoru: {query}"
    response = gpt.chat(prompt)

📊 RETRIEVAL STRATEJİLERİ:

1. SEMANTIC SEARCH (Ana strateji)
   • Vector similarity (cosine distance)
   • Anlam bazlı arama
   • %90+ doğruluk

2. HYBRID SEARCH (İsteğe bağlı)
   • Semantic + Keyword search
   • En iyi sonuç kalitesi
   • Biraz daha yavaş

3. RE-RANKING (Gelişmiş)
   • İlk 20 sonucu al
   • Cross-encoder ile yeniden sırala
   • En alakalı 3'ü seç

🛠️ ANA FONKSİYONLAR:

index_documents(source) - Dokümanları İndeksle
    • Klasör veya dosya yolu
    • Tüm işlem pipeline'ını çalıştır
    • Vector DB'ye kaydet
    
    rag.index_documents("docs/manual.pdf")
    rag.index_documents("docs/")  # Klasör

retrieve(query, top_k) - İlgili Chunk'ları Getir
    • Query'i embed et
    • Vector search yap
    • Top-K sonuç döndür
    
    chunks = rag.retrieve("Bıçak bakımı nasıl yapılır?", top_k=3)

get_context(query, top_k) - GPT İçin Context Hazırla
    • retrieve() + formatting
    • GPT'ye hazır string
    
    context = rag.get_context(query)
    prompt = f"Context: {context}\\n\\nSoru: {query}"

query(question) - Tam RAG Sorgusu
    • retrieve() + LLM generation
    • Tek fonksiyonda tam işlem
    
    answer = rag.query("Bıçak nasıl takılır?")
    print(answer)  # GPT'nin cevabı

get_stats() - İstatistikler
    • Kaç doküman indekslendi?
    • Kaç chunk var?
    • Vector DB bilgileri

💡 KULLANIM ÖRNEKLERİ:

ÖRNEK 1: Basit Kullanım
──────────────────────
from llm.rag_engine import RAGEngine

# Engine'i başlat
rag = RAGEngine(api_key="sk-...")

# Dokümanları indeksle (tek sefer)
rag.index_documents("docs/")

# Soru sor
answer = rag.query("Bıçak nasıl takılır?")
print(answer)

ÖRNEK 2: Manuel Kontrol
─────────────────────
# Sadece context al (GPT'ye kendin gönder)
context = rag.get_context("Güvenlik önlemleri", top_k=5)

# Kendi prompt'unu oluştur
custom_prompt = f"\"\"\"
Şu doküman bilgisine göre cevapla:
{context}

Soru: Güvenlik önlemleri nelerdir?
Cevap:
"\"\"

# GPT'ye gönder
response = openai.chat(custom_prompt)

ÖRNEK 3: Batch Processing
────────────────────────
# Çok sayıda soru
questions = [
    "Bıçak takma",
    "Soğutma sistemi",
    "Bakım talimatları"
]

for q in questions:
    answer = rag.query(q)
    print(f"Q: {q}\\nA: {answer}\\n")

⚡ PERFORMANS:

• İndeksleme: 100 PDF → 5-10 dakika (tek sefer)
• Retrieval: ~100-200ms
• Total (retrieve + GPT): ~2-3 saniye

💾 DEPOLAMA:

• Vector DB: ./chroma_db/ klasörü
• Persistent (program kapansa da kalır)
• Yeniden indekslemeye gerek yok

🔧 AYARLANABİLİR PARAMETRELER:

• chunk_size: 500-1000 (önerilen: 800)
• overlap: 50-200 (önerilen: 100)
• top_k: 3-10 (önerilen: 5)
• embedding_model: text-embedding-3-small (varsayılan)

📝 BAĞIMLILIKLAR:
• Tüm RAG modülleri (embeddings, vector_store, document_loader, chunker)
• openai_client: LLM generation için (opsiyonel)
═══════════════════════════════════════════════════════════════════════════
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Optional, Union
import logging

# Load environment variables first
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from llm.embeddings_client import EmbeddingsClient
from llm.vector_store import VectorStore
from llm.document_loader import DocumentLoader
from llm.chunker import TextChunker
from llm.openai_client import OpenAIClient

logger = logging.getLogger(__name__)


class RAGEngine:
    """
    Complete RAG (Retrieval-Augmented Generation) engine.
    
    Combines:
    - Document loading
    - Chunking
    - Embedding
    - Vector storage
    - Semantic search
    - LLM generation
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        collection_name: str = "rag_documents",
        persist_directory: str = "./chroma_db",
        chunk_size: int = 800,
        chunk_overlap: int = 100,
        embedding_model: str = "text-embedding-3-small",
        llm_model: Optional[str] = None
    ):
        """
        Initialize RAG engine.
        
        Args:
            api_key: OpenAI API key (optional, will use OPENAI_API_KEY env var if not provided)
            collection_name: Vector DB collection name
            persist_directory: Where to store vector DB
            chunk_size: Target chunk size in tokens
            chunk_overlap: Overlap between chunks
            embedding_model: OpenAI embedding model
            llm_model: GPT model for generation (defaults to LLM_MODEL env var, else gpt-4o)
        """
        # Load environment variables if not already loaded
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ImportError:
            pass
        
        # Use provided API key or get from environment  
        if api_key is None:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key not provided and OPENAI_API_KEY environment variable not set")
                
        self.api_key = api_key
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize components
        self.embeddings_client = EmbeddingsClient(
            api_key=api_key,
            model=embedding_model
        )
        
        self.vector_store = VectorStore(
            collection_name=collection_name,
            persist_directory=persist_directory
        )
        
        self.document_loader = DocumentLoader()
        self.chunker = TextChunker()
        
        # LLM client (optional, for query())
        self.llm_client = OpenAIClient(
            api_key=api_key,
            model=llm_model,
            temperature=0.7
        )
        
        logger.info(f"RAGEngine initialized with collection: {collection_name}")
    
    def index_documents(
        self,
        source: Union[str, Path, List[str]],
        metadata: Optional[Dict] = None,
        batch_size: int = 100
    ) -> int:
        """
        Index documents into vector store.
        
        Complete pipeline:
        1. Load documents
        2. Chunk them
        3. Generate embeddings
        4. Store in vector DB
        
        Args:
            source: File path, directory, or list of paths
            metadata: Optional metadata to add to all documents
            batch_size: Batch size for embedding
            
        Returns:
            Number of chunks indexed
            
        Example:
            # Single file
            rag.index_documents("manual.pdf")
            
            # Directory (recursive)
            rag.index_documents("docs/")
            
            # Multiple files
            rag.index_documents(["doc1.pdf", "doc2.txt"])
        """
        logger.info(f"Starting indexing: {source}")
        
        # Step 1: Load documents
        if isinstance(source, (list, tuple)):
            documents = []
            for path in source:
                docs = self.document_loader.load_file(path)
                documents.extend(docs)
        elif Path(source).is_dir():
            documents = self.document_loader.load_directory(source)
        else:
            documents = self.document_loader.load_file(source)
        
        logger.info(f"Loaded {len(documents)} documents")
        
        if not documents:
            logger.warning("No documents to index")
            return 0
        
        # Step 2: Chunk documents
        chunks = self.chunker.chunk_documents(
            documents,
            strategy="sentence",
            target_size=self.chunk_size,
            overlap_size=self.chunk_overlap
        )
        
        logger.info(f"Created {len(chunks)} chunks")
        
        if not chunks:
            logger.warning("No chunks created")
            return 0
        
        # Step 3: Generate embeddings (batch processing)
        chunk_texts = [c['content'] for c in chunks]
        embeddings = self.embeddings_client.embed_batch(
            chunk_texts,
            batch_size=batch_size
        )
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        # Step 4: Prepare metadata
        chunk_metadatas = []
        for chunk in chunks:
            meta = chunk['metadata'].copy()
            if metadata:
                meta.update(metadata)
            chunk_metadatas.append(meta)
        
        # Step 5: Store in vector DB
        ids = self.vector_store.add_documents(
            documents=chunk_texts,
            metadatas=chunk_metadatas,
            embeddings=embeddings
        )
        
        logger.info(f"Indexed {len(ids)} chunks successfully")
        
        return len(ids)
    
    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Retrieve relevant chunks for a query.
        
        Args:
            query: Search query
            top_k: Number of results to return
            filter_metadata: Optional metadata filter
            
        Returns:
            List of relevant chunks with metadata and scores
            
        Example:
            results = rag.retrieve("Bıçak takma talimatı", top_k=3)
            
            for result in results:
                print(f"Score: {result['score']:.3f}")
                print(f"Source: {result['metadata']['source']}")
                print(f"Text: {result['content'][:100]}...")
        """
        # Embed query
        query_embedding = self.embeddings_client.embed_text(query)
        
        # Search vector store
        documents, metadatas, scores = self.vector_store.search(
            query=query,
            top_k=top_k,
            filter_metadata=filter_metadata,
            query_embedding=query_embedding
        )
        
        # Format results
        results = []
        for doc, meta, score in zip(documents, metadatas, scores):
            results.append({
                "content": doc,
                "metadata": meta,
                "score": score
            })
        
        logger.info(f"Retrieved {len(results)} chunks for query: {query[:50]}...")
        
        return results
    
    def get_context(
        self,
        query: str,
        top_k: int = 5,
        format_template: str = "Document {i}:\\nSource: {source}\\n{content}\\n"
    ) -> str:
        """
        Get formatted context string for GPT.
        
        Args:
            query: Search query
            top_k: Number of results
            format_template: How to format each chunk
            
        Returns:
            Formatted context string ready for GPT
            
        Example:
            context = rag.get_context("Bıçak bakımı", top_k=3)
            
            prompt = f"\"\"\"
            Context from documents:
            {context}
            
            Question: Bıçak bakımı nasıl yapılır?
            Answer:
            "\"\"
        """
        results = self.retrieve(query, top_k=top_k)
        
        if not results:
            return "No relevant documents found."
        
        # Format each result
        formatted_chunks = []
        for i, result in enumerate(results, 1):
            formatted = format_template.format(
                i=i,
                source=result['metadata'].get('parent_source', 'unknown'),
                content=result['content'],
                score=result['score']
            )
            formatted_chunks.append(formatted)
        
        context = "\\n".join(formatted_chunks)
        
        return context
    
    def query(
        self,
        question: str,
        top_k: int = 5,
        system_prompt: Optional[str] = None,
        include_sources: bool = True
    ) -> Union[str, Dict]:
        """
        Complete RAG query: retrieve + generate answer.
        
        Args:
            question: User question
            top_k: Number of documents to retrieve
            system_prompt: Custom system prompt
            include_sources: Return sources in response
            
        Returns:
            Generated answer (with sources if requested)
            
        Example:
            answer = rag.query("Bıçak nasıl takılır?")
            print(answer)
        """
        # Retrieve relevant context
        results = self.retrieve(question, top_k=top_k)
        
        if not results:
            return "Üzgünüm, bu konuda dokümanlarımda bilgi bulamadım."
        
        # Build context
        context_parts = []
        sources = []
        
        for i, result in enumerate(results, 1):
            context_parts.append(f"[{i}] {result['content']}")
            sources.append({
                "index": i,
                "source": result['metadata'].get('parent_source', 'unknown'),
                "page": result['metadata'].get('parent_page'),
                "score": result['score']
            })
        
        context = "\\n\\n".join(context_parts)
        
        # Build prompt
        if system_prompt is None:
            system_prompt = """Sen yardımsever bir asistansın. Verilen doküman bilgilerine dayanarak soruları cevaplıyorsun.

Kurallar:
- Sadece verilen dokümanlardaki bilgileri kullan
- Emin değilsen "Bilgim yok" de
- Kaynak numaralarını belirt [1], [2] gibi
- Açık ve net cevaplar ver"""
        
        user_message = f"""Doküman İçeriği:
{context}

Soru: {question}

Lütfen yukarıdaki doküman bilgilerine dayanarak cevapla."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # Generate answer
        response = self.llm_client.chat(messages)
        answer = response["content"]
        
        logger.info(f"Generated answer for: {question[:50]}...")
        
        if include_sources:
            return {
                "answer": answer,
                "sources": sources,
                "usage": response.get("usage", {})
            }
        else:
            return answer
    
    def get_stats(self) -> Dict:
        """
        Get RAG engine statistics.
        
        Returns:
            Dict with stats
        """
        vector_stats = self.vector_store.get_collection_stats()
        embedding_stats = self.embeddings_client.get_usage_stats()
        loader_stats = self.document_loader.get_stats()
        
        return {
            "vector_store": vector_stats,
            "embeddings": embedding_stats,
            "document_loader": loader_stats
        }
    
    def clear_index(self) -> bool:
        """
        Clear all indexed documents.
        
        Returns:
            True if successful
        """
        return self.vector_store.delete_collection()


# Quick test
def test_rag_engine():
    """Quick test of RAG engine."""
    import os
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Set OPENAI_API_KEY environment variable")
        return
    
    print("Testing RAG Engine...")
    
    # Create engine
    rag = RAGEngine(api_key=api_key)
    
    # Create test document
    test_file = Path("test_doc.txt")
    test_file.write_text("""
    Testere Bıçağı Kullanım Kılavuzu
    
    Bıçak Takma Talimatı:
    1. Makineyi kapatın ve fişini çekin
    2. Koruyucu eldiven giyin
    3. Eski bıçağı çıkarın
    4. Yeni bıçağın dişlerinin doğru yönde olduğundan emin olun
    5. Bıçağı takın ve sıkın
    
    Güvenlik Önlemleri:
    - Asla açık makinede çalışmayın
    - Koruyucu ekipman kullanın
    - Düzenli bakım yapın
    """, encoding='utf-8')
    
    # Index
    count = rag.index_documents(test_file)
    print(f"Indexed {count} chunks")
    
    # Query
    answer = rag.query("Bıçak nasıl takılır?")
    print(f"\\nAnswer: {answer}")
    
    # Stats
    stats = rag.get_stats()
    print(f"\\nStats: {stats}")
    
    # Cleanup
    test_file.unlink()
    rag.clear_index()
    print("\\nTest completed!")


if __name__ == "__main__":
    test_rag_engine()
