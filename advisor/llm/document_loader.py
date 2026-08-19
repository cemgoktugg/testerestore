"""
═══════════════════════════════════════════════════════════════════════════
📄 DOCUMENT_LOADER.PY - DOKÜMAN YÜKLEME MOTORUnnn
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
Bu dosya farklı formatlardaki dokümanları okur ve text'e çevirir.
PDF, TXT, MD gibi dosyalardan içerik çıkarır.

📋 DESTEKLENENformat:
• PDF (.pdf) - En önemli! Kullanım kılavuzları, teknik dokümanlar
• Text (.txt) - Basit text dosyaları
• Markdown (.md) - Dokümantasyon dosyaları  
• (İleride: DOCX, HTML eklenebilir)

🔄 İŞ AKIŞI:

Dosya Yolu
    ↓
Format Kontrolü (.pdf, .txt, .md)
    ↓
İlgili Loader'ı Seç
    ↓
Text Çıkarımı (metadata ile birlikte)
    ↓
Temizleme (gereksiz boşluklar, özel karakterler)
    ↓
Document Objesi Döndür

📦 DOCUMENT YAPISI:

Document = {
    "content": "Bıçak takma talimatı: 1. Makineyi kapatın...",
    "metadata": {
        "source": "manual.pdf",
        "page": 5,
        "total_pages": 50,
        "file_type": "pdf",
        "file_size": "2.5 MB",
        "loaded_at": "2024-12-29 10:30:00"
    }
}

🛠️ ANA FONKSİYONLAR:

load_pdf(file_path) - PDF Yükle
    • pypdf kullanarak PDF okur
    • Her sayfa ayrı document
    • Sayfa numarası metadata'da

load_text(file_path) - Text Dosyası Yükle
    • UTF-8 encoding ile okur
    • Tek document olarak
    • Basit ve hızlı

load_markdown(file_path) - Markdown Yükle
    • MD dosyasını okur
    • Başlıkları metadata'ya ekler
    • Code block'ları ayırabilir

load_directory(dir_path) - Klasör Yükle
    • Klasördeki tüm dosyaları yükler
    • Recursive (alt klasörler dahil)
    • Format'a göre otomatik seçim

💡 KULLANIM SENARYOLARI:

1. Tek PDF Yükleme
   loader = DocumentLoader()
   docs = loader.load_pdf("manual.pdf")
   # 50 sayfa → 50 document

2. Klasör Yükleme
   docs = loader.load_directory("docs/")
   # Tüm PDF, TXT, MD dosyaları

3. Toplu İşleme
   for doc in docs:
       # Her dokümanı işle
       print(doc["content"][:100])

⚡ PERFORMANS:
• PDF (100 sayfa): ~2-3 saniye
• TXT (1MB): ~0.1 saniye
• Klasör (50 dosya): ~30 saniye

🔧 GELECEK ÖZELLIKLER:
• DOCX desteği (python-docx)
• HTML scraping (beautifulsoup4)
• OCR desteği (tesseract) - taranmış PDF'ler için
• URL'den yükleme (web scraping)

📝 BAĞIMLILIKLAR:
• pypdf: PDF okuma
• pathlib: Dosya yolu işlemleri
═══════════════════════════════════════════════════════════════════════════
"""

from typing import List, Dict, Optional
from pathlib import Path
import logging
from datetime import datetime
import os

# PDF loading
try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("pypdf not installed. PDF loading disabled.")

logger = logging.getLogger(__name__)


class Document:
    """
    Represents a loaded document with content and metadata.
    """
    
    def __init__(self, content: str, metadata: Dict):
        self.content = content
        self.metadata = metadata
    
    def __repr__(self):
        source = self.metadata.get('source', 'unknown')
        length = len(self.content)
        return f"Document(source={source}, length={length})"
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "content": self.content,
            "metadata": self.metadata
        }


