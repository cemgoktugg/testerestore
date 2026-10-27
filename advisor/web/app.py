from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(project_root)
sys.path.insert(0, parent_dir)

# Import project modules
from rules_engine.engine import RulesEngine
from rules_engine.machine_database import MachineDatabase
from llm.conversational_engine import ConversationalEngine
from llm.telemetry import log_event, turn_event, mask_pii, session_hash
import json
import time

app = Flask(__name__, static_folder='.')
# Danışman yalnızca storefront sunucusundan (iç ağ) çağrılır; tarayıcıya açık
# değil, CORS gereksiz. Gövde sınırı: büyük gövdeler OpenAI'ye yüzlerce KB
# olarak gidip fatura şişirebiliyordu.
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
MAX_MESSAGE_CHARS = 1000


@app.before_request
def _reject_large_body():
    # Rotadaki try/except 413 hatasını 500e çevirmesin diye erken kesilir.
    if request.content_length and request.content_length > app.config['MAX_CONTENT_LENGTH']:
        return jsonify({'error': 'payload_too_large'}), 413

# Initialize components
rules_path = os.path.join(parent_dir, 'rules.json')
# machines_list.json — DÜZ format (~4.500 kayıtlık 'machines' listesi). Makine
# modülü yalnızca bu formatı okur; eski iç içe machines_database.json
# yüklendiğinde liste boş kalıyor, /api/health 0 makine gösteriyordu.
database_path = os.path.join(parent_dir, 'data', 'machines_list.json')

rules_engine = RulesEngine(rules_path)
machine_db = MachineDatabase(database_path)
try:
    chat_engine = ConversationalEngine(rules_path)
    chat_available = True
except Exception as e:
    print(f"Chat engine initialization failed: {e}")
    chat_available = False

@app.route('/')
def index():
    """Serve the simple chat interface"""
    return send_from_directory('.', 'chat.html')

@app.route('/chat')
def chat():
    """Serve the simple chat interface"""
    return send_from_directory('.', 'chat.html')

