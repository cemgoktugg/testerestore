"""
═══════════════════════════════════════════════════════════════════════════
📝 UNKNOWN_QUESTIONS_HANDLER.PY - BİLİNMEYEN SORU YÖNETİCİSİ
═══════════════════════════════════════════════════════════════════════════

🎯 AMAÇ:
GPT'nin cevaplayamadığı şerit testere ile ilgili soruları toplar ve:
1. JSON dosyasına kaydeder
2. İsteğe bağlı olarak e-mail bildirimi gönderir
3. Cevaplanan soruları bilgi tabanına ekler

🔄 AKIŞ:
1. GPT yanıtında "[UNKNOWN_QUESTION: ...]" etiketi aranır
2. Bulunursa soru kaydedilir
3. Admin cevapladığında bilgi tabanına eklenir
═══════════════════════════════════════════════════════════════════════════
"""

import json
import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Dosya yolları
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNKNOWN_QUESTIONS_FILE = os.path.join(BASE_DIR, "data", "unknown_questions.json")
LEARNED_KNOWLEDGE_FILE = os.path.join(BASE_DIR, "data", "learned_knowledge.json")


class UnknownQuestionsHandler:
    """
    Bilinmeyen soruları yönetir:
    - Tespit eder
    - Kaydeder
    - Bildirim gönderir
    - Cevapları öğrenir
    """
    
    def __init__(self, email_config: Optional[Dict] = None):
        """
        Args:
            email_config: E-mail ayarları (opsiyonel)
                {
                    "smtp_server": "smtp.gmail.com",
                    "smtp_port": 587,
                    "sender_email": "bot@example.com",
                    "sender_password": "app_password",
                    "recipient_email": "admin@example.com"
                }
        """
        self.email_config = email_config
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """Gerekli dosyaları oluştur."""
        os.makedirs(os.path.dirname(UNKNOWN_QUESTIONS_FILE), exist_ok=True)
        
        if not os.path.exists(UNKNOWN_QUESTIONS_FILE):
            with open(UNKNOWN_QUESTIONS_FILE, 'w', encoding='utf-8') as f:
                json.dump({"questions": []}, f, ensure_ascii=False, indent=2)
        
        if not os.path.exists(LEARNED_KNOWLEDGE_FILE):
            with open(LEARNED_KNOWLEDGE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"knowledge": []}, f, ensure_ascii=False, indent=2)
    
    def detect_unknown_question(self, ai_response: str) -> Optional[str]:
        """
        AI yanıtında bilinmeyen soru etiketi var mı kontrol et.
        
        Args:
            ai_response: AI'ın yanıtı
            
        Returns:
            Bilinmeyen soru metni veya None
        """
        # [UNKNOWN_QUESTION: ...] formatını ara
        pattern = r'\[UNKNOWN_QUESTION:\s*(.+?)\]'
        match = re.search(pattern, ai_response, re.DOTALL)
        
        if match:
            return match.group(1).strip()
        return None
    
    def save_unknown_question(
        self, 
        question: str, 
        session_id: str = None,
        context: Dict = None,
        send_email: bool = True
    ) -> Dict:
        """
        Bilinmeyen soruyu kaydet.
        
        Args:
            question: Soru metni
            session_id: Oturum ID'si
            context: Ek bağlam bilgisi
            send_email: E-mail gönderilsin mi?
            
        Returns:
            Kaydedilen soru bilgisi
        """
        # Mevcut soruları yükle
        with open(UNKNOWN_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Yeni soru oluştur
        question_entry = {
            "id": len(data["questions"]) + 1,
            "question": question,
            "session_id": session_id,
            "context": context or {},
            "created_at": datetime.now().isoformat(),
            "status": "pending",  # pending, answered, added_to_kb
            "answer": None,
            "answered_at": None
        }
        
        # Aynı soru daha önce sorulmuş mu kontrol et
        existing = next(
            (q for q in data["questions"] if q["question"].lower() == question.lower()),
            None
        )
        
        if existing:
            existing["count"] = existing.get("count", 1) + 1
            existing["last_asked"] = datetime.now().isoformat()
            logger.info(f"Mevcut soru tekrar soruldu: {question[:50]}...")
        else:
            question_entry["count"] = 1
            data["questions"].append(question_entry)
            logger.info(f"Yeni bilinmeyen soru kaydedildi: {question[:50]}...")
        
        # Kaydet
        with open(UNKNOWN_QUESTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # E-mail gönder (opsiyonel)
        if send_email and self.email_config and not existing:
            self._send_email_notification(question_entry)
        
        return question_entry
    
    def _send_email_notification(self, question_entry: Dict):
        """Yeni soru için e-mail bildirimi gönder."""
        if not self.email_config:
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_config['sender_email']
            msg['To'] = self.email_config['recipient_email']
            msg['Subject'] = f"🔔 Yeni Bilinmeyen Soru #{question_entry['id']}"
            
            body = f"""
Merhaba,

Şerit Testere AI asistanına yeni bir soru soruldu ve sistemde cevabı bulunamadı.

📝 **Soru:**
{question_entry['question']}

📅 **Tarih:** {question_entry['created_at']}
🔖 **Session:** {question_entry.get('session_id', 'N/A')}

Bu soruyu cevaplamak için admin paneline gidin veya doğrudan 
data/unknown_questions.json dosyasını düzenleyin.

---
TestereStore Asistanı
            """
            
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            with smtplib.SMTP(
                self.email_config['smtp_server'], 
                self.email_config['smtp_port']
            ) as server:
                server.starttls()
                server.login(
                    self.email_config['sender_email'],
                    self.email_config['sender_password']
                )
                server.send_message(msg)
            
            logger.info(f"E-mail bildirimi gönderildi: {question_entry['id']}")
            
        except Exception as e:
            logger.error(f"E-mail gönderilemedi: {e}")
    
    def get_pending_questions(self) -> List[Dict]:
        """Cevaplanmamış soruları getir."""
        with open(UNKNOWN_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return [q for q in data["questions"] if q["status"] == "pending"]
    
    def answer_question(self, question_id: int, answer: str, add_to_kb: bool = True) -> bool:
        """
        Soruyu cevapla ve isteğe bağlı olarak bilgi tabanına ekle.
        
        Args:
            question_id: Soru ID'si
            answer: Cevap metni
            add_to_kb: Bilgi tabanına eklensin mi?
            
        Returns:
            Başarılı mı?
        """
        # Soruları yükle
        with open(UNKNOWN_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Soruyu bul
        question = next(
            (q for q in data["questions"] if q["id"] == question_id),
            None
        )
        
        if not question:
            logger.error(f"Soru bulunamadı: {question_id}")
            return False
        
        # Cevabı kaydet
        question["answer"] = answer
        question["answered_at"] = datetime.now().isoformat()
        question["status"] = "answered"
        
        # Bilgi tabanına ekle
        if add_to_kb:
            self._add_to_knowledge_base(question["question"], answer)
            question["status"] = "added_to_kb"
        
        # Kaydet
        with open(UNKNOWN_QUESTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Soru cevaplandı: {question_id}")
        return True
    
    def _add_to_knowledge_base(self, question: str, answer: str):
        """Cevabı bilgi tabanına ekle."""
        with open(LEARNED_KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        knowledge_entry = {
            "id": len(data["knowledge"]) + 1,
            "question": question,
            "answer": answer,
            "added_at": datetime.now().isoformat(),
            "source": "user_feedback"
        }
        
        data["knowledge"].append(knowledge_entry)
        
        with open(LEARNED_KNOWLEDGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Bilgi tabanına eklendi: {question[:50]}...")
    
    def get_learned_knowledge(self) -> List[Dict]:
        """Öğrenilmiş bilgileri getir."""
        if not os.path.exists(LEARNED_KNOWLEDGE_FILE):
            return []
        
        with open(LEARNED_KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data.get("knowledge", [])
    
    def search_learned_knowledge(self, query: str) -> Optional[Dict]:
        """
        Öğrenilmiş bilgilerde ara.
        
        Args:
            query: Arama sorgusu
            
        Returns:
            Eşleşen bilgi veya None
        """
        knowledge = self.get_learned_knowledge()
        query_lower = query.lower()
        
        # Basit anahtar kelime eşleştirmesi
        for item in knowledge:
            question_words = set(item["question"].lower().split())
            query_words = set(query_lower.split())
            
            # %50'den fazla kelime eşleşirse
            common = question_words.intersection(query_words)
            if len(common) >= len(query_words) * 0.5:
                return item
        
        return None
    
    def get_statistics(self) -> Dict:
        """İstatistikleri getir."""
        with open(UNKNOWN_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
        
        knowledge = self.get_learned_knowledge()
        
        questions = questions_data.get("questions", [])
        
        return {
            "total_unknown_questions": len(questions),
            "pending_questions": len([q for q in questions if q["status"] == "pending"]),
            "answered_questions": len([q for q in questions if q["status"] in ["answered", "added_to_kb"]]),
            "added_to_kb": len([q for q in questions if q["status"] == "added_to_kb"]),
            "total_learned_knowledge": len(knowledge),
            "most_asked": sorted(
                questions, 
                key=lambda x: x.get("count", 1), 
                reverse=True
            )[:5]
        }


def process_ai_response(
    ai_response: str, 
    session_id: str = None,
    handler: UnknownQuestionsHandler = None
) -> str:
    """
    AI yanıtını işle ve bilinmeyen soruları kaydet.
    
    Args:
        ai_response: AI'ın yanıtı
        session_id: Oturum ID'si
        handler: UnknownQuestionsHandler instance
        
    Returns:
        Temizlenmiş AI yanıtı (etiketler kaldırılmış)
    """
    if handler is None:
        handler = UnknownQuestionsHandler()
    
    # Bilinmeyen soru var mı kontrol et
    unknown_question = handler.detect_unknown_question(ai_response)
    
    if unknown_question:
        # Soruyu kaydet
        handler.save_unknown_question(
            question=unknown_question,
            session_id=session_id,
            send_email=True
        )
        
        # Etiketi yanıttan kaldır
        ai_response = re.sub(
            r'\[UNKNOWN_QUESTION:\s*.+?\]', 
            '', 
            ai_response, 
            flags=re.DOTALL
        ).strip()
    
    return ai_response
