"""
LLM Integration Module for Rules Engine

This module provides natural language understanding (NLU) and conversational
interface capabilities using OpenAI's GPT models.

Components:
- openai_client: API wrapper with retry logic
- prompt_builder: System prompt generation with context injection
- message_parser: Extract structured data from user messages
- conversational_engine: Main orchestrator combining LLM + Rules Engine
- RAG components (optional, requires chromadb):
  - embeddings_client: Text to vector conversion
  - vector_store: ChromaDB wrapper
  - document_loader: PDF/TXT/MD loader
  - chunker: Text chunking
  - rag_engine: RAG orchestrator
"""

from .openai_client import OpenAIClient
from .prompt_builder import PromptBuilder
from .message_parser import MessageParser

# Import conversational_engine without RAG first
# RAG components are optional and imported only when needed
try:
    from .conversational_engine import ConversationalEngine
    _has_conversational = True
except ImportError:
    _has_conversational = False
    ConversationalEngine = None

__all__ = [
    "OpenAIClient",
    "PromptBuilder", 
    "MessageParser",
    "ConversationalEngine",
]
