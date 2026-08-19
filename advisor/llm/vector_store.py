"""
═══════════════════════════════════════════════════════════════════════════
🗄️ VECTOR_STORE.PY - VECTOR DATABASE YÖNETİCİSİ (ChromaDB)
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya vektörleri saklar ve benzerlik araması yapar. RAG'in hafızası!
ChromaDB kullanarak local'de çalışır, ücretsiz ve hızlıdır.

🔍 NE YAPAR?
1. Vektörleri kaydet (doküman chunk'ları + metadata)
2. Benzerlik araması yap (cosine similarity)
3. Top-K en benzer sonuçları döndür

📊 VERİ YAPISI:

Collection (Koleksiyon)
  ├─ Document 1: "Bıçak takma talimatı..."
  │    ├─ Vector: [0.1, 0.2, ...]
  │    └─ Metadata: {source: "manual.pdf", page: 5}
  │
  ├─ Document 2: "Güvenlik önlemleri..."
  │    ├─ Vector: [0.3, -0.1, ...]
  │    └─ Metadata: {source: "safety.pdf", page: 2}
  └─ ...

🔄 BENZERLIK ARAMA AKIŞI:

Kullanıcı Sorusu: "Bıçak nasıl takılır?"
    ↓
Embed et → [0.15, 0.18, ...]
    ↓
ChromaDB'de Cosine Similarity hesapla
    ↓
En benzer 3 chunk'ı bul:
  1. "Bıçak takma talimatı" (similarity: 0.89)
  2. "Montaj adımları" (similarity: 0.82)
  3. "Kurulum rehberi" (similarity: 0.78)
    ↓
Bu chunk'ları GPT'ye context olarak ver

🛠️ ANA FONKSİYONLAR:

add_documents(texts, metadatas) - Doküman Ekle
    • Chunk'ları vector DB'ye kaydet
    • Otomatik ID üretir
    • Metadata ile birlikte

search(query, top_k) - Benzerlik Araması
    • Query vector'e benzer chunk'ları bul
    • Top-K en yakın sonucu döndür
    • Metadata ile birlikte

delete_collection() - Koleksiyonu Sil
    • Tüm dokümanları temizle
    • Yeniden başlamak için

get_collection_stats() - İstatistikler
    • Kaç doküman var?
    • Koleksiyon bilgileri

💡 KULLANIM SENARYOLARI:

1. İlk Kurulum (Offline)
   PDF'leri yükle → Chunk'lara böl → Embed et → Vector Store'a kaydet

2. Arama (Online)
   Kullanıcı sorusu → Embed et → Vector Store'da ara → İlgili chunk'ları bul

⚡ PERFORMANS:
• Add: ~10ms per document
• Search: ~50ms for 1000 documents
• Storage: Local disk (./chroma_db/)

🆚 ALTERNATİFLER:
• ChromaDB: Local, ücretsiz, hızlı ✅ (kullanıyoruz)
• Pinecone: Cloud, ücretli, scale'lenebilir
• Qdrant: Self-hosted, production-grade
• FAISS: Meta'nın library'si, çok hızlı ama low-level

📝 BAĞIMLILIKLAR:
• chromadb: Vector database
• embeddings_client: Text → Vector
═══════════════════════════════════════════════════════════════════════════
"""

