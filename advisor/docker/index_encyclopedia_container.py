"""
Ansiklopediyi konteyner içinde indeksler.

Neden ayrı script: kök dizindeki index_encyclopedia.py ansiklopediyi
"bandsaw_encyclopedia" koleksiyonuna yazıyor, ama ConversationalEngine
(llm/conversational_engine.py:237) "bandsaw_docs" koleksiyonundan okuyor.
Bu uyuşmazlık yüzünden indekslenen içerik sohbette hiç kullanılmıyordu.

Burada doğrudan motorun okuduğu koleksiyona yazıyoruz. Orijinal script
bilerek değiştirilmedi — yerel geliştirme akışın bozulmasın.

Idempotent: koleksiyonda zaten chunk varsa tekrar indekslemez (her
konteyner başlangıcında OpenAI embedding faturası çıkmasın diye).
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

COLLECTION = "bandsaw_docs"  # conversational_engine.py:237 ile aynı olmalı
ENCYCLOPEDIA = Path("data/bandsaw_encyclopedia.md")


def main() -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("[index] OPENAI_API_KEY yok — indeksleme atlandı.", flush=True)
        return 0

    if not ENCYCLOPEDIA.exists():
        print(f"[index] Ansiklopedi bulunamadı: {ENCYCLOPEDIA}", flush=True)
        return 0

    from llm.rag_engine import RAGEngine

    rag = RAGEngine(
        collection_name=COLLECTION,
        persist_directory="./chroma_db",
        chunk_size=600,
        chunk_overlap=100,
    )

    # Zaten doluysa tekrar embed etme (VectorStore.get_collection_stats()
    # -> {"name", "count", "persist_directory"} ya da {"error": ...}).
    stats = rag.vector_store.get_collection_stats()
    existing = int(stats.get("count", 0) or 0)

    if existing > 0:
        print(f"[index] '{COLLECTION}' zaten {existing} chunk içeriyor — atlandı.", flush=True)
        return 0

    print(f"[index] '{COLLECTION}' boş, indeksleniyor…", flush=True)
    count = rag.index_documents(
        source=str(ENCYCLOPEDIA),
        metadata={"source_type": "encyclopedia", "language": "tr", "version": "1.0"},
    )
    print(f"[index] Tamamlandı — {count} chunk.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # indeksleme hatası servisi düşürmesin
        print(f"[index] HATA (servis yine de başlayacak): {exc}", flush=True)
        sys.exit(0)
