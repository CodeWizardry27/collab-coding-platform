// Configuration
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? 'http://localhost:8080' : window.location.origin;
const WS_ENDPOINT = `${API_BASE}/ws`;

// Generate random UUID for this client
const clientId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

let editor;
let stompClient = null;
let currentRoom = null;
let isApplyingRemoteChange = false;

// WebRTC variables
let localStream;
let peerConnection;
let iceCandidateQueue = [];
const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

// DOM Elements
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const connStatus = document.getElementById('conn-status');
const connText = document.getElementById('conn-text');
const languageSelect = document.getElementById('language-select');
const runBtn = document.getElementById('run-btn');
const outputArea = document.getElementById('output-area');
const execStats = document.getElementById('exec-stats');
const execTime = document.getElementById('exec-time');

// Video Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('start-call-btn');
const videoPlaceholder = document.getElementById('video-placeholder');
const callControls = document.getElementById('call-controls');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleCamBtn = document.getElementById('toggle-cam-btn');

// Whiteboard Elements
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const tabCode = document.getElementById('tab-code');
const tabDraw = document.getElementById('tab-draw');
const monacoContainer = document.getElementById('monaco-container');
const codeToolbar = document.getElementById('code-toolbar');
const drawToolbar = document.getElementById('draw-toolbar');
const drawColor = document.getElementById('draw-color');
const clearBoardBtn = document.getElementById('clear-board-btn');

// Dynamic Problem State
let templates = { python: '', java: '' };

