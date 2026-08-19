// API Configuration
const API_BASE_URL = 'http://localhost:5000'; // Backend API URL

// Global Variables
let chatMessages = [];
let isLoading = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    initializeEventListeners();
});

function initializeEventListeners() {
    // Machine form submission
    document.getElementById('machineForm').addEventListener('submit', handleFormSubmission);
    
    // Chat input enter key
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Show/Hide Sections
function startChat() {
    document.getElementById('chatSection').style.display = 'block';
    document.getElementById('machineFormSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('chatInput').focus();
    scrollToSection('chatSection');
}

function showMachineForm() {
    document.getElementById('machineFormSection').style.display = 'block';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    scrollToSection('machineFormSection');
}

function closeChat() {
    document.getElementById('chatSection').style.display = 'none';
}

function closeMachineForm() {
    document.getElementById('machineFormSection').style.display = 'none';
}

function closeResults() {
    document.getElementById('resultsSection').style.display = 'none';
}

function scrollToSection(sectionId) {
    setTimeout(() => {
        document.getElementById(sectionId).scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
}

// Chat Functions
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    input.value = '';
    
    // Send to AI
    sendToAI(message);
}

function addMessageToChat(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? 
        '<i data-lucide="user"></i>' : 
        '<i data-lucide="bot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    if (sender === 'bot' && message.includes('<')) {
        // Allow HTML content for bot responses
        content.innerHTML = message;
    } else {
        content.textContent = message;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesContainer.appendChild(messageDiv);
    
    // Update icons and scroll
    lucide.createIcons();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addLoadingMessage() {
    const messagesContainer = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.id = 'loadingMessage';
    
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <i data-lucide="bot"></i>
        </div>
        <div class="message-content">
            <div class="loading"></div> Düşünüyorum...
        </div>
    `;
    
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    lucide.createIcons();
}

function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

async function sendToAI(message) {
    if (isLoading) return;
    
    isLoading = true;
    addLoadingMessage();
    
    try {
        // Mock AI response for demonstration
        // In real implementation, this would call your Python backend
        const response = await simulateAIResponse(message);
        
        removeLoadingMessage();
        addMessageToChat(response, 'bot');
        
    } catch (error) {
        console.error('AI Response Error:', error);
        removeLoadingMessage();
        addMessageToChat('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 'bot');
    } finally {
        isLoading = false;
    }
}

// Simulate AI response (replace with actual API call)
async function simulateAIResponse(message) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerMessage = message.toLowerCase();
    
    // Machine detection responses
    if (lowerMessage.includes('amada') || lowerMessage.includes('h-250')) {
        return `AMADA H-250 için mükemmel bir seçim! Bu makine için önerilerim:
        
<strong>Önerilen Bıçak:</strong>
• Boyut: 3345 x 27 x 0.9 mm
• TPI: 3-4 (çelik için)
• Tip: Bimetal

<strong>Kesim Parametreleri:</strong>
• Hız: 50-80 m/dak
• Besleme: Otomatik
• Soğutma: Mutlaka kullanın

Başka hangi malzeme keseceksiniz?`;
    }
    
    if (lowerMessage.includes('çelik') || lowerMessage.includes('steel')) {
        return `Çelik kesimi için özel önerilerim:

<strong>TPI Seçimi:</strong>
• İnce çelik (0-25mm): 10-14 TPI
• Orta çelik (25-75mm): 6-10 TPI  
• Kalın çelik (75mm+): 3-6 TPI

<strong>Önemli İpuçları:</strong>
• Yavaş başlayın (run-in procedure)
• İlk 50 kesimde %50 hız kullanın
• Soğutma sıvısı mutlaka kullanın
• Çeliğin sertliği 200 HB üzerindeyse bimetal bıçak seçin

Çeliğinizin kalınlığı ve sertliği nedir?`;
    }
    
    if (lowerMessage.includes('problem') || lowerMessage.includes('sorun')) {
        return `Yaygın şerit testere problemlerini çözelim:

<strong>Bıçak Kırılması:</strong>
• Çok hızlı kesim hızı
• Yanlış TPI seçimi
• Yetersiz gerginlik

<strong>Kötü Kesim Kalitesi:</strong>
• Körelmış bıçak
• Yanlış besleme hızı
• Makine ayar problemleri

<strong>Erken Aşınma:</strong>
• Yanlış bıçak tipi
• Aşırı besleme basıncı
• Soğutma yetersizliği

Hangi problemi yaşıyorsunuz? Daha detaylı yardım edebilirim.`;
    }
    
    // Default response
    return `Anlıyorum! Size yardımcı olmak için bazı sorular:

• Hangi makine modelini kullanıyorsunuz?
• Hangi malzemeyi keseceksiniz?
• Malzeme kalınlığı nedir?
• Günlük ne kadar kesim yapıyorsunuz?

Bu bilgilerle size en uygun bıçağı önerebilirim. Ayrıca 4,500+ makine veritabanımızda makinenizi arayabiliriz.`;
}

// Form Handling
function handleFormSubmission(e) {
    e.preventDefault();
    
    const formData = {
        machineBrand: document.getElementById('machineBrand').value,
        machineModel: document.getElementById('machineModel').value,
        materialType: document.getElementById('materialType').value,
        materialThickness: document.getElementById('materialThickness').value,
        cuttingSpeed: document.getElementById('cuttingSpeed').value,
        dailyUsage: document.getElementById('dailyUsage').value
    };
    
    // Validate form
    if (!formData.machineBrand && !formData.machineModel) {
        alert('Lütfen en azından makine markası veya modelini girin.');
        return;
    }
    
    // Process form and show results
    processFormAndShowResults(formData);
}

function processFormAndShowResults(formData) {
    // Simulate processing
    const results = generateMockResults(formData);
    showResults(results);
}

function generateMockResults(formData) {
    // Generate mock results based on form data
    const brandModel = `${formData.machineBrand || 'Bilinmeyen'} ${formData.machineModel || ''}`.trim();
    
    // Mock blade recommendations based on material and thickness
    let tpi = '6-8';
    let bladeType = 'Bimetal';
    let speed = '60-80 m/dak';
    
    if (formData.materialType === 'alüminyum') {
        tpi = '8-14';
        speed = '150-300 m/dak';
        bladeType = 'Karbür Uçlu';
    } else if (formData.materialType === 'paslanmaz') {
        tpi = '4-6';
        speed = '30-50 m/dak';
        bladeType = 'Bimetal (Kobalt)';
    }
    
    const thickness = parseInt(formData.materialThickness) || 50;
    const length = 3345; // Default AMADA length
    const width = thickness < 100 ? 27 : 34;
    const thicknessValue = thickness < 50 ? 0.9 : 1.1;
    
    return {
        machine: brandModel,
        material: formData.materialType || 'Çelik',
        blade: {
            size: `${length} x ${width} x ${thicknessValue} mm`,
            tpi: tpi,
            type: bladeType,
            speed: speed
        },
        tips: [
            'İlk 50 kesimde %50 hız kullanın (run-in procedure)',
            'Soğutma sıvısı mutlaka kullanın',
            'Bıçak gerginliğini düzenli kontrol edin',
            'Kesim kalitesini düzenli inceleyin',
            formData.dailyUsage === 'yoğun' ? 'Yoğun kullanım için premium bıçak seçin' : 'Standart kullanım için uygun'
        ]
    };
}

function showResults(results) {
    const resultsContent = document.getElementById('resultsContent');
    
    resultsContent.innerHTML = `
        <div class="blade-recommendation">
            <div class="blade-specs">
                <div class="spec-item">
                    <div class="spec-label">Bıçak Boyutu</div>
                    <div class="spec-value">${results.blade.size}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">TPI (Diş/İnç)</div>
                    <div class="spec-value">${results.blade.tpi}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Bıçak Tipi</div>
                    <div class="spec-value">${results.blade.type}</div>
                </div>
                <div class="spec-item">
                    <div class="spec-label">Kesim Hızı</div>
                    <div class="spec-value">${results.blade.speed}</div>
                </div>
            </div>
            
            <div class="recommendation-details">
                <h3>Makine ve Malzeme</h3>
                <p><strong>Makine:</strong> ${results.machine}</p>
                <p><strong>Malzeme:</strong> ${results.material}</p>
            </div>
            
            <div class="recommendation-details">
                <h3>Kullanım Önerileri</h3>
                <ul class="tips-list">
                    ${results.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
            
            <div class="form-buttons" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="startNewSearch()">
                    <i data-lucide="refresh-cw"></i>
                    Yeni Arama
                </button>
                <button class="btn btn-secondary" onclick="startChat()">
                    <i data-lucide="message-circle"></i>
                    AI ile Konuş
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('machineFormSection').style.display = 'none';
    scrollToSection('resultsSection');
    lucide.createIcons();
}

function clearForm() {
    document.getElementById('machineForm').reset();
}

function startNewSearch() {
    closeResults();
    clearForm();
    showMachineForm();
}

// Handle chat key press
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// API Integration Functions (to be implemented)
async function callRulesEngine(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Rules Engine API Error:', error);
        throw error;
    }
}

async function searchMachine(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/machines/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Machine Search API Error:', error);
        throw error;
    }
}

async function chatWithAI(message, history = []) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: history
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Chat API Error:', error);
        throw error;
    }
}

// Performance Optimization
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Handle resize events
        lucide.createIcons();
    }, 250);
});

// Service Worker Registration (for offline functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
                console.log('SW registration failed: ', registrationError);
            });
    });
}