# Yalnızca geliştirme arayüzünün dosyaları — eskiden klasördeki her dosya
# (app.py kaynak kodu dahil) servis ediliyordu.
DEV_UI_FILES = {'chat.html', 'index.html', 'styles.css', 'script.js'}

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files (CSS, JS, etc.)"""
    if filename not in DEV_UI_FILES:
        return jsonify({'error': 'not_found'}), 404
    return send_from_directory('.', filename)

@app.route('/api/machines/search', methods=['GET'])
def search_machines():
    """Search for machines in the database"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter q is required'}), 400
    
    try:
        # search_detailed() tek sonuc DEGIL, durum + aday listesi doner.
        # Eski kod search_machine()'in dondurdugu TEK sozlugu liste sanip
        # results[:10] diliyordu; bu her istekte TypeError -> HTTP 500
        # uretiyordu. Belirsiz sorgularda ("kasto 460") adaylarin tamami doner.
        detail = machine_db.search_detailed(query)
        candidates = detail['candidates'] or (
            [detail['machine']] if detail['machine'] else [])

        formatted_results = [{
            'brand': machine.get('manufacturer', 'Unknown'),
            'model': machine.get('model', 'Unknown'),
            'display_name': machine.get('display_name'),
            'blade_length': machine.get('blade_length_mm'),
            'blade_width': machine.get('blade_width_mm'),
            'blade_thickness': machine.get('blade_thickness_mm'),
            'machine_class': machine.get('machine_class'),
            'match_score': machine.get('match_score', 0),
            # Kaynaktan doğrulandı mı / bilinen çelişki var mı (ek alanlar)
            'verified': bool(machine.get('verified')),
            'conflict': (machine.get('conflict') or {}).get('note'),
        } for machine in candidates[:10]]

        return jsonify({
            'results': formatted_results,
            'total': len(candidates),
            'status': detail['status'],       # match | ambiguous | none
            'manufacturer': detail['manufacturer'],
            # "capacity_class": "Kesmak 250" gibi marka + kapasite numarası
            'match_type': detail.get('match_type'),
            # Marka tahmin edildiyse ("Bimak" -> Beka-Mak) açıklama
            'brand_note': detail.get('brand_note'),
            'query': query
        })
    
    except Exception as e:
        return jsonify({'error': 'internal_error'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_request():
    """Analyze cutting requirements and recommend blade"""
    try:
        data = request.get_json()
        
        # Extract parameters
        machine_brand = data.get('machineBrand', '')
        machine_model = data.get('machineModel', '')
        material_type = data.get('materialType', 'çelik')
        material_thickness = data.get('materialThickness', 50)
        cutting_speed = data.get('cuttingSpeed', 'orta')
        daily_usage = data.get('dailyUsage', 'orta')
        
        # Search for machine
        machine_query = f"{machine_brand} {machine_model}".strip()
        machine_results = []
        if machine_query:
            machine_results = machine_db.search_machine(machine_query)
        
        # Prepare rules engine input
        rules_input = {
            'machine': {
                'brand': machine_brand,
                'model': machine_model,
                'blade_length': machine_results[0].get('blade_length') if machine_results else None,
                'blade_width': machine_results[0].get('blade_width') if machine_results else None,
                'blade_thickness': machine_results[0].get('blade_thickness') if machine_results else None
            },
            'material': {
                'type': material_type,
                'thickness': float(material_thickness) if material_thickness else 50.0,
                'hardness': 200  # Default hardness
            },
            'cutting_requirements': {
                'speed_preference': cutting_speed,
                'usage_intensity': daily_usage,
                'precision_level': 'standard'
            }
        }
        
        # Run rules engine
        result = rules_engine.analyze(rules_input)
        
        # Format response
        response = {
            'success': True,
            'machine': {
                'brand': machine_brand,
                'model': machine_model,
                'found_in_database': len(machine_results) > 0,
                'match_score': machine_results[0].get('match_score', 0) if machine_results else 0
            },
            'recommendation': {
                'blade_size': f"{result.get('blade_length', 'N/A')} x {result.get('blade_width', 'N/A')} x {result.get('blade_thickness', 'N/A')} mm",
                'tpi': result.get('tpi', 'N/A'),
                'blade_type': result.get('blade_type', 'Bimetal'),
                'cutting_speed': result.get('cutting_speed', '60-80 m/dak'),
                'feed_rate': result.get('feed_rate', 'Otomatik')
            },
            'tips': result.get('tips', [
                'İlk 50 kesimde %50 hız kullanın (run-in procedure)',
                'Soğutma sıvısı mutlaka kullanın',
                'Bıçak gerginliğini düzenli kontrol edin'
            ]),
            'warnings': result.get('warnings', []),
            'material_info': {
                'type': material_type,
                'thickness': material_thickness
            }
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'internal_error'
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Handle chat conversations with AI - maintains conversation context"""
    if not chat_available:
        return jsonify({
            'success': False,
            'error': 'Chat functionality is not available. Please check your OpenAI API key.'
        }), 503
    
    try:
        data = request.get_json(silent=True) or {}
        message = data.get('message', '')
        session_id = data.get('session_id', 'default_session')

        # Yalnızca düz metin: dizi/nesne mesaj OpenAI'ye çok parçalı içerik
        # olarak gidebiliyordu (1000 karakter sınırını aşarak).
        if not isinstance(message, str) or not message.strip():
            return jsonify({'error': 'Message is required'}), 400
        if not isinstance(session_id, str) or not (1 <= len(session_id) <= 64):
            return jsonify({'error': 'Invalid session_id'}), 400
        message = message[:MAX_MESSAGE_CHARS]
        
        # Kural motoru gudumlu diyalog: tam sonucu al (sadece metni degil)
        started = time.perf_counter()
        tokens_before = _token_counters()
        error = None
        result = None
        try:
            result = chat_engine.chat(message, session_id=session_id)
        except Exception as exc:
            error = exc
        tokens_after = _token_counters()
        log_event(turn_event(
            session_id=session_id,
            message=message,
            result=result,
            latency_ms=(time.perf_counter() - started) * 1000,
            prompt_tokens=max(0, tokens_after[0] - tokens_before[0]),
            completion_tokens=max(0, tokens_after[1] - tokens_before[1]),
            model=getattr(chat_engine, "model", None),
            error=repr(error) if error else None,
        ))
        if error:
            raise error

        return jsonify({
            'success': True,
            'response': result.get('message', ''),
            'message': message,
            'session_id': result.get('session_id', session_id),
            'state': result.get('state', {}),
            # Soru artik metin degil: id, tip ve siklariyla birlikte gonderilir
            # ki arayuz buton olarak sunabilsin.
            'next_question': result.get('next_question'),
            'recommendation': result.get('recommendation'),
            'is_complete': result.get('is_complete', False),
            'extracted_fields': result.get('extracted_fields', {}),
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'internal_error'
        }), 500

def _token_counters():
    """Model token sayaçlarının toplamı (genel istemci + cevap eşleştirici).

    Not: eşzamanlı turlarda fark yaklaşık olur (sayaçlar süreç geneli);
    düşük trafikte tur başına maliyet için yeterli.
    """
    try:
        client = getattr(chat_engine, "openai_client", None)
        mapper = getattr(getattr(chat_engine, "dialog_manager", None), "mapper", None)
        router = getattr(chat_engine, "kb_router", None)
        parts = (client, mapper, router)
        return (
            sum(int(getattr(x, "total_prompt_tokens", 0) or 0) for x in parts),
            sum(int(getattr(x, "total_completion_tokens", 0) or 0) for x in parts),
        )
    except Exception:
        return (0, 0)


@app.route('/api/chat/feedback', methods=['POST'])
def chat_feedback():
    """Cevaba 👍/👎 geri bildirimi (yalnızca kayda yazılır)."""
    data = request.get_json(silent=True) or {}
    rating = data.get('rating')
    session_id = data.get('session_id')
    if rating not in ('up', 'down') or not isinstance(session_id, str) or not (1 <= len(session_id) <= 64):
        return jsonify({'error': 'invalid_feedback'}), 400
    comment = data.get('comment') if isinstance(data.get('comment'), str) else ''
    bot_text = data.get('bot_text') if isinstance(data.get('bot_text'), str) else ''
    log_event({
        'type': 'feedback',
        'session': session_hash(session_id),
        'rating': rating,
        'bot_text': mask_pii(bot_text[:300]),
        'comment': mask_pii(comment[:500]),
    })
    return jsonify({'ok': True})


@app.route('/api/chat/reset', methods=['POST'])
def reset_chat():
    """Reset chat session"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default_session')
        
        if chat_available:
            chat_engine.reset_session(session_id)
        
        return jsonify({
            'success': True,
            'message': 'Session reset',
            'session_id': session_id
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'internal_error'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'components': {
            'rules_engine': True,
            'machine_database': True,
            'chat_engine': chat_available
        },
        'database_stats': {
            'total_machines': len(machine_db.machines) if hasattr(machine_db, 'machines') else 0,
            'total_manufacturers': len(set(m.get('manufacturer', '') for m in getattr(machine_db, 'machines', [])))
        }
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        # Load machine database stats
        machine_count = 0
        manufacturer_count = 0
        
        if hasattr(machine_db, 'machines'):
            machine_count = len(machine_db.machines)
            manufacturers = set()
            for machine in machine_db.machines:
                if machine.get('manufacturer'):
                    manufacturers.add(machine['manufacturer'])
            manufacturer_count = len(manufacturers)
        
        # Load rules count
        rules_count = len(rules_engine.rules) if hasattr(rules_engine, 'rules') else 0
        
        return jsonify({
            'machines': machine_count,
            'manufacturers': manufacturer_count,
            'rules': rules_count,
            'ai_available': chat_available
        })
    
    except Exception as e:
        return jsonify({
            'error': 'internal_error',
            'machines': 0,
            'manufacturers': 0,
            'rules': 0,
            'ai_available': False
        }), 500

# ==================== Bilinmeyen Sorular API ====================

@app.route('/api/unknown-questions', methods=['GET'])
def get_unknown_questions():
    """Cevaplanmamış soruları getir"""
    try:
        if chat_available and hasattr(chat_engine, 'unknown_handler'):
            questions = chat_engine.unknown_handler.get_pending_questions()
            stats = chat_engine.unknown_handler.get_statistics()
            return jsonify({
                'success': True,
                'questions': questions,
                'statistics': stats
            })
        return jsonify({
            'success': False,
            'error': 'Unknown questions handler not available'
        }), 503
    except Exception as e:
        return jsonify({'success': False, 'error': 'internal_error'}), 500

@app.route('/api/unknown-questions/<int:question_id>/answer', methods=['POST'])
def answer_unknown_question(question_id):
    """Bilinmeyen soruyu cevapla"""
    try:
        data = request.get_json()
        answer = data.get('answer', '')
        add_to_kb = data.get('add_to_knowledge_base', True)
        
        if not answer:
            return jsonify({'success': False, 'error': 'Answer is required'}), 400
        
        if chat_available and hasattr(chat_engine, 'unknown_handler'):
            success = chat_engine.unknown_handler.answer_question(
                question_id=question_id,
                answer=answer,
                add_to_kb=add_to_kb
            )
            return jsonify({
                'success': success,
                'message': 'Question answered successfully' if success else 'Failed to answer question'
            })
        return jsonify({
            'success': False,
            'error': 'Unknown questions handler not available'
        }), 503
    except Exception as e:
        return jsonify({'success': False, 'error': 'internal_error'}), 500

@app.route('/api/learned-knowledge', methods=['GET'])
def get_learned_knowledge():
    """Öğrenilmiş bilgileri getir"""
    try:
        if chat_available and hasattr(chat_engine, 'unknown_handler'):
            knowledge = chat_engine.unknown_handler.get_learned_knowledge()
            return jsonify({
                'success': True,
                'knowledge': knowledge,
                'total': len(knowledge)
            })
        return jsonify({
            'success': False,
            'error': 'Knowledge handler not available'
        }), 503
    except Exception as e:
        return jsonify({'success': False, 'error': 'internal_error'}), 500

if __name__ == '__main__':
    # Development server
    print("🚀 Şerit Testere AI Web Sunucusu Başlatılıyor...")
    print(f"📊 Chat Engine: {'✅ Aktif' if chat_available else '❌ Devre Dışı'}")
    print("🌐 Web Arayüzü: http://localhost:5000")
    print("📋 API Dokümantasyonu: http://localhost:5000/api/health")
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )