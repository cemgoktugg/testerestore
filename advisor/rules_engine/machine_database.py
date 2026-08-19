"""
═══════════════════════════════════════════════════════════════════════════
ULTRA AKILLI MAKİNE ARAMA MOTORU
═══════════════════════════════════════════════════════════════════════════
Özellikler:
- Türkçe karakter desteği (ş→s, ı→i, ğ→g)
- Büyük/küçük harf duyarsız  
- Boşluk/tire duyarsız (LPS-T = LPS T = LPST)
- Fuzzy matching (%75 benzerlik)
- Üretici alias desteği
- Önbellek sistemi
"""
import json
import re
from typing import Optional, Dict, List
from difflib import SequenceMatcher


class AdvancedMachineDatabase:
    """ULTRA AKILLI makine arama motoru"""
    
    def __init__(self, db_path: str = "data/machines_list.json"):
        self.db_path = db_path
        self.data = self._load_database()
        self.cache = {}
        self.is_flat_format = 'machines' in self.data
        
        # Üretici alias'ları
        self.manufacturer_aliases = {
            'UZAY': 'UZAY MAKINA', 'UZAY MAK': 'UZAY MAKINA',
            'BEHRİNGER': 'BEHRINGER', 'BERINGER': 'BEHRINGER',
            'B&S': 'BERG & SCHMID', 'BS': 'BERG & SCHMID',
            'AMADDA': 'AMADA', 'DOALL': 'DoALL',
        }
        
    def _load_database(self) -> dict:
        """Database yükle"""
        with open(self.db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _normalize_text(self, text: str) -> str:
        """
        ULTRA NORMALIZASYON
        - Türkçe → İngilizce (ş→s, ı→i, ğ→g, ü→u, ö→o, ç→c)
        - Büyük harf
        - Özel karakterler → boşluk
        """
        if not text:
            return ""
        
        normalized = text.upper().strip()
        
        # Türkçe karakterler
        tr_map = {'Ş':'S', 'Ğ':'G', 'Ü':'U', 'Ö':'O', 'Ç':'C', 'İ':'I', 'I':'I'}
        for tr, en in tr_map.items():
            normalized = normalized.replace(tr, en)
        
        # Özel karakterler → boşluk
        normalized = re.sub(r'[-_\.\,\:\;\/\\\(\)\[\]]+', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized)
        
        return normalized.strip()
    
    def _aggressive_normalize(self, text: str) -> str:
        """Süper agresif - tüm boşlukları kaldır"""
        return self._normalize_text(text).replace(' ', '')
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Benzerlik hesapla (0.0 - 1.0)"""
        return SequenceMatcher(None, str1.upper(), str2.upper()).ratio()
    
    def search(self, query: str, threshold: float = 0.75) -> Optional[Dict]:
        """
        ULTRA AKILLI ARAMA
        
        Args:
            query: Sorgu (örn: "behringer lps-t", "uzay makına 320")
            threshold: Benzerlik eşiği (0.75 = %75)
            
        Returns:
            Makine bilgileri veya None
        """
        if not query or not query.strip():
            return None
        
        # Önbellek kontrolü
        cache_key = self._aggressive_normalize(query)
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Alias kontrolü
        query_upper = query.upper()
        for alias, real_name in self.manufacturer_aliases.items():
            if query_upper.startswith(alias):
                query = real_name + query[len(alias):]
                break
        
        # Arama
        if self.is_flat_format:
            result = self._search_flat(query, threshold)
            if result:
                self.cache[cache_key] = result
            return result
        
        return None
    
    def _search_flat(self, query: str, threshold: float) -> Optional[Dict]:
        """Düz format arama - çok katmanlı"""
        query_norm = self._normalize_text(query)
        query_agg = self._aggressive_normalize(query)
        machines = self.data.get('machines', [])
        
        best_match = None
        best_score = 0.0
        
        for machine in machines:
            # Tam adlar
            full = f"{machine.get('manufacturer', '')} {machine.get('model', '')}".strip()
            full_norm = self._normalize_text(full)
            full_agg = self._aggressive_normalize(full)
            
            # 1. TAM EŞLEŞME (normalize)
            if query_norm == full_norm:
                return self._format_result(machine, 1.0)
            
            # 2. AGRESIF EŞLEŞME (boşluksuz)
            if query_agg == full_agg:
                return self._format_result(machine, 0.99)
            
            # 3. Model-only eşleşme
            model_norm = self._normalize_text(machine.get('model', ''))
            model_agg = self._aggressive_normalize(machine.get('model', ''))
            
            if query_norm == model_norm or query_agg == model_agg:
                score = 0.95
                if score > best_score:
                    best_score = score
                    best_match = machine
            
            # 4. KISMI EŞLEŞME
            if query_norm in full_norm or full_norm in query_norm:
                score = self._calculate_similarity(query_norm, full_norm)
                if score > best_score:
                    best_score = score
                    best_match = machine
                    if score >= 0.95:
                        return self._format_result(machine, score)
            
            # 5. FUZZY MATCHING
            score = self._calculate_similarity(query_norm, full_norm)
            if score >= threshold and score > best_score:
                best_score = score
                best_match = machine
            
            # 6. AGRESIF FUZZY
            score_agg = self._calculate_similarity(query_agg, full_agg)
            if score_agg >= threshold and score_agg > best_score:
                best_score = score_agg
                best_match = machine
        
        if best_match and best_score >= threshold:
            return self._format_result(best_match, best_score)
        
        return None
    
    def _format_result(self, machine: Dict, score: float = 1.0) -> Dict:
        """Sonucu formatla"""
        return {
            'manufacturer': machine.get('manufacturer', 'UNKNOWN'),
            'model': machine.get('model', 'UNKNOWN'),
            'blade_length_mm': machine.get('blade_length_mm'),
            'blade_width_mm': machine.get('blade_width_mm'),
            'blade_thickness_mm': machine.get('blade_thickness_mm'),
            'machine_class': machine.get('machine_class', 'M2'),
            'match_score': round(score, 3)
        }
    
    def get_stats(self) -> Dict:
        """İstatistikler"""
        return {
            'total_machines': self.data.get('total_machines', 0),
            'cache_size': len(self.cache)
        }
    
    def clear_cache(self):
        """Önbelleği temizle"""
        self.cache.clear()


# Backward compatibility
class MachineDatabase(AdvancedMachineDatabase):
    """Eski API uyumluluğu için"""
    
    def search_machine_auto(self, machine_input: str) -> Optional[Dict]:
        """Eski API"""
        return self.search(machine_input)
    
    def search_machine(self, manufacturer: str, model: str) -> Optional[Dict]:
        """Eski API"""
        return self.search(f"{manufacturer} {model}")
