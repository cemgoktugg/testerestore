# Şerit Testere AI - Web Arayüzü Kurulum

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler
```bash
pip install flask flask-cors
```

### 2. Sunucuyu Başlat
```bash
cd web
python app.py
```

### 3. Web Arayüzüne Eriş
- **Ana Sayfa:** http://localhost:5000
- **API Sağlık Kontrolü:** http://localhost:5000/api/health

## 🎨 Özellikler

### ✨ Modern Tasarım
- **Responsive:** Mobil ve masaüstü uyumlu
- **Dark/Light Theme:** Modern renk paleti
- **Animasyonlar:** Smooth geçişler ve hover efektleri
- **İkonlar:** Lucide icon kütüphanesi

### 🤖 AI Chat Arayüzü
- ChatGPT benzeri konuşma deneyimi
- Gerçek zamanlı makine tanıma
- Uzman önerileri ve troubleshooting
- Typing indicator ve loading animasyonları

### 📋 Form Tabanlı Arama
- Detaylı makine ve malzeme bilgileri
- Dropdown seçenekleri
- Anlık sonuç gösterimi
- Bıçak özellik kartları

### 📊 İstatistikler
- 4,515+ makine
- 108+ marka
- 53 uzman kuralı
- %98 doğruluk oranı

## 🛠 API Endpoints

### `/api/machines/search`
**GET** - Makine arama
```javascript
fetch('/api/machines/search?q=AMADA H-250')
```
Yanıt: `status` (`match` | `ambiguous` | `none`), `results` (adaylar, bıçak
ölçüleriyle), `match_type` (`capacity_class` = "Kesmak 250" gibi marka +
kapasite numarası; tek makine değil, adaylar sorulmalı) ve `brand_note`
(marka tahmin edildiyse, ör. "Bimak" → Beka-Mak). Marka yazımları
`data/machine_brand_aliases.json` dosyasından gelir.

### `/api/analyze`
**POST** - Bıçak analizi ve öneri
```javascript
fetch('/api/analyze', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        machineBrand: 'AMADA',
        machineModel: 'H-250',
        materialType: 'çelik',
        materialThickness: 50
    })
})
```

### `/api/chat`
**POST** - AI Chat
```javascript
fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        message: 'AMADA H-250 için hangi bıçak önerirsin?',
        history: []
    })
})
```

### `/api/health`
**GET** - Sistem durumu
```javascript
fetch('/api/health')
```

### `/api/stats`
**GET** - Sistem istatistikleri
```javascript
fetch('/api/stats')
```

## 📁 Dosya Yapısı

```
web/
├── index.html          # Ana HTML dosyası
├── styles.css          # CSS stilleri
├── script.js          # Frontend JavaScript
├── app.py             # Flask backend sunucusu
└── README.md          # Bu dosya
```

## 🔧 Özelleştirme

### Renk Paleti
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    --success-color: #10b981;
    --warning-color: #f59e0b;
}
```

### API Base URL
```javascript
// script.js dosyasında
const API_BASE_URL = 'http://localhost:5000';
```

## 🚨 Sorun Giderme

### Chat Çalışmıyor
- OpenAI API key kontrol edin (.env dosyası)
- Console'da hata mesajlarını inceleyin
- `/api/health` endpoint'ini kontrol edin

### Makine Bulunamıyor
- Veritabanı yolu kontrolü: `data/machines_database.json`
- Fuzzy matching threshold ayarı (varsayılan 0.85)

### Stil Problemleri
- Browser cache temizleme
- CSS dosya yolu kontrolü
- Font yükleme durumu

## 📱 Mobil Uyumluluk

- **Responsive Grid:** Otomatik kolon ayarlama
- **Touch Friendly:** Büyük butonlar ve input alanları
- **Mobile Navigation:** Collapsed menu
- **Optimized Performance:** Lazy loading ve compression

## ⚡ Performans

### Frontend Optimizasyonları
- CSS Grid ve Flexbox
- Icon lazy loading
- Image compression
- Minified assets

### Backend Optimizasyonları
- Flask threading
- Database caching
- API rate limiting
- Error handling

## 🔐 Güvenlik

- **CORS:** Cross-origin request protection
- **Input Validation:** Form ve API input kontrolü
- **API Key Protection:** Environment variables
- **Error Handling:** Güvenli hata mesajları

## 📈 Gelecek Özellikler

- [ ] Kullanıcı hesapları ve favoriler
- [ ] PDF rapor oluşturma
- [ ] Offline çalışma (Service Worker)
- [ ] Push notifications
- [ ] Analytics dashboard
- [ ] Multi-language support

## 🤝 Destek

Sorunlar için:
1. Console log'larını kontrol edin
2. `/api/health` endpoint'ini test edin
3. Python backend log'larını inceleyin
4. Network tab'ını kontrol edin

---

**🎯 Web arayüzü tamamen hazır!** Modern, hızlı ve kullanıcı dostu bir deneyim sunuyor.