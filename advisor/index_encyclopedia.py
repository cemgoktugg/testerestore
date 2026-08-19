"""
Şerit Testere Ansiklopedisini RAG sistemine indeksle.

Bu script ansiklopediyi vektör veritabanına yükler.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def index_encyclopedia():
    """Ansiklopediyi indeksle."""
    
    # Check for OpenAI API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("⚠️  OPENAI_API_KEY bulunamadı!")
        print("    .env dosyasında OPENAI_API_KEY ayarlayın veya environment variable olarak set edin.")
        return False
    
    from llm.rag_engine import RAGEngine
    
    print("=" * 60)
    print("📚 ŞERİT TESTERE ANSİKLOPEDİSİ İNDEKSLEME")
    print("=" * 60)
    
    # Initialize RAG engine (API key from .env)
    rag = RAGEngine(
        collection_name="bandsaw_encyclopedia",
        persist_directory="./chroma_db",
        chunk_size=600,  # Daha küçük chunk'lar - daha hassas retrieval
        chunk_overlap=100
    )
    
    # Index the encyclopedia
    encyclopedia_path = Path("data/bandsaw_encyclopedia.md")
    
    if not encyclopedia_path.exists():
        print(f"❌ Ansiklopedi dosyası bulunamadı: {encyclopedia_path}")
        return False
    
    print(f"\n📄 Dosya: {encyclopedia_path}")
    print(f"📊 Boyut: {encyclopedia_path.stat().st_size / 1024:.1f} KB")
    
    try:
        num_chunks = rag.index_documents(
            source=str(encyclopedia_path),
            metadata={
                "source_type": "encyclopedia",
                "language": "tr",
                "version": "1.0"
            }
        )
        
        print(f"\n✅ İndeksleme tamamlandı!")
        print(f"   📦 {num_chunks} chunk oluşturuldu")
        print(f"   💾 Vektör DB: ./chroma_db")
        
        # Test query
        print("\n" + "=" * 60)
        print("🔍 TEST SORGUSU")
        print("=" * 60)
        
        test_query = "Bıçak alıştırma nasıl yapılır?"
        results = rag.retrieve(test_query, top_k=2)
        
        print(f"\nSorgu: '{test_query}'")
        print(f"Sonuç sayısı: {len(results)}")
        
        if results:
            for i, result in enumerate(results, 1):
                print(f"\n[{i}] Skor: {result['score']:.3f}")
                print(f"    {result['content'][:150]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = index_encyclopedia()
    sys.exit(0 if success else 1)