async function fetchRandomProblem() {
    try {
        const res = await fetch(`${API_BASE}/api/problems/random`);
        const problem = await res.json();
        
        document.getElementById('problem-title').textContent = problem.title;
        let desc = problem.description.replace(/\n\n/g, '<br><br>').replace(/`([^`]+)`/g, '<code>$1</code>');
        document.getElementById('problem-desc').innerHTML = desc;
        
        const diffSpan = document.getElementById('problem-diff');
        diffSpan.textContent = problem.difficulty;
        diffSpan.style.backgroundColor = problem.difficulty === 'Easy' ? 'var(--success)' : (problem.difficulty === 'Medium' ? 'var(--warning)' : 'var(--error)');
        diffSpan.style.color = '#fff';

        templates.python = problem.templatePython;
        templates.java = problem.templateJava;
        
        if (editor && !editor.getValue().trim()) {
            editor.setValue(templates[languageSelect.value]);
        }
    } catch (e) {
        console.error("Failed to fetch problem from database", e);
        document.getElementById('problem-title').textContent = "Offline Mode";
        document.getElementById('problem-desc').textContent = "Could not connect to database.";
    }
}

// ============== WHITEBOARD LOGIC ==============
let drawing = false;
let current = { x: 0, y: 0 };

function resizeCanvas() {
    if (canvas.style.display !== 'none') {
        canvas.width = canvas.parentElement.clientWidth - 20;
        canvas.height = canvas.parentElement.clientHeight - 80;
    }
}
window.addEventListener('resize', resizeCanvas);

function drawLine(x0, y0, x1, y1, color, emit) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;
    
    // Scale coordinates as percentages to sync perfectly across different screen sizes
    const w = canvas.width;
    const h = canvas.height;
    
    sendStompMessage({
        type: 'DRAW',
        rtcPayload: {
            x0: x0 / w, y0: y0 / h,
            x1: x1 / w, y1: y1 / h,
            color: color
        }
    });

    // We no longer rely on STOMP to draw our own line (we return if senderId === clientId).
    // So drawing our own line instantly here makes it ZERO latency for the drawing user.
}

function onMouseDown(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    current.x = e.clientX - rect.left;
    current.y = e.clientY - rect.top;
}

function onMouseUp(e) {
    if (!drawing) return;
    drawing = false;
    const rect = canvas.getBoundingClientRect();
    drawLine(current.x, current.y, e.clientX - rect.left, e.clientY - rect.top, drawColor.value, true);
}

function onMouseMove(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    drawLine(current.x, current.y, e.clientX - rect.left, e.clientY - rect.top, drawColor.value, true);
    current.x = e.clientX - rect.left;
    current.y = e.clientY - rect.top;
}

canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mouseout', onMouseUp, false);
canvas.addEventListener('mousemove', onMouseMove, false);

clearBoardBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sendStompMessage({ type: 'CLEAR' });
});

// Initialize Editor
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: '', // Stays empty until DB loads
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        roundedSelection: true,
        padding: { top: 16, bottom: 16 }
    });

    fetchRandomProblem();

    // Fix Cursor Misalignment
    document.fonts.ready.then(() => {
        monaco.editor.remeasureFonts();
    });

    // Handle Local Changes -> Send Code to Server
    editor.onDidChangeModelContent((event) => {
        if (!isApplyingRemoteChange && stompClient && stompClient.connected && currentRoom) {
            sendStompMessage({
                type: 'CODE',
                content: editor.getValue()
            });
        }
    });
});

// Helper to send messages over STOMP
function sendStompMessage(payloadObj) {
    if (!stompClient || !stompClient.connected || !currentRoom) return;
    payloadObj.roomId = currentRoom;
    payloadObj.senderId = clientId;
    stompClient.send(`/app/code/${currentRoom}`, {}, JSON.stringify(payloadObj));
}

// Helper to clean up WebRTC tracks and connection
function disconnectCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    localVideo.srcObject = null;
    localVideo.style.display = 'none';
    callControls.style.display = 'none';
    remoteVideo.srcObject = null;
    videoPlaceholder.style.display = 'flex';
    videoPlaceholder.querySelector('p').textContent = "Join a room to Call";
    startCallBtn.textContent = 'Start Call';
    startCallBtn.disabled = false;
}

// Real-time Collaboration (WebSocket)
function connect(roomId) {
    if (!roomId) return;
    
    if (stompClient) {
        stompClient.disconnect();
    }
    
    disconnectCall();
    
    currentRoom = roomId;
    roomInput.value = roomId;
    const socket = new SockJS(WS_ENDPOINT);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable debug logs

    connText.textContent = 'Connecting...';
    connStatus.className = 'dot';

    stompClient.connect({}, function (frame) {
        connStatus.className = 'dot connected';
        connText.textContent = `Connected (${roomId})`;
        startCallBtn.style.display = 'inline-block'; // Show Call button
        
        stompClient.subscribe(`/topic/room/${roomId}`, async function (message) {
            const payload = JSON.parse(message.body);
            
            // Ignore our own messages natively
            if (payload.senderId === clientId) return;

            if (payload.type && !payload.senderId) {
                console.warn("⚠️ Backend JVM Issue: Missing senderId.");
            }
            
            if (payload.type === 'CODE') {
                if (payload.content !== editor.getValue()) {
                    isApplyingRemoteChange = true;
                    const fullRange = editor.getModel().getFullModelRange();
                    editor.executeEdits("remote", [{
                        range: fullRange,
                        text: payload.content
                    }]);
                    isApplyingRemoteChange = false;
                }
            } else if (payload.type === 'DRAW') {
                const w = canvas.width;
                const h = canvas.height;
                drawLine(
                    payload.rtcPayload.x0 * w, 
                    payload.rtcPayload.y0 * h, 
                    payload.rtcPayload.x1 * w, 
                    payload.rtcPayload.y1 * h, 
                    payload.rtcPayload.color, 
                    false
                );
            } else if (payload.type === 'CLEAR') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else if (payload.type === 'OFFER') {
                await handleReceiveOffer(payload.rtcPayload, payload.senderId);
            } else if (payload.type === 'ANSWER') {
                await handleReceiveAnswer(payload.rtcPayload);
            } else if (payload.type === 'ICE') {
                await handleReceiveIceCandidate(payload.rtcPayload);
            }
        });
    }, function (error) {
        connStatus.className = 'dot disconnected';
        connText.textContent = 'Offline';
        startCallBtn.style.display = 'none';
        console.error('STOMP Error:', error);
    });
}

// ============== WEBRTC LOGIC ==============

async function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) sendStompMessage({ type: 'ICE', rtcPayload: event.candidate });
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
            videoPlaceholder.style.display = 'flex';
            videoPlaceholder.querySelector('p').innerHTML = "❌ <b>Connection Failed</b><br>Check firewalls/NAT limits.";
        }
    };

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            videoPlaceholder.style.display = 'none';

            // Catch strict Browser Autoplay Policies (Chrome/Mobile Safari) blocking the remote video
            setTimeout(() => {
                remoteVideo.play().catch(e => {
                    console.warn("🔐 Browser blocked background Autoplay. Waiting for user interaction.", e);
                    videoPlaceholder.style.display = 'flex';
                    videoPlaceholder.querySelector('p').innerHTML = "🔒 <b>Browser Secured</b><br>Click anywhere on the screen to view remote video!";
                    
                    const unblockPlay = () => {
                        remoteVideo.play().then(() => {
                            videoPlaceholder.style.display = 'none';
                        }).catch(err => console.log('Still blocked', err));
                    };
                    document.body.addEventListener('click', unblockPlay, { once: true });
                });
            }, 100);
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

function flushIceQueue() {
    while (iceCandidateQueue.length > 0) {
        const c = iceCandidateQueue.shift();
        peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error("ICE error", e));
    }
}

async function startVideoCall() {
    try {
        startCallBtn.disabled = true;
        startCallBtn.textContent = 'Starting...';
        
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            localVideo.style.display = 'block';
            callControls.style.display = 'flex';
        } catch (mediaErr) {
            console.warn("Could not access camera/mic (starting receive-only):", mediaErr);
        }
        
        videoPlaceholder.querySelector('p').textContent = "Waiting for peer...";

        await setupPeerConnection();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        sendStompMessage({ type: 'OFFER', rtcPayload: offer });
        
        startCallBtn.textContent = 'Call Active';
    } catch (err) {
        console.error("Error starting call:", err);
        startCallBtn.disabled = false;
        startCallBtn.textContent = 'Start Call Error';
    }
}

async function handleReceiveOffer(offer, senderId) {
    if (peerConnection) {
        if (clientId < senderId) {
            console.log("Glare: Yielding to remote offer. Recreating PC.");
            peerConnection.close();
            peerConnection = null;
            await setupPeerConnection();
        } else {
            console.warn("Glare: Ignoring remote offer, waiting for them to yield.");
            return;
        }
    }
    
    if (!peerConnection) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            localVideo.style.display = 'block';
            callControls.style.display = 'flex';
        } catch(mediaErr) {
            console.warn("No camera/mic available. Joining receive-only.");
        }
        await setupPeerConnection();
        startCallBtn.disabled = true;
        startCallBtn.textContent = 'Call Active';
    }
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    flushIceQueue();
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    sendStompMessage({ type: 'ANSWER', rtcPayload: answer });
}

async function handleReceiveAnswer(answer) {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    flushIceQueue();
}

async function handleReceiveIceCandidate(candidate) {
    if (!peerConnection || !peerConnection.remoteDescription || !peerConnection.remoteDescription.type) {
        iceCandidateQueue.push(candidate);
        return;
    }
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Error adding received ICE candidate', e);
    }
}

// ============== UI Listeners ==============

let micEnabled = true;
let camEnabled = true;

toggleMicBtn.addEventListener('click', () => {
    if (localStream && localStream.getAudioTracks().length > 0) {
        micEnabled = !micEnabled;
        localStream.getAudioTracks()[0].enabled = micEnabled;
        toggleMicBtn.style.background = micEnabled ? 'rgba(13, 17, 23, 0.8)' : 'var(--error)';
    }
});

toggleCamBtn.addEventListener('click', () => {
    if (localStream && localStream.getVideoTracks().length > 0) {
        camEnabled = !camEnabled;
        localStream.getVideoTracks()[0].enabled = camEnabled;
        toggleCamBtn.style.background = camEnabled ? 'rgba(13, 17, 23, 0.8)' : 'var(--error)';
        localVideo.style.opacity = camEnabled ? '1' : '0.2';
    }
});

tabCode.addEventListener('click', () => {
    tabCode.classList.add('active'); tabDraw.classList.remove('active');
    monacoContainer.style.display = 'block'; codeToolbar.style.display = 'flex';
    canvas.style.display = 'none'; drawToolbar.style.display = 'none';
});

tabDraw.addEventListener('click', () => {
    tabDraw.classList.add('active'); tabCode.classList.remove('active');
    monacoContainer.style.display = 'none'; codeToolbar.style.display = 'none';
    canvas.style.display = 'block'; drawToolbar.style.display = 'flex';
    resizeCanvas();
});

createRoomBtn.addEventListener('click', () => {
    const randomRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    connect(randomRoom);
});

joinBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim().toUpperCase();
    if (roomId) connect(roomId);
});

startCallBtn.addEventListener('click', startVideoCall);

languageSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    monaco.editor.setModelLanguage(editor.getModel(), lang);
    editor.setValue(templates[lang]);
});

runBtn.addEventListener('click', async () => {
    const code = editor.getValue();
    const language = languageSelect.value;
    
    runBtn.classList.add('running');
    runBtn.disabled = true;
    runBtn.innerHTML = 'Running...';
    outputArea.textContent = 'Executing natively...';
    outputArea.className = 'output-text';
    execStats.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, code })
        });
        
        const result = await response.json();
        execStats.style.display = 'block';
        execTime.textContent = result.executionTimeMs;
        
        if (result.error) {
            outputArea.textContent = result.error;
            outputArea.className = 'output-text output-error';
        } else {
            outputArea.textContent = result.output || 'Process exited with no output.';
            outputArea.className = 'output-text';
        }
    } catch (err) {
        outputArea.textContent = 'Failed to connect to execution server.';
        outputArea.className = 'output-text output-error';
    } finally {
        runBtn.classList.remove('running');
        runBtn.disabled = false;
        runBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Code';
    }
});