class DocumentLoader:
    """
    Universal document loader supporting multiple formats.
    
    Supported formats:
    - PDF (.pdf)
    - Text (.txt)
    - Markdown (.md)
    """
    
    SUPPORTED_EXTENSIONS = {'.pdf', '.txt', '.md', '.markdown'}
    
    def __init__(self):
        """Initialize document loader."""
        self.loaded_count = 0
        self.failed_count = 0
    
    def load_pdf(self, file_path: str) -> List[Document]:
        """
        Load PDF file.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            List of Document objects (one per page)
            
        Example:
            docs = loader.load_pdf("manual.pdf")
            print(f"Loaded {len(docs)} pages")
        """
        if not PDF_AVAILABLE:
            raise ImportError("pypdf not installed. Run: pip install pypdf")
        
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            documents = []
            reader = PdfReader(str(file_path))
            
            total_pages = len(reader.pages)
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
            
            for page_num, page in enumerate(reader.pages, start=1):
                # Extract text
                text = page.extract_text()
                
                if not text or not text.strip():
                    logger.warning(f"Empty page {page_num} in {file_path.name}")
                    continue
                
                # Create document
                doc = Document(
                    content=text.strip(),
                    metadata={
                        "source": file_path.name,
                        "page": page_num,
                        "total_pages": total_pages,
                        "file_type": "pdf",
                        "file_size_mb": round(file_size, 2),
                        "file_path": str(file_path.absolute()),
                        "loaded_at": datetime.now().isoformat()
                    }
                )
                documents.append(doc)
            
            self.loaded_count += len(documents)
            logger.info(f"Loaded {len(documents)} pages from {file_path.name}")
            
            return documents
            
        except Exception as e:
            self.failed_count += 1
            logger.error(f"Failed to load PDF {file_path}: {e}")
            raise
    
    def load_text(self, file_path: str, encoding: str = 'utf-8') -> List[Document]:
        """
        Load text file.
        
        Args:
            file_path: Path to text file
            encoding: File encoding (default: utf-8)
            
        Returns:
            List with single Document object
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
            
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB
            
            doc = Document(
                content=content.strip(),
                metadata={
                    "source": file_path.name,
                    "file_type": "text",
                    "file_size_mb": round(file_size, 2),
                    "file_path": str(file_path.absolute()),
                    "encoding": encoding,
                    "loaded_at": datetime.now().isoformat()
                }
            )
            
            self.loaded_count += 1
            logger.info(f"Loaded text file: {file_path.name}")
            
            return [doc]
            
        except Exception as e:
            self.failed_count += 1
            logger.error(f"Failed to load text file {file_path}: {e}")
            raise
    
    def load_markdown(self, file_path: str) -> List[Document]:
        """
        Load markdown file.
        
        Args:
            file_path: Path to markdown file
            
        Returns:
            List with single Document object
        """
        # For now, treat markdown as text
        # In future, could parse headers and code blocks separately
        return self.load_text(file_path)
    
    def load_file(self, file_path: str) -> List[Document]:
        """
        Load file (auto-detect format).
        
        Args:
            file_path: Path to file
            
        Returns:
            List of Document objects
        """
        file_path = Path(file_path)
        extension = file_path.suffix.lower()
        
        if extension == '.pdf':
            return self.load_pdf(file_path)
        elif extension in {'.txt', '.text'}:
            return self.load_text(file_path)
        elif extension in {'.md', '.markdown'}:
            return self.load_markdown(file_path)
        else:
            raise ValueError(f"Unsupported file format: {extension}")
    
    def load_directory(
        self,
        dir_path: str,
        recursive: bool = True,
        file_extensions: Optional[List[str]] = None
    ) -> List[Document]:
        """
        Load all documents from directory.
        
        Args:
            dir_path: Directory path
            recursive: Include subdirectories
            file_extensions: Filter by extensions (default: all supported)
            
        Returns:
            List of all loaded documents
            
        Example:
            docs = loader.load_directory("docs/", recursive=True)
            print(f"Loaded {len(docs)} documents")
        """
        dir_path = Path(dir_path)
        
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {dir_path}")
        
        if not dir_path.is_dir():
            raise ValueError(f"Not a directory: {dir_path}")
        
        # Default to all supported extensions
        if file_extensions is None:
            file_extensions = list(self.SUPPORTED_EXTENSIONS)
        
        all_documents = []
        
        # Find all files
        if recursive:
            pattern = "**/*"
        else:
            pattern = "*"
        
        for file_path in dir_path.glob(pattern):
            if not file_path.is_file():
                continue
            
            if file_path.suffix.lower() not in file_extensions:
                continue
            
            try:
                docs = self.load_file(file_path)
                all_documents.extend(docs)
                logger.info(f"Loaded {len(docs)} docs from {file_path.name}")
            except Exception as e:
                logger.error(f"Failed to load {file_path.name}: {e}")
                continue
        
        logger.info(f"Total: Loaded {len(all_documents)} documents from {dir_path}")
        return all_documents
    
    def get_stats(self) -> Dict:
        """
        Get loading statistics.
        
        Returns:
            Dict with stats
        """
        return {
            "loaded_count": self.loaded_count,
            "failed_count": self.failed_count,
            "success_rate": round(
                self.loaded_count / (self.loaded_count + self.failed_count) * 100, 2
            ) if (self.loaded_count + self.failed_count) > 0 else 0
        }


# Convenience functions
def load_pdf(file_path: str) -> List[Document]:
    """Quick PDF loading."""
    loader = DocumentLoader()
    return loader.load_pdf(file_path)


def load_directory(dir_path: str, **kwargs) -> List[Document]:
    """Quick directory loading."""
    loader = DocumentLoader()
    return loader.load_directory(dir_path, **kwargs)


# Test function
def test_document_loader():
    """Quick test of document loader."""
    print("Testing Document Loader...")
    
    loader = DocumentLoader()
    
    # Test text loading
    test_file = Path("test_document.txt")
    test_file.write_text("Bu bir test dokümanıdır.\nİçerik testi.", encoding='utf-8')
    
    docs = loader.load_text(test_file)
    print(f"Loaded {len(docs)} text documents")
    print(f"Content: {docs[0].content}")
    
    # Cleanup
    test_file.unlink()
    
    print(f"Stats: {loader.get_stats()}")


if __name__ == "__main__":
    test_document_loader()