from typing import List, Dict, Optional, Tuple
import chromadb
from chromadb.config import Settings
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class VectorStore:
    """
    ChromaDB wrapper for vector storage and similarity search.
    
    Features:
    - Store document embeddings with metadata
    - Similarity search (cosine distance)
    - Collection management
    - Persistent storage
    """
    
    def __init__(
        self,
        collection_name: str = "rules_engine_docs",
        persist_directory: str = "./chroma_db",
        embedding_function = None
    ):
        """
        Initialize vector store.
        
        Args:
            collection_name: Name of the collection
            persist_directory: Directory to persist data
            embedding_function: Custom embedding function (optional)
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        
        # Create persist directory if not exists
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        try:
            self.collection = self.client.get_collection(
                name=collection_name,
                embedding_function=embedding_function
            )
            logger.info(f"Loaded existing collection: {collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=collection_name,
                embedding_function=embedding_function,
                metadata={"description": "RAG document storage"}
            )
            logger.info(f"Created new collection: {collection_name}")
    
    def add_documents(
        self,
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None,
        embeddings: Optional[List[List[float]]] = None
    ) -> List[str]:
        """
        Add documents to vector store.
        
        Args:
            documents: List of text documents
            metadatas: Optional metadata for each document
            ids: Optional IDs (auto-generated if not provided)
            embeddings: Pre-computed embeddings (optional)
            
        Returns:
            List of document IDs
            
        Example:
            docs = ["chunk1", "chunk2"]
            metas = [
                {"source": "manual.pdf", "page": 1},
                {"source": "manual.pdf", "page": 2}
            ]
            ids = store.add_documents(docs, metas)
        """
        if not documents:
            return []
        
        # Auto-generate IDs if not provided
        if ids is None:
            import uuid
            ids = [f"doc_{uuid.uuid4().hex[:8]}" for _ in documents]
        
        # Prepare metadatas
        if metadatas is None:
            metadatas = [{"index": i} for i in range(len(documents))]
        
        try:
            # Add to collection
            if embeddings:
                self.collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids,
                    embeddings=embeddings
                )
            else:
                self.collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
            
            logger.info(f"Added {len(documents)} documents to collection")
            return ids
            
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: Optional[Dict] = None,
        query_embedding: Optional[List[float]] = None
    ) -> Tuple[List[str], List[Dict], List[float]]:
        """
        Search for similar documents.
        
        Args:
            query: Query text
            top_k: Number of results to return
            filter_metadata: Optional metadata filter
            query_embedding: Pre-computed query embedding
            
        Returns:
            Tuple of (documents, metadatas, distances)
            
        Example:
            docs, metas, scores = store.search(
                "Bıçak nasıl takılır?",
                top_k=3
            )
            for doc, meta, score in zip(docs, metas, scores):
                print(f"Score: {score:.3f}")
                print(f"Source: {meta['source']}")
                print(f"Text: {doc[:100]}...")
        """
        try:
            # Query collection
            if query_embedding:
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where=filter_metadata
                )
            else:
                results = self.collection.query(
                    query_texts=[query],
                    n_results=top_k,
                    where=filter_metadata
                )
            
            # Extract results
            documents = results['documents'][0] if results['documents'] else []
            metadatas = results['metadatas'][0] if results['metadatas'] else []
            distances = results['distances'][0] if results['distances'] else []
            
            # Convert distance to similarity score (1 - distance for cosine)
            similarities = [1 - d for d in distances]
            
            logger.info(f"Found {len(documents)} results for query")
            return documents, metadatas, similarities
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return [], [], []
    
    def delete_documents(self, ids: List[str]) -> bool:
        """
        Delete documents by IDs.
        
        Args:
            ids: List of document IDs to delete
            
        Returns:
            True if successful
        """
        try:
            self.collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents")
            return True
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            return False
    
    def delete_collection(self) -> bool:
        """
        Delete entire collection.
        
        Returns:
            True if successful
        """
        try:
            self.client.delete_collection(self.collection_name)
            logger.info(f"Deleted collection: {self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection: {e}")
            return False
    
    def get_collection_stats(self) -> Dict:
        """
        Get collection statistics.
        
        Returns:
            Dict with collection info
        """
        try:
            count = self.collection.count()
            return {
                "name": self.collection_name,
                "count": count,
                "persist_directory": self.persist_directory
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"error": str(e)}
    
    def update_document(
        self,
        doc_id: str,
        document: Optional[str] = None,
        metadata: Optional[Dict] = None,
        embedding: Optional[List[float]] = None
    ) -> bool:
        """
        Update a document.
        
        Args:
            doc_id: Document ID to update
            document: New document text (optional)
            metadata: New metadata (optional)
            embedding: New embedding (optional)
            
        Returns:
            True if successful
        """
        try:
            update_data = {"ids": [doc_id]}
            
            if document:
                update_data["documents"] = [document]
            if metadata:
                update_data["metadatas"] = [metadata]
            if embedding:
                update_data["embeddings"] = [embedding]
            
            self.collection.update(**update_data)
            logger.info(f"Updated document: {doc_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update document: {e}")
            return False
    
    def get_document(self, doc_id: str) -> Optional[Dict]:
        """
        Get a specific document by ID.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document data or None
        """
        try:
            result = self.collection.get(ids=[doc_id])
            
            if result['documents']:
                return {
                    "id": doc_id,
                    "document": result['documents'][0],
                    "metadata": result['metadatas'][0] if result['metadatas'] else {}
                }
            return None
            
        except Exception as e:
            logger.error(f"Failed to get document: {e}")
            return None


# Convenience function
def create_vector_store(
    collection_name: str = "rules_engine_docs",
    **kwargs
) -> VectorStore:
    """
    Create and return vector store.
    
    Args:
        collection_name: Name of collection
        **kwargs: Additional arguments
        
    Returns:
        Configured VectorStore
    """
    return VectorStore(collection_name=collection_name, **kwargs)


# Quick test function
def test_vector_store():
    """Quick test of vector store functionality."""
    print("Testing Vector Store...")
    
    # Create store
    store = VectorStore(collection_name="test_collection")
    
    # Add test documents
    docs = [
        "Karbon çelik testere bıçağı kullanım kılavuzu",
        "Alüminyum profil kesim tavsiyeleri",
        "Paslanmaz çelik için soğutma önerileri"
    ]
    
    metas = [
        {"source": "manual.pdf", "page": 1, "category": "steel"},
        {"source": "guide.pdf", "page": 5, "category": "aluminum"},
        {"source": "tips.pdf", "page": 3, "category": "stainless"}
    ]
    
    ids = store.add_documents(docs, metas)
    print(f"Added {len(ids)} documents")
    
    # Search
    results = store.search("çelik kesim", top_k=2)
    docs, metas, scores = results
    
    print("\nSearch results:")
    for doc, meta, score in zip(docs, metas, scores):
        print(f"  Score: {score:.3f} | {doc[:50]}...")
    
    # Stats
    stats = store.get_collection_stats()
    print(f"\nCollection stats: {stats}")
    
    # Cleanup
    store.delete_collection()
    print("Test collection deleted")


if __name__ == "__main__":
    test_vector_store()
